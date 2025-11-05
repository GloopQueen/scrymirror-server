const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
    const scryGameDataResponse = {
        eventNum: req.app.locals.scryCurrentEvent.eventNum,
        isActive: req.app.locals.scryCurrentEvent.isActive,
        gameVars: req.app.locals.scryGameVars,
    };

    res.send(scryGameDataResponse);
});

module.exports = router;
