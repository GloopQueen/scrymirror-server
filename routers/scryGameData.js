const express = require("express");
const router = express.Router();

//This route is for supplying basic game data to players

router.post("/", (req, res) => {
    //TODO: Make this only hit the database For Real if some time has passed, so we don't spam it.
    gameInfo = {};
    response = {
        error: false,
        msg: "",
    };

    req.app.locals.scryActiveGameDB
        .find({
            selector: {
                joinCode: req.body.joinCode,
            },
        })
        .then((result) => {
            gameInfo = result.docs[0];
            response.eventNum = gameInfo.eventNum;
            response.scoreVars = gameInfo.scoreVars;
            response.isActive = gameInfo.isActive;
            response.gameOwnerName = gameInfo._id;
            if (req.body.fullUpdate == true) {
                response.currentEvent = gameInfo.currentEvent;
            }

            sendResponse();
        })
        .catch((err) => {
            console.log(err);
            response.error = true;
            response.msg =
                "There was an error retrieving info for that join code.";
            sendResponse();
        });

    function sendResponse() {
        res.send(response);
    }
});

router.put("/", (req, res) => {
    gameInfo = {};
    response = {
        error: false,
        msg: "",
    };

    req.app.locals.scryActiveGameDB
        .find({
            selector: {
                joinCode: req.body.joinCode,
            },
        })
        .then((result) => {
            gameInfo = result.docs[0];
            newAnswer = req.body;
            //this should probably get culled on the client instead but ehhhhhh. eh
            if (Object.hasOwn(newAnswer, "sentStatus")) {
                delete newAnswer.sentStatus;
            }
            gameInfo.currentAnswersMap.push(newAnswer);

            //TODO: hey this might throw an error!
            req.app.locals.scryActiveGameDB.put(gameInfo).then((result) => {
                console.log(
                    `New Answer on ${gameInfo._id}'s Game, Event #${gameInfo.eventNum}. ${gameInfo.currentAnswersMap.length} Answers total.`,
                );
                sendResponse(); //answer finally
            });
        })
        .catch((err) => {
            console.log(err);
            response.error = true;
            response.msg =
                "There was an error retrieving info for that join code.";
            sendResponse();
        });

    function sendResponse() {
        res.send(response);
    }
});

module.exports = router;

//GRAVEYARD
/*
gameID = req.body.gameID;

if (!Object.hasOwn(req.app.locals.gamesDB, gameID)) {
    response.error = true;
    response.msg = "that game ID doesn't exist.";
}

//check that the gameID actually exists
//check that the eventNum > 0.

if (response.error == false) {
    response.eventNum =
        req.app.locals.gamesDB[gameID].scryCurrentEvent.eventNum;
    if (response.eventNum > 0) {
        response = {
            ...response,
            eventNum:
                req.app.locals.gamesDB[gameID].scryCurrentEvent.eventNum,
            isActive: req.app.locals.debug.scryCurrentEvent.isActive,
            gameVars: req.app.locals.debug.scryGameVars,
        };
    }
}

*/
