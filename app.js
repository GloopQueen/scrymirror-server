const Joi = require("joi");
const express = require("express");
const app = express();
const cors = require("cors");
const scryGameData = require("./routers/scryGameData");
const beEvilAndFuckedUp = "TRUUUUUUUUUE";

app.use(express.json());
app.use(cors());
app.use("/scryGameData/", scryGameData);

//delete this when you delete those learning ones
const courses = [
    { id: 1, name: "math" },
    { id: 2, name: "science" },
    { id: 3, name: "geology" },
];

//THE Event object. Everything necessary for the client to display and run an event
app.locals.scryCurrentEvent = {
    eventNum: 6,
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

//TODO: move /events to it's own module. Players get data about the current event here
app.get("/events/currentEvent/", (req, res) => {
    res.send(app.locals.scryCurrentEvent);
});

//Players post their answers here
app.post("/events/currentEvent", (req, res) => {
    //TODO: Validation code in general
    //TODO: Reject on Event number mismatch.

    /*
  //ACTUALLY YOU CAN PROBABLY JUST MURK THIS TOO
  const answer = {
    eventNum: req.body.eventNum,
    verb: req.body.verb,
    value: req.body.value,
    playerID: req.body.playerID,
    responseTime: req.body.responseTime,
    }; */

    const response = {
        msg: req.body,
        error: false,
        tellUser: false, //Turn on to show error text to player
    };

    if (app.locals.scryCurrentAnswersMap[req.body.playerID]) {
        response.error = true;
        response.msg = "Double answer";
        res.status(400);
    } else {
        app.locals.scryCurrentAnswersMap[req.body.playerID] = req.body;
        console.log(app.locals.scryCurrentAnswersMap);
        res.status(200);
    }

    res.send(response);
    if (response.error == true) {
        console.log(
            `Err: Player ${req.body.playerID} on Event ${scryCurrentEvent.eventNum}: ${response.msg}.`,
        );
    }
});

app.get("/", (req, res) => {
    res.send("Hello World!");
});

///////////////////////THE LEARNING STUFF STARTS HERE IGNORE IGNORE IGNORE
app.get("/api/courses", (req, res) => {
    res.send(courses);
});

app.get("/api/courses/:id", (req, res) => {
    const course = courses.find((c) => {
        return c.id === parseInt(req.params.id);
    });
    console.log(course);
    if (!course) {
        res.status(404).send("Course with that ID not found.");
    }
    res.send(course);
});

app.post("/api/courses", (req, res) => {
    //validate
    const yuckyInputResult = isThisInvalidAndWhy(req.body);
    if (yuckyInputResult) {
        res.status(400).send(yuckyInputResult);
        return;
    }
    const course = {
        id: courses.length + 1,
        name: req.body.name,
    };
    courses.push(course);
    res.send(course);
});

app.put("/api/courses/:id", (req, res) => {
    //check if course exists and get it
    const course = courses.find((c) => {
        return c.id === parseInt(req.params.id);
    });
    console.log(course);

    //bail if the course doesnt exist
    if (!course) {
        res.status(404).send("Course with that ID not found.");
        return;
    }

    //validate and bail if it's bad
    const yuckyInputResult = isThisInvalidAndWhy(req.body);
    if (yuckyInputResult) {
        res.status(400).send(yuckyInputResult);
        return;
    }
    //alright we're gucci let's update her
    course.name = req.body.name;
    res.send(course);
});

app.delete("/api/courses/:id", (req, res) => {
    //check if course exists and get it
    const course = courses.find((c) => {
        return c.id === parseInt(req.params.id);
    });
    console.log(course);

    //bail if the course doesnt exist
    if (!course) {
        res.status(404).send("Course with that ID not found.");
        return;
    }
    const index = courses.indexOf(course);
    courses.splice(index, 1);
    res.send(course);
});
//////////////END OF THE LEARNING ENDPOINTS

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
