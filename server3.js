require("dotenv").config();
const WebSocket = require("ws");
const USERS = require("./database/models/users.model");
const wss = new WebSocket.Server({ port: 5001 });
console.log("Websocket Stated at port", 5001);
require("./database/dbConnect").connect();
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const ROOM = require("./database/models/room.model");
const DEVICE = require("./database/models/device.model");
const { generateJWT } = require("./utils/Authorize");
const PORT = 5000;

const app = express();
app.use(cors());
app.use(express.json());

let clients_socket_map = {};
let devices_socket_map = {};
let devices = {
  device_id: ["wtoken1", "wtoken2", "..."],
};

let clients = {
  wtoken: ["device_id1", "device_id2", "..."],
};

wss.on("connection", (ws, req) => {
  console.log("New Client Joined");
  ws.on("message", (msg) => {
    onMessage(msg, ws);
  });
  ws.on("close", () => {
    console.log("disconnected");
  });
});

function onMessage(msg, ws) {
  msg = msgBufferToJSON(msg);
  // for the client (app)
  const { wstoken, app_init, getStates, is_command } = msg;
  console.log("Yoo");
  if (app_init) {
    if (verifyWsToken(wstoken) == false) return;
    //verification success >>
    clients_socket_map[wstoken] = ws;
    // const _devices = getDevicesUsingWsToken(wstoken);
    // clients[wstoken] = _devices;
    ws.send(JSON.stringify({ init_success: true }));
    console.log(
      wstoken,
      "client init successfull >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>BOOOMMMM"
    );
    return;
  }
  if (getStates) {
    if (verifyWsToken(wstoken) == false) return;
    //now request all the devices to send their states
    // const _devices = clients[wstoken];
    const _devices = getDevicesUsingWsToken(wstoken);

    for (let i = 0; i < _devices.length; i++) {
      const device_id = _devices[i];
      devices_socket_map[device_id]?.send(
        JSON.stringify({ command: "updatestate(doesnot matter)" })
      );
    }
    console.log("sent to device for getStates");
    return;
  }
  if (is_command) {
    if (verifyWsToken(wstoken) == false) return;
    const { device_id, command } = msg;
    devices_socket_map[device_id]?.send(JSON.stringify({ command }));
    return;
  }

  // for device  (if it has reached here that means it is for devices)
  const { init, device_id, updateState } = msg;
  console.log(msg, "device");
  if (init) {
    if (!verifyDeviceId(device_id)) return;
    //device verified
    devices_socket_map[device_id] = ws;
    const _clients = getClientsUsingDeviceID(device_id);
    devices[device_id] = _clients;
    console.log(device_id, "device init successfull", _clients);
  }
  if (updateState) {
    if (!verifyDeviceId(device_id)) return;

    // const _clients = devices[device_id];
    const _clients = getClientsUsingDeviceID(device_id);
    console.log("inside updateState", _clients, device_id);

    //send to each client
    for (let i = 0; i < _clients.length; i++) {
      const _wstoken = _clients[i];
      clients_socket_map[_wstoken]?.send(JSON.stringify(msg));
      console.log(clients_socket_map[_wstoken], "client socket map");
    }
    return;
  }
}

function verifyWsToken(token) {
  return true;
}

function getDevicesUsingWsToken(token) {
  if (clients[token] == undefined) return [];
  return clients[token];
}

function verifyDeviceId(id) {
  return true;
}
function getClientsUsingDeviceID(device_id) {
  if (devices[device_id] == undefined) {
    return [];
  }
  return devices[device_id];
}

//helpers
function msgBufferToJSON(msg) {
  const string = msg.toString();
  const data = JSON.parse(string);
  return data;
}

function removeDuplicates(arr) {
  return arr.filter((item, index) => arr.indexOf(item) === index);
}

app.post("/get_devices", async (req, res) => {
  const { accessToken } = req.body;
  console.log(accessToken, "get_devices access token");
  try {
    const { user_id } = await getAuthDataFromAccessToken(accessToken);
    console.log(user_id);
    const devices = await DEVICE.find({ user_id: user_id }).populate("room_id");
    return res.status(200).json(devices);
  } catch (error) {
    console.log(error, "get_device");
    res.sendStatus(500);
  }
});

app.post("/login", async (req, res) => {
  console.log("login");
  try {
    const { email, password } = req.body;
    const user = await USERS.findOne({ email, password });
    if (!user) {
      return res.sendStatus(404);
    }
    const accessToken = await generateJWT({ user_id: user._id });
    console.log(accessToken, "accessstoken sent");
    return res.status(200).json({ success: true, accessToken });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
app.post("/get_wstoken", async (req, res) => {
  console.log("get_wstoken hit");
  try {
    const { accessToken } = req.body;
    const { verified, user_id } = await getAuthDataFromAccessToken(accessToken);

    const wstoken = await generateJWT({ time: "time" });
    //get all the devices for this account
    const _devices = await DEVICE.find({ user_id });
    //now for all the devices set clients and devices map
    clients[wstoken] = [];
    // console.log(wstoken, _devices);

    for (let i = 0; i < _devices.length; i++) {
      //set clients
      const device_id = _devices[i]._id.toString();
      clients[wstoken].push(device_id);
      // console.log(device_id, "device_id");
      if (!(device_id in devices)) {
        console.log("here");
        devices[device_id] = []; //if the device is not in the devices map create it
        devices[device_id].push(wstoken);
        continue;
      }
      // console.log(devices);
      devices[device_id].push(wstoken);
    }
    console.log("wstoken created and send", devices);
    res.status(200).json({ wstoken, success: true });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});
//testing purpose
app.post("/create_user", async (req, res) => {
  const { name, email, phone, password } = req.body;
  try {
    const user = await USERS.create({ name, email, phone, password });
    console.log("user created");
    res.status(200).json(user);
  } catch (error) {
    console.log(error);
  }
});

app.post("/create_room", async (req, res) => {
  const { title, user_id } = req.body;
  try {
    const room = await ROOM.create({ user_id, title });
    console.log("room created");
    res.status(200).json(room);
  } catch (error) {
    console.log(error);
  }
});

app.post("/create_device", async (req, res) => {
  const { user_id, room_id } = req.body;
  try {
    const switches = [
      {
        title: "Light 1",
        id: "l1",
      },
      {
        title: "Light 2",
        id: "l2",
      },
      {
        title: "Light 3",
        id: "l3",
      },
      {
        title: "Light 4",
        id: "l4",
      },
      {
        title: "Light 5",
        id: "l5",
      },
      {
        title: "Light 6",
        id: "l6",
      },
      {
        title: "Light 7",
        id: "l7",
      },
    ];
    const device = await DEVICE.create({ user_id, switches, room_id });
    console.log("device created");
    res.status(200).json(device);
  } catch (error) {
    console.log(error);
  }
});

async function getAuthDataFromAccessToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, authData) => {
        if (err) {
          reject({ verified: false });
        } else {
          resolve({ ...authData, verified: true });
        }
      }
    );
  });
}

app.listen(PORT, () => console.log("Server is running at", PORT));
