const Joi = require("joi");
const express = require("express");
const app = express();
const cors = require("cors");
const scryGameData = require("./routers/scryGameData");
const scryEvents = require("./routers/scryEvents");
const scryGameControl = require("./routers/scryGameControl");
const beEvilAndFuckedUp = "TRUUUUUUUUUE";

app.use(express.json());
app.use(cors());
app.use("/scryGameData/", scryGameData); //Supplies basic game data to players
app.use("/scryEvents/", scryEvents); //Handles all Events on the player end
app.use("/scryGameControl/", scryGameControl);

//Admin key
//TODO: This is going to need to be totally redone
//There's gotta be a system here to match a list of gamecontrollerkeys to people we gave keys to
app.locals.gameControllerKey = 69420;

//THE Event object. Everything necessary for the client to display and run an event
app.locals.scryCurrentEvent = {
    eventNum: 7,
    isActive: true,
    verb: "voted",
    type: "multiChoice",
    questionText: "Which of these was not developed by Game Freak?",
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
app.locals.scryCurrentAnswersMap = {};

//the Event Archive object. Contains past rounds named by Event ID number, split into eventData and answers
//TODO: Learn mongodb lmfao (the past Event or two should stil be accessible easily/quickly for scoring)
app.locals.scryEventArchive = {};

//Game Variables Obect.
//Changes "on the fly" depending on a game's need.
//Should always have a label, a value, and a type
//(there's probably a better way to do type than me ramming it in here lol)
app.locals.scryGameVars = {
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

//returns false; otherwise returns text of error.
function isThisInvalidAndWhy(course) {
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
}

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`listening on port ${port}.`);
});
