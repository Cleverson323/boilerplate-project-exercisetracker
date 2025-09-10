const express = require("express");
const app = express();
const cors = require("cors");
const mongoose = require("mongoose");
require("dotenv").config();

app.use(cors());
app.use(express.static("public"));
app.get("/", (_req, res) => {
  res.sendFile(__dirname + "/views/index.html");
});
mongoose.connect(process.env.MONGO_URI);
app.use(express.urlencoded({ extended: true }));

/*{
  username: "fcc_test",
  count: 1,
  _id: "5fb5853f734231456ccb3b05",
  log: [{
    description: "test",
    duration: 60,
    date: "Mon Jan 01 1990",
  }]
} */
const exercisesSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true,
  },
  duration: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
  },
  count: { type: Number, default: 0 },
  log: [exercisesSchema],
});

const User = mongoose.model("User", userSchema);

const createUser = async (userName) => {
  try {
    return await User.create(userName);
  } catch (err) {
    throw new Error(err);
  }
};

app.post("/api/users", async (req, res) => {
  try {
    const { username } = req.body;
    const newUser = await createUser({ username: username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.json({ error: `Failed to create user ${err.message}` });
  }
});

app.post("/api/users/:userId/exercises", async (req, res) => {
  try {
    const user = await User.findById(req.params.userId);
    if (user) {
      const { description, duration, date } = req.body;
      const newExercise = {
        description: description,
        duration: Number(duration),
        date: date ? new Date(date) : new Date(),
      };
      user.log.push(newExercise);
      await user.save();
      res.json({
        username: user.username,
        description: newExercise.description,
        duration: newExercise.duration,
        date: newExercise.date.toDateString(),
        _id: user._id,
      });
    } else {
      throw new Error("User not found");
    }
  } catch (err) {
    res.json({ error: err.message });
  }
});

const findOneOrAll = async (userId) => {
  try {
    if (userId) {
      const oneUser = await User.findById(userId);
      return oneUser;
    } else {
      const allUsers = await User.find();
      return allUsers;
    }
  } catch (err) {
    throw new Error(err.message);
  }
};

app.get("/api/users", async (req, res) => {
  try {
    const allUsers = await findOneOrAll();
    res.json(allUsers);
  } catch (err) {
    res.json({ error: err });
  }
});

app.get("/api/users/:userId", async (req, res) => {
  try {
    const user = await findOneOrAll(req.params.userId);
    if (!user) {
      return res.json({ error: "User don't found" });
    }
    res.json(user);
  } catch (err) {
    res.json({ error: err.message });
  }
});

app.get("/api/users/:userId/logs", async (req, res) => {
  try {
    const user = await findOneOrAll(req.params.userId);
    if (!user) return res.json({ error: "User not found" });

    const { from, to, limit } = req.query;

    let fromDate = from ? new Date(from) : null;
    let toDate = to ? new Date(to) : null;

    let filteredLog = user.log.filter((e) => {
      const date = new Date(e.date);
      if (fromDate && date < fromDate) return false;
      if (toDate && date > toDate) return false;
      return true;
    });

    if (limit !== undefined) filteredLog = filteredLog.slice(0, Number(limit));

    const formattedLog = filteredLog.map((e) => ({
      description: e.description,
      duration: e.duration,
      date: e.date.toDateString(),
    }));

    res.json({
      username: user.username,
      _id: user._id,
      count: user.log.length,
      log: formattedLog,
    });
  } catch (err) {
    res.json({ error: err.message });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log("Your app is listening on port " + listener.address().port);
});
