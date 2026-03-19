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

//Create a new Game
router.post("/newGame", (req, res) => {
    //TODO: this absolutely needs some data validation
    const response = {
        msg: "",
        error: false,
    };

    //Check for the admin key. Turn this into a function you're gonna do it a bunch.
    creatorName = req.body.creatorName;
    if (req.body.key != req.app.locals.keyDB[creatorName].key) {
        response.error = true;
        response.msg = "Incorrect Game Controller Name or key.";
    }

    //Check if there's already a game running
    if (req.app.locals.keyDB[creatorName].isActive == true) {
        response.error = true;
        response.msg = "A game is already running for this username.";
    }

    //finish the party
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
    res.send(response);
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
