const Joi = require("joi");
const express = require("express");
const app = express();
const cors = require("cors");
const PouchDB = require("pouchdb");
PouchDB.plugin(require("pouchdb-find"));
const scryGameData = require("./routers/scryGameData");
const scryEvents = require("./routers/scryEvents");
const scryGameControl = require("./routers/scryGameControl");
const beEvilAndFuckedUp = "TRUUUUUUUUUE";

app.use(express.json());
app.use(cors());
app.use("/scryGameData/", scryGameData); //Supplies basic game data to player
app.use("/scryEvents/", scryEvents); //Handles all Events on the player end
app.use("/scryGameControl/", scryGameControl); // Lets 'Game Controllers" edit a game.

//Setup Databases
const couchDBURL = "http://192.168.86.45:5984/";
app.locals.scryKeyDB = new PouchDB(couchDBURL + "scrykeydb");
app.locals.scryActiveGameDB = new PouchDB(couchDBURL + "scryactivegamedb");

//Poke the DBs just to make sure we're up
app.locals.scryKeyDB.info().then((info) => {
    console.log(`Connected to Key DB, which has ${info.doc_count} entries.`);
});
app.locals.scryActiveGameDB.info().then((info) => {
    console.log(
        `Connected to Active Games DB, which has ${info.doc_count} entries.`,
    );
});

app.locals.gamesDB = {};

//temporary while I move everything over
app.locals.debug = {};
//THE Event object. Everything necessary for the client to display and run an event
app.locals.debug.scryCurrentEvent = {
    eventNum: 7,
    isActive: true,
    verb: "voted",
    type: "multiChoice",
    questionText: "I'm the old qustion? Ignore me?",
    options: [
        { value: "check", label: "Drill Dozer" },
        { value: "fold", label: "Pulseman" },
        {
            value: "raiseMin",
            label: "Click Medic",
        },
        {
            value: "raiseBig",
            label: "Guru Logi Champ",
        },
    ],
};

//Populates with Answers from players.
app.locals.debug.scryCurrentAnswersMap = {};

//the Event Archive object. Contains past rounds named by Event ID number, split into eventData and answers
//TODO: Learn mongodb lmfao (the past Event or two should stil be accessible easily/quickly for scoring)
app.locals.debug.scryEventArchive = {};

//Game Variables Obect.
//Changes "on the fly" depending on a game's need.
//Should always have a label, a value, and a type
//(there's probably a better way to do type than me ramming it in here lol)
app.locals.debug.scryGameVars = {
    teamA: {
        label: "Team A",
        value: 6,
        type: "int",
    },
    teamB: {
        label: "Team B",
        value: 4,
        type: "int",
    },
};

app.get("/", (req, res) => {
    res.send("Hello World!");
});

//Keeping just for the Joi reference, is not used right now.
//returns false; otherwise returns text of error.
/* function isThisInvalidAndWhy(course) {
    const schema = Joi.object({
        name: Joi.string().min(3).required(),
    });
    const validationResult = schema.validate(course);
    console.log("Validator function .error is:");
    console.log(validationResult.error);
    if (validationResult.error) {
        return validationResult.error.message;
    }
    return false;
}*/

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Listening on port ${port}.`);
});
