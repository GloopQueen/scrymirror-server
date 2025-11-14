const express = require("express");
const router = express.Router();

//Start a new Event based on the Game Controller's data
router.post("/newEvent", (req, res) => {
    //TODO: this absolutely needs some data validation
    const response = {
        msg: req.body,
        error: false,
        tellUser: false, //Turn on to show error text to player
    };

    //Check for the admin key.
    if (req.body.gameControllerKey != req.app.locals.gameControllerKey) {
        response.error = true;
        response.msg = "Incorrect Game Controller key.";
        res.status(400);
        // If all checks have cleared, Set their data as the event data and advance the event ID.
    } else {
        //Archive current event's data and player responses, then clear player responses.
        //Skip if old event was 0 (Assuming that's the "boot" number.
        let oldEventNum = req.app.locals.scryCurrentEvent.eventNum;
        if (oldEventNum != 0) {
            req.app.locals.scryEventArchive[oldEventNum] = {};
            req.app.locals.scryEventArchive[oldEventNum].eventData =
                req.app.locals.scryCurrentEvent;
            req.app.locals.scryEventArchive[oldEventNum].answersMap =
                req.app.locals.scryCurrentAnswersMap;
            req.app.locals.scryCurrentAnswersMap = {};
        }

        //set current Event data to be incoming Event
        req.app.locals.scryCurrentEvent.type = req.body.scryNewEvent.type;
        req.app.locals.scryCurrentEvent.verb = req.body.scryNewEvent.verb;
        req.app.locals.scryCurrentEvent.questionText =
            req.body.scryNewEvent.questionText;
        req.app.locals.scryCurrentEvent.options = req.body.scryNewEvent.options;
        req.app.locals.scryCurrentEvent.eventNum =
            req.app.locals.scryCurrentEvent.eventNum + 1;
        req.app.locals.scryCurrentEvent.isActive = true;
        console.log(
            `Starting Event number ${req.app.locals.scryCurrentEvent.eventNum}.`,
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

module.exports = router;
