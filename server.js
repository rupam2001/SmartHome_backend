require("dotenv").config();
const WebSocket = require("ws");
const USERS = require("./database/models/users.model");
const wss = new WebSocket.Server({ port: 5001 });
console.log("Websocket Stated at port", 5001);

// const express = require("express");
// const USERS = require("./database/models/users.model");
// const { authenticateToken, generateJWT } = require("./utils/Authorize");
// const app = express();
// app.use(express.json());
require("./database/dbConnect").connect();
// const crypto = require("crypto");
// const mung = require("express-mung");
// const SESSIONS = require("./database/models/sessions.model");
// app.use(
//   mung.json(function authTransforms(body, req, res) {
//     if (req.access_token) {
//       body = { ...body, access_token: req.access_token, isTokenChanged: true };
//     }
//     return body;
//   })
// );

const PORT = process.env.PORT || 5002;

let clients_map = {};
let user_device_map = {
  userid123: {
    device_id: "123456",
  },
};

wss.on("connection", (ws, req) => {
  console.log("New Client Joined");
  ws.on("message", (msg) => {
    onMessage(msg, ws);
  });
});

function onMessage(msg, ws) {
  const string = msg.toString();
  const data = JSON.parse(string);
  console.log(data);
  if (data["init"] == true) {
    //new device connection
    handleInit(data, ws);
  }
  if (data["send_to_device"] == true) {
    //from app to device
    handleSendToDevice(data, ws);
  }

  if (data["response"] == true) {
  }
  if (data["updateState"] == true) {
    //by device
    updateStates(data);
  }
  if (data["getStates"] == true) {
    //by app
    handleGetStates(data, ws);
  }
}
function handleInit(data, ws) {
  //authorize here pending....
  const { device_id, states } = data;
  if (clients_map[device_id]) {
    //if already exist
    clients_map[device_id] = {
      ws: ws,
      states,
      appWs: clients_map[device_id].appWs,
      ws_token: clients_map[device_id].ws_token,
      last_state_updated_at: clients_map[device_id].last_state_updated_at,
    };
    //send the latest states whenver reconnected
    const msg = JSON.stringify({
      states,
      type: "state_info",
      last_state_updated_at: clients_map[device_id].last_state_updated_at,
      isOnline: true,
    });
    clients_map[device_id].appWs.send(msg);
  }
  clients_map[device_id] = { ws: ws, states };
}

async function handleGetStates(data, appWs) {
  const res = await handleAppInit(data, appWs);
  if (res == false) return;
  const { device_id, ws_token } = data;
  if (clients_map[device_id]) {
    const states = clients_map[device_id].states;
    const msg = JSON.stringify({
      states,
      type: "state_info",
      last_state_updated_at: clients_map[device_id].last_state_updated_at,
      isOnline: true,
    });
    appWs.send(msg);
  }
  appWs.send(JSON.stringify({ isOnline: false }));
}

async function handleAppInit(data, appWs) {
  const { device_id, ws_token } = data;

  if (!(device_id in clients_map)) {
    appWs.send(JSON.stringify({ success: false, msg: "device not found" }));
    return false;
  }
  //checking if ws_token available
  if (!clients_map[device_id]["ws_token"]) {
    //search in db
    const user = await USERS.findOne({ ws_token, device_id });
    if (!user) {
      appWs.send(
        JSON.stringify({
          success: false,
          msg: "Bad Request, please retry or log in again",
        })
      );
      return false;
    }
    //ws_token with this device_id found..
    //put it in clients_map
    clients_map[device_id]["ws_token"] = ws_token;
    clients_map[device_id]["appWs"] = appWs;
    return true;
  } else {
    //if the ws_token is avalaible we still have to store the latest appWs
    clients_map[device_id]["appWs"] = appWs;
    return true;
  }
  return true;
}

async function handleSendToDevice(data, appWs) {
  const res = await handleAppInit(data, appWs);
  const { device_id, ws_token, command } = data;
  console.log("yooooooo", res);
  if (!res) return;
  //ws_token with this device_id found..
  //put it in clients_map

  clients_map[device_id]?.ws.send(JSON.stringify({ command }));
}

function updateStates(data) {
  const { device_id, states } = data;
  clients_map[device_id].states = states;
  clients_map[device_id].last_state_updated_at = new Date().getTime();
  //send it to the app (its okay if the app doesnot receive it)
  clients_map[device_id].appWs?.send(
    JSON.stringify({ type: "state_info", states })
  );
}

// app.post("/command", authenticateToken, async (req, res) => {
//   const { device_id, command } = req.body;
//   const { user_id } = req.authData;

//   //authorize here before sending commands to the device

//   //from the token we will get the user_id
//   // after that we will check if the user has the device_id (have to be cached since it is very frequent)
//   //then we can send command to the device

//   if (!(user_id in user_device_map)) {
//     const user = await USERS.findById({ _id: user_id });
//     if (!user) {
//       return res.sendStatus(404);
//     }
//     user_device_map[user_id] = { device_id };
//   }
//   //in user_device_map

//   clients_map[device_id]?.ws.send(JSON.stringify({ command }), (err) => {
//     if (err) {
//       //get the state
//       return res.status(200).json({ success: false, msg: "Unable to perform" });
//     }
//     res.status(200).json({ success: true, msg: "Done" });
//   });
// });

// app.post("/getstates", (req, res) => {
//   const { device_id } = req.body;
//   if (!(device_id in clients_map)) {
//     return res.sendStatus(404);
//   }
//   const { states } = clients_map[device_id];
//   return res.status(200).json({ states });
// });

// app.post("/user/create", async (req, res) => {
//   const { name, email, phone, device_id } = req.body;
//   try {
//     const user = await USERS.create({ name, email, phone, device_id });
//     const access_token = await generateJWT({ user_id: user._id });
//     const refresh_token = crypto.randomBytes(32).toString("hex");
//     await SESSIONS.create({ user_id: user.id, refresh_token });
//     res.status(200).json({ access_token });
//   } catch (error) {
//     console.log(error);
//     res.sendStatus(500);
//   }
// });

// app.listen(PORT, () => console.log("Server started at port", PORT));

// eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiNjE1OTY4NGY1N2RhMzk5M2M1N2Y2NDMxIiwiaWF0IjoxNjMzMjQ5MzU5LCJleHAiOjE2MzMzMzU3NTl9.A_blZJS0mMs-ksKps3XsbTsaUHmsY8-XM9vXIiNcl14
