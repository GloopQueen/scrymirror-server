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

    // NEW KEYDB CHECK Code
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
        console.log("I'm after the promise");

        if (command == "startGame") {
            startGame();
            //console.log("startgame!");
        }
        if (command == "stopGame") {
            stopGame();
            //console.log("stopgame!");
        }
        if (command == "newEvent") {
            newEvent(incomingObject);
        }
        if (command == "startEvent") {
            startStopEvent(true);
        }
        if (command == "stopEvent") {
            startStopEvent(false);
        }
        if (command == "getAnswers") {
            getAnswers();
        }
    }

    function sendResponse() {
        //console.log("Sending Response.");
        res.send(response);
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
            };
            response.joinCode = newCode;
            //TODO: hey this might throw an error!
            req.app.locals.scryActiveGameDB.put(newGameInfo).then((result) => {
                console.log(`Game Created:${result}`);
                sendResponse(); //answer finally
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
            console.log("this ran!");
            req.app.locals.scryKeyDB.put(userDeets);
            //Delete the game.
            // TODO: hey this doesn't handle errors girlypop
            req.app.locals.scryActiveGameDB
                .get(req.body.creatorName)
                .then((result) => {
                    req.app.locals.scryActiveGameDB.remove(result);
                    console.log(`Game To Remove:${result._id}`);
                    sendResponse(); //answer finally
                });
        } else {
            response.error = true;
            response.msg = "There's no game active for this key owner.";
            sendResponse();
        }
    }

    function newEvent(object) {
        req.app.locals.scryActiveGameDB
            .get(req.body.creatorName)
            .then((gameInfo) => {
                // TODO: Archive old event!
                // Iterate the event number, attach the new specific data, save, and send the answer.
                gameInfo.eventNum = gameInfo.eventNum + 1;
                gameInfo.currentEvent = object;
                req.app.locals.scryActiveGameDB.put(gameInfo).then((result) => {
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
                // TODO: Archive old event!
                // Iterate the event number, attach the new specific data, save, and send the answer.
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

// ==== GRAVE YARD ===
//OLD REMOVE ME IT'S IN THE CONTROL ROUTER. -- Start a new Event based on the Game Controller's data
/* router.post("/newEvent", (req, res) => {
    //TODO: this absolutely needs some data validation
    const response = {
        msg: "",
        error: false,
    };

    //Check for the admin key.
    if (
        req.body.gameControllerKey !=
        req.app.locals.debug.debug.gameControllerKey
    ) {
        response.error = true;
        response.msg = "Incorrect Game Controller key.";
        res.status(400);
        // If all checks have cleared, Set their data as the event data and advance the event ID.
    } else {
        //Archive current event's data and player responses, then clear player responses.
        //Skip if old event was 0 (Assuming that's the "boot" number.
        let oldEventNum = req.app.locals.debug.debug.scryCurrentEvent.eventNum;
        if (oldEventNum != 0) {
            req.app.locals.debug.scryEventArchive[oldEventNum] = {};
            req.app.locals.debug.scryEventArchive[oldEventNum].eventData =
                req.app.locals.debug.scryCurrentEvent;
            req.app.locals.debug.scryEventArchive[oldEventNum].answersMap =
                req.app.locals.debug.scryCurrentAnswersMap;
            req.app.locals.debug.scryCurrentAnswersMap = {};
        }

        //set current Event data to be incoming Event
        req.app.locals.debug.scryCurrentEvent.type = req.body.scryNewEvent.type;
        req.app.locals.debug.scryCurrentEvent.verb = req.body.scryNewEvent.verb;
        req.app.locals.debug.scryCurrentEvent.questionText =
            req.body.scryNewEvent.questionText;
        req.app.locals.debug.scryCurrentEvent.options =
            req.body.scryNewEvent.options;
        req.app.locals.debug.scryCurrentEvent.eventNum =
            req.app.locals.debug.scryCurrentEvent.eventNum + 1;
        req.app.locals.debug.scryCurrentEvent.isActive = true;
        res.msg = req.app.locals.debug.scryCurrentEvent;
        console.log(
            `Starting Event number ${req.app.locals.debug.scryCurrentEvent.eventNum}.`,
        );
        res.status(200);
    }

    res.send(response);
    if (response.error == true) {
        console.log(
            `Err on Game Controller creating new Event: ${response.msg}.`,
        );
    }
    }); */

//Supply the current Answers Map
//TODO: this whole damn thing needs data validatino everywhere or it's gonna keep exploding
/* router.get("/currentAnswersMap", (req, res) => {
        if (req.body.gameControllerKey != req.app.locals.debug.gameControllerKey) {
            res.status(400);
            res.send("Invalid Game Controller Key.");
        } else {
            res.status(200);
            res.send(req.app.locals.debug.scryCurrentAnswersMap);
        }
    }); */

/*
    function generateHex(length) {
        let letters = "0123456789ABCDEF";
        let hexResponse = "";

        for (let i = 0; i < length; i++) {
            hexResponse += letters[Math.floor(Math.random() * 16)];
        }
        return hexResponse;
        }*/
