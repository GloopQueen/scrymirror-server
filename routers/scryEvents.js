const express = require("express");
const router = express.Router();

//Handles all Events on the player end, including sending them the Event data and collecting their responses.
router.get("/currentEvent/", (req, res) => {
    res.send(req.app.locals.scryCurrentEvent);
});

//Players post their answers here
//TODO: HEY NOTE TO ME YOU DID "/CURRENTEVENT/" VS "/CURRENTEVENT" check that didnt screw something up
router.post("/currentEvent", (req, res) => {
    //TODO: Validation code in general
    //TODO: Reject on Event number mismatch.

    const response = {
        msg: req.body,
        error: false,
        tellUser: false, //Turn on to show error text to player
    };

    //Check if a player managed to double-submit.
    if (req.app.locals.scryCurrentAnswersMap[req.body.playerID]) {
        response.error = true;
        response.msg = "Double answer";
        res.status(400);
        // If all checks have cleared, add their data to the answers list.
    } else {
        req.app.locals.scryCurrentAnswersMap[req.body.playerID] = req.body;
        console.log(req.app.locals.scryCurrentAnswersMap);
        res.status(200);
    }

    res.send(response);
    if (response.error == true) {
        console.log(
            `Err: Player ${req.body.playerID} on Event ${req.app.locals.scryCurrentEvent.eventNum}: ${response.msg}.`,
        );
    }
});

//old code city this is gonna make it Mad
router.get("/", (req, res) => {
    const scryGameDataResponse = {
        eventNum: req.app.locals.scryCurrentEvent.eventNum,
        isActive: req.app.locals.scryCurrentEvent.isActive,
        gameVars: req.app.locals.scryGameVars,
    };

    res.send(scryGameDataResponse);
});

module.exports = router;
