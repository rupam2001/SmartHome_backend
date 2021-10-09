require("dotenv").config();

const express = require("express");
const USERS = require("./database/models/users.model");
const { authenticateToken, generateJWT } = require("./utils/Authorize");
const app = express();
app.use(express.json());
require("./database/dbConnect").connect();
const crypto = require("crypto");
const mung = require("express-mung");
const SESSIONS = require("./database/models/sessions.model");
app.use(
  mung.json(function authTransforms(body, req, res) {
    if (req.access_token) {
      body = { ...body, access_token: req.access_token, isTokenChanged: true };
    }
    return body;
  })
);

const PORT = process.env.PORT || 5002;

app.post("/user/create", async (req, res) => {
  const { name, email, phone, device_id, password } = req.body;
  try {
    const user = await USERS.create({
      name,
      email,
      phone,
      device_id,
      password,
    });
    const access_token = await generateJWT({ user_id: user._id });
    // const refresh_token = crypto.randomBytes(32).toString("hex");
    // await SESSIONS.create({ user_id: user.id, refresh_token });
    user.ws_token = crypto.randomBytes(16).toString("hex");
    await user.save();
    res.status(200).json({ access_token });
  } catch (error) {
    console.log(error);
    res.sendStatus(500);
  }
});

app.post("/user/login", async (req, res) => {
  const { email, password } = req.body;
  console.log(email, password);
  try {
    const user = await USERS.findOne({ email, password });
    if (!user) return res.sendStatus(404);
    const access_token = await generateJWT({
      _id: user._id,
      email,
      device_id: user.device_id,
    });
    return res.status(200).json({
      access_token,
      success: true,
      device_id: user.device_id,
      ws_token: user.ws_token,
    });
  } catch (error) {
    res.sendStatus(500);
  }
});

app.listen(PORT, () => console.log("Server started at port", PORT));

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjE1OTY4NGY1N2RhMzk5M2M1N2Y2NDMxIiwiaWF0IjoxNjMzMjQ5MzU5LCJleHAiOjE2MzMzMzU3NTl9.A_blZJS0mMs-ksKps3XsbTsaUHmsY8-XM9vXIiNcl14
