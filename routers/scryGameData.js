const express = require("express");
const router = express.Router();

//This Post route is for supplying basic game data to players.
router.post("/", (req, res) => {
    //TODO: Make this only hit the database For Real if some time has passed, so we don't spam it.

    //Sets up some variables. gameInfo will be what it gets from server/cache about the requested game's state.
    //Response is what's ultimately sent to the client.
    let gameInfo = {};
    let response = {
        error: false,
        msg: "",
    };

    // Check that there even is a join code
    if (!Object.hasOwn(req.body, "joinCode")) {
        response.error = true;
        response.msg = "I didn't see a Join Code in that submission.";
        sendResponse();
        return;
    }

    // Yank any whoopsie spaces
    // TODO: Sure could use some more filtering here girlypop
    let joinCode = req.body.joinCode.replace(" ", "");

    //Check if we already have this game's state cached, and if so, return it
    if (Object.hasOwn(req.app.locals.scryActiveGameCache, joinCode)) {
        //console.log("Replying from cache.");
        gameInfo = req.app.locals.scryActiveGameCache[joinCode];
        response.eventNum = gameInfo.eventNum;
        response.scoreVars = gameInfo.scoreVars;
        response.isActive = gameInfo.isActive;
        response.gameOwnerName = gameInfo._id;
        if (req.body.fullUpdate == true) {
            response.currentEvent = gameInfo.currentEvent;
        }
        sendResponse();

        //If it's not in cache, check database.
    } else {
        process.stdout.write(
            "Recieved req for a game that isn't cached, checking...",
        );
        req.app.locals.scryActiveGameDB
            .find({
                selector: {
                    joinCode: joinCode,
                },
            })
            .then((result) => {
                //If game exists, respond with that and update cache
                if (result.docs.length == 1) {
                    console.log("Found!");
                    gameInfo = result.docs[0];
                    req.app.locals.scryActiveGameCache[joinCode] =
                        result.docs[0];
                    response.eventNum = gameInfo.eventNum;
                    response.scoreVars = gameInfo.scoreVars;
                    response.isActive = gameInfo.isActive;
                    response.gameOwnerName = gameInfo._id;
                    if (req.body.fullUpdate == true) {
                        response.currentEvent = gameInfo.currentEvent;
                    }
                    sendResponse();
                    //If game does not exist, warn.
                } else {
                    console.log("Not Found.");
                    response.error = true;
                    response.msg =
                        "Couldn't find a matching Join Code. Check the letters and try again?";
                    sendResponse();
                }
            })
            .catch((err) => {
                console.log(err);
                response.error = true;
                response.msg =
                    "There was an error retrieving info for that Join Code.";
                sendResponse();
            });
    }

    //TURN THIS DATABASE HIT INTO A SIDE ADVENTURE IF THE MAIN CHECK FAILS
    // also todo: make sure it's checking the right joincode

    // Okay cool function Past Me.
    function sendResponse() {
        res.send(response);
    }
});

//The PUT route is for players to supply an Answer to an Event.
router.put("/", (req, res) => {
    let gameInfo = {};
    let response = {
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
            dbCatch = {}; //in case the database throws something weird.
            req.app.locals.scryActiveGameDB
                .put(gameInfo)
                .then((result) => {
                    dbCatch = result;
                    console.log(
                        `New Answer on ${gameInfo._id}'s Game, Event #${gameInfo.eventNum}. ${gameInfo.currentAnswersMap.length} Answers total.`,
                    );
                    sendResponse(); //answer finally
                })
                .catch((err) => {
                    console.log("Error on adding answer:");
                    console.log(err);
                    console.log(dbCatch);
                    response.error = true;
                    response.msg = `There was an error adding that answer. Error Was:${err} Database said:${dbCatch}`;
                    sendResponse();
                });
        })
        .catch((err) => {
            console.log(err);
            response.error = true;
            response.msg = `There was an error retrieving info for that join code. Error Was:${err}`;
            sendResponse();
        });

    function sendResponse() {
        res.send(response);
    }
});

module.exports = router;
