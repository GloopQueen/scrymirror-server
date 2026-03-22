const express = require("express");
const router = express.Router();

//This route is for supplying basic game data to players
/*r */
router.get("/", (req, res) => {
    //TODO: Make this only hit the database For Real if some time has passed, so we don't spam it.
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
            answer = result.docs[0];
            response.eventNum = answer.eventNum;
            response.scoreVars = answer.scoreVars;
            response.isActive = answer.isActive;
            response.gameOwnerName = answer._id;
            res.send(response);
        })
        .catch((err) => {
            console.log(err);
            response.error = true;
            response.msg =
                "There was an error retrieving info for that join code.";
            res.send(response);
        });
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
