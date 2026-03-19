const express = require("express");
const router = express.Router();

//This route is for supplying basic game data to players

router.get("/", (req, res) => {
    response = {
        error: false,
        msg: "",
    };
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

    res.send(response);
});

module.exports = router;
