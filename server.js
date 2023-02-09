require("dotenv").config();
const WebSocket = require("ws");
const USERS = require("./database/models/users.model");
const wss = new WebSocket.Server({ port: 5001 });
console.log("Websocket Stated at port", 5001);
require("./database/dbConnect").connect();

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
  ws.on("close", () => {
    console.log("disconnected");
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
  //by device
  //authorize here pending....
  const { device_id, states } = data;
  if (clients_map[device_id]) {
    //if already exist
    clients_map[device_id] = {
      ws: ws,
      states,
      appWs: clients_map[device_id].appWs,
      ws_token: clients_map[device_id].ws_token,
      last_state_updated_at: new Date().getTime(),
    };
    //send the latest states whenver reconnected
    const msg = JSON.stringify({
      states,
      type: "state_info",
      last_state_updated_at: clients_map[device_id].last_state_updated_at,
      isOnline: true,
    });
    clients_map[device_id].appWs?.send(msg);
    console.log("send");
    return;
  }
  console.log("here");
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
    return;
  }
  // clients_map[device_id] = {
  //   ws: undefined,
  //   appWs: appWs,
  //   ws_token: ws_token,
  //   last_state_updated_at: new Date().getTime(),
  // };
  appWs.send(JSON.stringify({ isOnline: false }));
  console.log("getstates here");
}

async function handleAppInit(data, appWs) {
  const { device_id, ws_token } = data;

  if (!(device_id in clients_map)) {
    appWs.send(JSON.stringify({ success: false, msg: "device offline" }));
    clients_map[device_id] = {
      ws: undefined,
      appWs: appWs,
      ws_token: ws_token,
      last_state_updated_at: new Date().getTime(),
    };
    console.log("inited");

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
  const { device_id, ws_token, command, value } = data;
  console.log("yooooooo", res);
  if (!res) return;
  //ws_token with this device_id found..
  //put it in clients_map

  clients_map[device_id]?.ws.send(
    JSON.stringify({ command, value: value ? value : -1 })
  );
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
