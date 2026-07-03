const express = require("express");
const router = express.Router();

//This Post route is for supplying basic game data to players.
//@TODO: Make this reject if they lack a PlayerID. But only after we establish the newplayer route.
router.post("/", (req, res) => {
    console.log("beep.");
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

    // Check that there is a player ID
    if (!Object.hasOwn(req.body, "playerID")) {
        response.error = true;
        response.msg = "I need a playerID.";
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

        //Check if that player ID exists in this game.
        // @todo: This code is duplicated for the cache and actually-hit-database
        if (!Object.hasOwn(gameInfo.players, req.body.playerID)) {
            response.error = true;
            response.msg = "No matching playerID in this game.";
            sendResponse();
            return;
        }

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

                    //Bail if playerID doesn't exist in this game
                    if (!Object.hasOwn(gameInfo.players, req.body.playerID)) {
                        response.error = true;
                        response.msg = "No matching playerID in this game.";
                        sendResponse();
                        return;
                    }

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

    //Cool Function Past Me
    function sendResponse() {
        res.send(response);
    }
});

//The PUT route is for players to supply an Answer to an Event.
// @TODO: update to attach to the playerID. Also reject if there's no playerID.
router.put("/", (req, res) => {
    let gameInfo = {};
    let response = {
        error: false,
        msg: "",
    };

    // Check that there is a player ID
    if (!Object.hasOwn(req.body, "playerID")) {
        response.error = true;
        response.msg = "I need a playerID.";
        sendResponse();
        return;
    }

    //Find the game
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

            //Check if that player ID exists.
            if (!Object.hasOwn(gameInfo.players, req.body.playerID)) {
                response.error = true;
                response.msg = "No matching playerID in this game.";
                sendResponse();
                return;
            }

            //Add answer to player's ID.
            gameInfo.players[req.body.playerID] = {
                answer: newAnswer,
            };

            //@TODO: hey this might throw an error!
            // Update the database with the new answer.
            let dbCatch = {}; //in case the database throws something weird.
            req.app.locals.scryActiveGameDB
                .put(gameInfo)
                .then((result) => {
                    dbCatch = result;
                    console.log(
                        `New Answer on ${gameInfo._id}'s Game, Event #${gameInfo.eventNum}, from ${req.body.playerID}.`,
                    );

                    //Delete cache, if it exists.
                    if (
                        Object.hasOwn(
                            req.app.locals.scryActiveGameCache,
                            req.body.joinCode,
                        )
                    ) {
                        delete req.app.locals.scryActiveGameCache[
                            req.body.joinCode
                        ];
                    }

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

//Join route, checks if game exists and if so assigns a player ID.
router.put("/new", (req, res) => {
    //Sets up some variables.
    //gameInfo will be what it gets from server about the requested game's state.
    //Response is what's ultimately sent to the client.
    //newPlayerID is the player ID we'll be assigning to this player, assuming everything's hunky dory.
    let newPlayerID = 0;
    let gameInfo = {};
    let response = {
        error: false,
        msg: "",
    };

    // Check that there even is a join code
    // @todo data validation
    if (!Object.hasOwn(req.body, "joinCode")) {
        response.error = true;
        response.msg = "I didn't see a Join Code in that submission.";
        sendResponse();
        return;
    }

    // Check that there is a name
    // @todo data validation
    if (!Object.hasOwn(req.body, "name")) {
        response.error = true;
        response.msg = "I didn't see a name in that submission.";
        sendResponse();
        return;
    }

    // Yank any whoopsie spaces
    // @TODO: Sure could use some more filtering here girlypop
    let joinCode = req.body.joinCode.replace(" ", "");

    process.stdout.write(
        `New player looking for a game with ${joinCode}, checking...`,
    );

    //hit up the server
    req.app.locals.scryActiveGameDB
        .find({
            selector: {
                joinCode: joinCode,
            },
        })
        .then((result) => {
            //If game exists, continue
            if (result.docs.length == 1) {
                console.log("Found!");
                gameInfo = result.docs[0];
                response.gameOwnerName = gameInfo._id;
                //Create a new playerID
                newPlayerID = Math.floor(Math.random() * 10000);
                //check if that newPlayerID exists, and if so, try again.
                while (Object.hasOwn(gameInfo.players, newPlayerID)) {
                    newPlayerID = Math.floor(Math.random() * 10000);
                }
                //Add new player ID to listing
                gameInfo.players[newPlayerID] = { name: req.body.name };
                //Update on the database as well
                let dbCatch = {}; //in case the database throws something weird.
                req.app.locals.scryActiveGameDB
                    .put(gameInfo)
                    .then((result) => {
                        dbCatch = result;
                        console.log(
                            `Added new player ${newPlayerID} to ${gameInfo._id}'s Game.`,
                        );
                        //Finally actually tell the player their ID.
                        response.playerID = newPlayerID;
                        //console.log("marco!");
                        sendResponse();
                        //Clear the cache so the next check-in is forced to notice the update.
                        if (
                            Object.hasOwn(
                                req.app.locals.scryActiveGameCache,
                                joinCode,
                            )
                        ) {
                            delete req.app.locals.scryActiveGameCache[joinCode];
                        }
                    })
                    .catch((err) => {
                        console.log("Error on adding new player to database.");
                        console.log(err);
                        console.log(dbCatch);
                        response.error = true;
                        response.msg = `There was an error adding you. Error Was:${err} Database said:${dbCatch}`;
                        sendResponse();
                    });
                //console.log("polo!");
                //sendResponse(); //Send what happened to the client.
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

    function sendResponse() {
        res.send(response);
    }
});

module.exports = router;
