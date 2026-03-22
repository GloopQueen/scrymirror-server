const express = require("express");
const router = express.Router();

//Supply the current Answers Map
//TODO: this whole damn thing needs data validatino everywhere or it's gonna keep exploding
router.get("/currentAnswersMap", (req, res) => {
    if (req.body.gameControllerKey != req.app.locals.debug.gameControllerKey) {
        res.status(400);
        res.send("Invalid Game Controller Key.");
    } else {
        res.status(200);
        res.send(req.app.locals.debug.scryCurrentAnswersMap);
    }
});

//Start a new Event based on the Game Controller's data
router.post("/newEvent", (req, res) => {
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
});

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

            const newObj = {};
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
            console.log("startgame!");
        }
        if (command == "stopGame") {
            stopGame();
            console.log("stopgame!");
        }

        //btw when you inevitably need it here's how to un-epoch that epoch
        // const date = new Date(d);
        //console.log(date.toLocaleString());

        //finish the party
        /* OLD PLEASE REMOVE
        if (response.error == false) {
            //Create the game!

            //Flag that there's a game in use for this key.
            req.app.locals.keyDB[creatorName].isActive = true;

            // Generate a game ID and a join code.
            // TODO make sure these don't double dip.
            newGameID = generateHex(12);
            req.app.locals.gamesDB[newGameID] = {};
            req.app.locals.gamesDB[newGameID].joinCode = generateCode(6);
            req.app.locals.gamesDB[newGameID].scryCurrentEvent = {}; //Establish the thing
            req.app.locals.gamesDB[newGameID].scryCurrentEvent.eventNum = 0; //zero event number means we're not fully started.

            response.gameID = newGameID;
            response.joinCode = req.app.locals.gamesDB[newGameID].joinCode;

            //setup a good response
            console.log(
                `Game Created by ${creatorName}: Number ${response.gameID} Join Code ${response.joinCode}`,
            );
            res.status(200);
        } else {
            //setup a bad response
            res.status(400);
            console.log(
                `Err on Game Controller creating new Game: ${response.msg}`,
            );
        }
        */
        //res.send(response);
    }

    function sendResponse() {
        console.log("Sending Response.");
        res.send(response);
    }

    //Function to start a Game
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
});

function generateHex(length) {
    let letters = "0123456789ABCDEF";
    let hexResponse = "";

    for (let i = 0; i < length; i++) {
        hexResponse += letters[Math.floor(Math.random() * 16)];
    }
    return hexResponse;
}

function generateCode(length) {
    let letters = "FHLQRSWXY2456789"; //Dude I am trying so hard to make it never spell a potty word
    let codeResponse = "";

    for (let i = 0; i < length; i++) {
        codeResponse += letters[Math.floor(Math.random() * 16)];
    }
    return codeResponse;
}

module.exports = router;
