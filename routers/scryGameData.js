const express = require("express");
const router = express.Router();

//This Post route is for supplying basic game data to players.
//@TODO: Make this reject if they lack a PlayerID. But only after we establish the newplayer route.
router.post("/", (req, res) => {
    //console.log("beep.");
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
    // @TODO: Sure could use some more filtering here girlypop
    let joinCode = req.body.joinCode.replace(" ", "");

    //Check that that game isn't in the graveyard.
    //strip the -XYZ if it exists
    const shortJoinSplit = joinCode.split("-");
    const shortJoinCode = shortJoinSplit[0];
    //check if it's in the graveyard
    if (Object.hasOwn((req.app.locals.scryCodeGraveyard), shortJoinCode)) {
        response.sheDied = true;
        response.error = true;
        response.msg = "This game has ended.";
        sendResponse();
        return;
    }


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
        prepareResponse();
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
                    //response.scoreVars = gameInfo.scoreVars; Moving to piggy back on teams logic down below
                    response.isActive = gameInfo.isActive;
                    response.gameOwnerName = gameInfo._id;
                    //@todo you can probably get rid of this being fullUpdate we just always do it.
                    if (req.body.fullUpdate == true) {
                        //check if team behavior is active
                        // if so, get player info (find out exact location)
                        // read player.teamNumber
                        // check if no team
                        //    if so, check if general exists
                        //       if general exists, return it
                        //       if not, return notYourTurn = true
                        // else check if teams[thatnumber].currentEvent is populated
                        //      if populated, return.
                        //      if not, return notyourturn
                        // if not, just send the line below

                        //Check if its Teams Time™️
                        prepareResponse();


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

    //prepares response, accounting for Team behavior.
    //I forget why this is a separate function other than the fact it's a turducken of stuff
    function prepareResponse() {
        const isEmpty = obj => Object.keys(obj).length === 0;

      if (Object.hasOwn(gameInfo, "teams")) {
          //console.log("Running teams logic.");
          const playerNum = req.body.playerID;
          //Check if the player is on a team
          if (Object.hasOwn(gameInfo.players[playerNum], "teamNumber")) {
              const playerTeamNumber = gameInfo.players[playerNum].teamNumber;
              //console.log(`Looks like player is on ${playerTeamNumber}.`);
              response.yourTeamName = gameInfo.teams[playerTeamNumber].name;

              //if the player is on a team, check if there's a team-specific Event
              if (isEmpty(gameInfo.teams[playerTeamNumber].currentEvent)) {
                  //if not, tell them it's not their turn.
                  response.notYourTurn = true;
              } else {
                  //if yes, return the team-specific Event.
                  response.currentEvent = gameInfo.teams[playerTeamNumber].currentEvent;
              }

              //If the player is on a team, check if there's a team-specific scoreBoard
              if (isEmpty(gameInfo.teams[playerTeamNumber].scoreBoard)) {
                  //if not, return the generic scoreBoard.
                  response.scoreVars = gameInfo.scoreVars;
                  //console.log("empty scoreboard logic.");
              } else {
                  //if yes, return the team-specific scoreBoard.
                  response.scoreVars = gameInfo.teams[playerTeamNumber].scoreBoard;
                  //console.log("populated scoreboard logic.");
              }

          } else {
              //If the player isn't on a team, check if there's general event data.
              //console.log("looks like player is not on a team.");
              if (isEmpty(gameInfo.currentEvent)) {
                  response.notYourTurn = true;
              } else {
                  response.currentEvent = gameInfo.currentEvent;
              }
          }
      } else {
        //if we're not doing any team nonsense, just return as normal.
          console.log("Not running teams logic.");
          response.currentEvent = gameInfo.currentEvent;
      }
    }


    //Cool Function Past Me
    function sendResponse() {
        res.send(response);
    }

    //function to check if I'm giving it an empty Object
    // Or so google says
    const isEmpty = obj => Object.keys(obj).length === 0;

});



//The PUT route is for players to supply an Answer to an Event.
// @TODO: update to attach to the playerID. Also reject if there's no playerID.
router.put("/", (req, res) => {
    let gameInfo = {};
    let newAnswer = {};
    let response = {
        error: false,
        msg: "",
    };

    //Check that that game isn't in the graveyard.
    if (Object.hasOwn(req.body, "joinCode")) {
        //strip the -XYZ if it exists
        const shortJoinsplit = req.body.joinCode.split("-");
        const shortJoinCode = shortJoinsplit[0];
        //check if it's in the graveyard
        if (Object.hasOwn((req.app.locals.scryCodeGraveyard), shortJoinCode)) {
            response.sheDied = true;
            response.error = true;
            response.msg = "This game has ended.";
            sendResponse();
            return;
        }
    }

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
            //Remove some stuff that doesn't need to be there
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
            let newPlayerDeets = { ...gameInfo.players[req.body.playerID], answer: newAnswer };
            gameInfo.players[req.body.playerID] = newPlayerDeets;

            //Delete the extra trailing playerID since it's just clutter.
            const submitterIDForTheLog = gameInfo.players[req.body.playerID].answer.playerID;
            delete gameInfo.players[req.body.playerID].answer.playerID;

            //@TODO: hey this might throw an error!
            // Update the database with the new answer.
            let dbCatch = {}; //in case the database throws something weird.
            req.app.locals.scryActiveGameDB
                .put(gameInfo)
                .then((result) => {
                    dbCatch = result;
                    console.log(
                        `New Answer on ${gameInfo._id}'s Game, Event #${gameInfo.eventNum}, from ${submitterIDForTheLog}.`,
                    );
                    //Update cache to reflect
                    req.app.locals.scryActiveGameCache[req.body.joinCode] = gameInfo;

                    //Delete cache, if it exists.
                    /*if (
                        Object.hasOwn(
                            req.app.locals.scryActiveGameCache,
                            req.body.joinCode,
                        )
                    ) {
                        delete req.app.locals.scryActiveGameCache[
                            req.body.joinCode
                        ];
                        } */ //Dear Princess Celestia I learned a lot about database stampedes today

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
    //teamJoinCode is the digits after the -, if present. This existing means
    let newPlayerID = 0;
    let generalJoinCode = "";
    let teamJoinCode = "";
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

    //check for only - and alphanumeric on the joincode
    if (!/^[a-z0-9-]+$/i.test(req.body.joinCode)) {
        response.error = true;
        response.msg = "Join code format looks weird: I only take numbers, letters, and the dash (-).";
        sendResponse();
        return;
    }





    let joinFullString = req.body.joinCode;


    //Check that that game isn't in the graveyard.
    //strip the -XYZ if it exists
    const shortJoinSplit = joinFullString.split("-");
    const shortJoinCode = shortJoinSplit[0];
    //check if it's in the graveyard
    if (Object.hasOwn((req.app.locals.scryCodeGraveyard), shortJoinCode)) {
        response.sheDied = true;
        response.error = true;
        response.msg = "This game has ended.";
        sendResponse();
        return;
    }


    //Filter if it's a six-digit standard code, or a ten digit with a team code.
    //@todo - Fix! Wrapping this in a try/catch in lieu of proper validation lol this is naughty
    try {
        //console.log("marco");
        //console.log(joinFullString.length);
        //Check if it's six characters.
        if (joinFullString.length == 6) {
            generalJoinCode = joinFullString;
        }
        //Check if it's not six characters.
        if (joinFullString.length !== 6) {
            //console.log("polo");
            //Make sure it's ten characters with a dash in it.
            if (joinFullString.length == 10 && joinFullString[6] == "-") {
                //if so, grab the code.
                //console.log("pleebo");
                const lilSplice = joinFullString.split("-");
                teamJoinCode = lilSplice[1];
                generalJoinCode = lilSplice[0];
                console.log(teamJoinCode)
            } else {
                //if it's something else, get mad.
                response.error = true;
                response.msg = "Your joinCode format looks weird. Make sure it's ABCDEF, or ABCDEF-GHI."
                sendResponse();
                return;
            }
        }
    } catch (error) {
        console.log("Possible Join Code Issue. Error:");
        console.log(error);
        response.error = true;
        response.msg = "Your joinCode made the server mad. Make sure the format is ABCDEF, or ABCDEF-GHI.";
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
    //let joinCode = req.body.joinCode.replace(" ", "");

    process.stdout.write(
        `New player looking for a game with ${generalJoinCode}, checking...`,
    );

    //hit up the server
    req.app.locals.scryActiveGameDB
        .find({
            selector: {
                joinCode: generalJoinCode,
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

                //❤️~CODE HERE TO UPDATE TEAM ENTRY~❤️

                // Verify that teamJoinCode is there, To initiate team assigments.
                if (teamJoinCode.length > 1) {
                    console.log("join code loop initiating.");
                    if (Object.hasOwn(gameInfo.teams, "joinMode")) {
                      //console.log("passed flag one.");
                      // Check if mode is set to uniqueCodes
                        if (gameInfo.teams.joinMode == "uniqueCodes") {
                            //console.log("passed flag two.");
                          // iterate over each possible team number
                          //  if it exists, check if number.joincode matches teamJoinCode
                          //      if so, add it then exit loop
                          //      if not, keep going
                          //  if it doesnt exist, bail completely and complain
                          for (let i = 1; i < 50; i++) {
                              if (Object.hasOwn(gameInfo.teams, i)) {
                                  if (gameInfo.teams[i].joinCode == teamJoinCode) {
                                      let newPlayerArray = [...gameInfo.teams[i].members, newPlayerID];
                                      gameInfo.teams[i].members = newPlayerArray;
                                      console.log(`Adding player ${newPlayerID} to team ${i}.`);
                                      gameInfo.players[newPlayerID] = { name: req.body.name, teamNumber: i };
                                      // @TODO This is saving to both the array and to the team member themselves. Probably asking for trouble. stick to team member.
                                      break;
                                  }
                              } else {
                                  response.error = true;
                                  response.msg = "Found a game matching your code, but not a team. Check those last three after the dash?";
                                  sendResponse();
                                  return;
                            }
                          }
                      }
                      //@Todo onebyone code here
                  }
                }

                //Update the new player ID (and possibly team number) on the database.
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
                                generalJoinCode,
                            )
                        ) {
                            delete req.app.locals.scryActiveGameCache[generalJoinCode];
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

//Gloop this can go. you can remove your Emotional Support Function That Don't Do Shit
function removeMeImAnExample() {
    //Example regex code that will only allow alphanumeric and a dash.
    //Put this on the joincode, and the name. do the same on the client side (do it sloppy and just alert())
    let value = "BQK6R4-YQ8";

    if (/^[a-z0-9-]+$/i.test(value)) {
        //-------------------------^^^^^^^^^^
        console.log("Passed check.");
        return;
    }
}

module.exports = router;
