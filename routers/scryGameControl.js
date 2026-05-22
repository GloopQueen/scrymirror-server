const express = require("express");
const router = express.Router();

//Putting all my admin command eggs in the one bucket
router.post("/gameControllerCommand", (req, res) => {
    //TODO: this absolutely needs some data validation
    const response = {
        msg: "",
        error: false,
    };

    //user data we pull from the database will be stored here and used across a few functions
    userDeets = {};

    //KEYDB CHECK Code
    //Search the keyDB for the name
    req.app.locals.scryKeyDB
        .find({
            selector: {
                name: req.body.creatorName,
            },
        })
        .then((result) => {
            //check for only one valid answer
            if (Object.hasOwn(result, "docs") && result.docs.length == 1) {
                //Yep, only one name
                //check if key matches
                userDeets = result.docs[0];
                if (userDeets.scryKey == req.body.key) {
                    //check if there's a command
                } else {
                    response.error = true;
                    response.msg = "Key doesn't match.";
                }
            } else {
                //Nope, username didn't match.
                response.error = true;
                response.msg = "Incorrect Game Controller Name.";
            }

            newObj = {};
            if (Object.hasOwn(req.body, "object")) {
                newObj = req.body.object;
            }

            //Now that key validation has finished, kickoff next setup based on results.
            if (response.error == true) {
                sendResponse();
            } else {
                processRequest(req.body.command, newObj);
            }
        });

    //Setting up the game/responding to the req are in separate functions for async promise reasons.
    function processRequest(command, incomingObject) {
        if (command == "startGame") {
            startGame();
            //console.log("startgame!");
        } else if (command == "stopGame") {
            stopGame();
            //console.log("stopgame!");
        } else if (command == "newEvent") {
            newEvent(incomingObject);
        } else if (command == "startEvent") {
            startStopEvent(true);
        } else if (command == "stopEvent") {
            startStopEvent(false);
        } else if (command == "getAnswers") {
            getAnswers();
        } else if (command == "clearAnswers") {
            clearAnswers();
        } else if (command == "setScores") {
            setScores(incomingObject);
        } else if (command == "clearScores") {
            setScores({});
        } else {
            response.error = true;
            response.msg =
                "No valid command recieved or improper request format.";
            sendResponse();
        }
    }

    function sendResponse() {
        //console.log("Sending Response.");
        res.send(response);
    }

    //Clears the RAM cache. Called when the Game Runner updates something
    //Intended to prevent desync issues: Next player to check in MUST hit the database
    //And if the Gamne Runner update is still happening, they'll just "wait in line" instead.
    function clearCache(joinCode) {
        delete req.app.locals.scryActiveGameCache[joinCode];
    }

    //Functions to start and stop a Game
    //TODO: Start and stop currently play dangerous with assuming ActiveGamesDB matches isRunning on the KeyDB.
    function startGame() {
        if (userDeets.isRunning == false) {
            //SET ISRUNNING TO TRUE and put it on the server
            userDeets.isRunning = true;
            req.app.locals.scryKeyDB.put(userDeets);
            //Get a game running
            //Make a new active game DB entry with a date.
            const d = Date.now();
            const newCode = generateCode(6);
            newGameInfo = {
                _id: req.body.creatorName,
                creationTime: d,
                joinCode: newCode,
                currentEvent: {},
                eventNum: 0,
                isActive: false,
                currentAnswersMap: [],
                scoreVars: {},
                eventArchive: {},
            };
            response.joinCode = newCode;
            //TODO: hey this might throw an error!
            //TODO: have it query the database first for a join code of that name.
            //Verify code doesn't already exist.
            //It's a one in six thousand chance which is actually higher than I thought??? wow
            req.app.locals.scryActiveGameDB
                .find({
                    selector: {
                        joinCode: response.joinCode,
                    },
                })
                .then((result) => {
                    //If game exists, respond with that and bail
                    if (result.docs.length > 0) {
                        console.log(
                            "Error creating game: Join Code already exists",
                        );
                        response.error = true;
                        response.msg =
                            "Duplicate Join Code! Please retry. Also buy a lottery ticket.";
                        //Setup Game.
                    } else {
                        req.app.locals.scryActiveGameDB
                            .put(newGameInfo)
                            .then((result) => {
                                console.log(`Game Created:${result}`);
                                sendResponse(); //answer finally
                            });
                    }
                });
        } else {
            response.error = true;
            response.msg = "A game is already running for this name.";
            sendResponse();
        }
    }

    function stopGame() {
        if (userDeets.isRunning == true) {
            // set isRunning to false and put it on the server
            userDeets.isRunning = false;
            //console.log("this ran!");
            req.app.locals.scryKeyDB.put(userDeets);
            //Delete the game.
            // TODO: hey this doesn't handle errors girlypop
            let gameToDelete = {};
            req.app.locals.scryActiveGameDB
                .get(req.body.creatorName)
                .then((result) => {
                    //check we pulled the right person
                    if (result._id == req.body.creatorName) {
                        gameToDelete = result;
                        //Adjust the name to include deletion date, remove revision tracking (db doesn't want revs on new files)
                        const d = Date.now();
                        gameToDelete._id = gameToDelete._id + "|" + d;
                        delete gameToDelete._rev;
                        //Copy over to the old game db and verify it worked
                        req.app.locals.scryFinishedGameDB
                            .put(gameToDelete)
                            .then((result) => {
                                if (Object.hasOwn(result, "ok")) {
                                    //do the delete
                                    req.app.locals.scryActiveGameDB
                                        .get(req.body.creatorName)
                                        .then((result) => {
                                            clearCache(result.joinCode);
                                            req.app.locals.scryActiveGameDB.remove(
                                                result,
                                            );
                                            console.log(
                                                `Game To Remove:${result._id}`,
                                            );
                                            sendResponse(); //answer finally
                                        })
                                        .catch((err) => {
                                            cosole.log(err);
                                        });
                                } else {
                                    console.log(result);
                                    response.msg =
                                        "There was an error archiving the game.";
                                    response.error = true;
                                    sendResponse();
                                }
                            })
                            .catch((err) => {
                                console.log(err);
                            });
                    } else {
                        console.log(result);
                        response.msg =
                            "There was an error finding the game to archive.";
                        response.error = true;
                        sendResponse();
                        // TODO: retrying would be better but for now ending games is not a common event
                    }
                })
                .catch((err) => {
                    console.log(err);
                });
        } else {
            response.error = true;
            response.msg = "There's no game active for this key owner.";
            sendResponse();
        }
    }

    //set Scores
    function setScores(object) {
        req.app.locals.scryActiveGameDB
            .get(req.body.creatorName)
            .then((gameInfo) => {
                gameInfo.scoreVars = object;
                req.app.locals.scryActiveGameDB.put(gameInfo).then((result) => {
                    clearCache(result.joinCode);
                    response.scoreVars = gameInfo.scoreVars;
                    sendResponse();
                });
            });
    }

    //Create a new event
    function newEvent(object) {
        req.app.locals.scryActiveGameDB
            .get(req.body.creatorName)
            .then((gameInfo) => {
                // Archive old event
                if (gameInfo.eventNum > 0) {
                    gameInfo.eventArchive[gameInfo.eventNum] = {};
                    gameInfo.eventArchive[gameInfo.eventNum].event =
                        gameInfo.currentEvent;
                    gameInfo.eventArchive[gameInfo.eventNum].currentAnswersMap =
                        gameInfo.currentAnswersMap;
                }
                // Iterate the event number, deactivate the event, attach the new specific data, save, and send the answer.
                gameInfo.currentAnswersMap = [];
                gameInfo.isActive = false;
                gameInfo.eventNum = gameInfo.eventNum + 1;
                gameInfo.currentEvent = object;
                req.app.locals.scryActiveGameDB.put(gameInfo).then((result) => {
                    clearCache(gameInfo.joinCode);
                    console.log(
                        `Event Update: ${gameInfo._id}'s game setting up Event ${gameInfo.eventNum}.`,
                    );
                    response.eventNum = gameInfo.eventNum;
                    sendResponse(); //answer finally
                });
            })
            .catch((err) => {
                response.error = true;
                response.msg = "There was an error updating the Event.";
                console.log(err);
                sendResponse();
            });
    }

    function getAnswers() {
        req.app.locals.scryActiveGameDB
            .get(req.body.creatorName)
            .then((gameInfo) => {
                response.currentAnswersMap = gameInfo.currentAnswersMap;
                sendResponse();
            })
            .catch((err) => {
                response.error = true;
                response.msg = "There was an error retrieving the answers.";
                console.log(err);
                sendResponse();
            });
    }

    function clearAnswers() {
        req.app.locals.scryActiveGameDB
            .get(req.body.creatorName)
            .then((gameInfo) => {
                gameInfo.currentAnswersMap = [];
                req.app.locals.scryActiveGameDB.put(gameInfo).then((result) => {
                    clearCache(gameInfo.joinCode);
                    console.log(`Cleared Answers in ${gameInfo._id}'s Game.`);
                    response.isActive = gameInfo.isActive;
                    sendResponse(); //answer finally
                });
            })
            .catch((err) => {
                response.error = true;
                response.msg = "There was an error clearing the answers.";
                console.log(err);
                sendResponse();
            });
    }

    function startStopEvent(isRunningChange) {
        req.app.locals.scryActiveGameDB
            .get(req.body.creatorName)
            .then((gameInfo) => {
                if (gameInfo.isActive == isRunningChange) {
                    response.error = true;
                    response.msg = `The event is already ${isRunningChange ? "Started" : "Stopped"}.`;
                    sendResponse();
                } else {
                    gameInfo.isActive = isRunningChange;
                    req.app.locals.scryActiveGameDB
                        .put(gameInfo)
                        .then((result) => {
                            clearCache(gameInfo.joinCode);
                            console.log(
                                `Event ${gameInfo.eventNum} is ${isRunningChange ? "Starting" : "Stopping"} in ${gameInfo._id}'s game.`,
                            );
                            response.isActive = gameInfo.isActive;
                            sendResponse(); //answer finally
                        });
                }
            })
            .catch((err) => {
                response.error = true;
                response.msg =
                    "There was an error starting/stopping the event.";
                console.log(err);
                sendResponse();
            });
    }
});

//Bad ask example. Leaving this code here as reference.
router.post("/badActiveGame", (req, res) => {
    req.app.locals.scryActiveGameDB
        .get("bungulus")
        .then((result) => {
            console.log(result);
            res.send(result);
        })
        .catch((err) => {
            console.log(err);
            res.send(err);
        });
});

module.exports = router;

function generateCode(length) {
    let letters = "FHLQRSWXY2456789"; //Dude I am trying so hard to make it never spell a potty word
    let codeResponse = "";

    for (let i = 0; i < length; i++) {
        codeResponse += letters[Math.floor(Math.random() * 16)];
    }
    return codeResponse;
}
