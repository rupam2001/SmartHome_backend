require("dotenv").config();
const WebSocket = require("ws");
const USERS = require("./database/models/users.model");
const wss = new WebSocket.Server({ port: 5002 });
console.log("Websocket Stated at port", 5002);
require("./database/dbConnect").connect();
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const ROOM = require("./database/models/room.model");
const DEVICE = require("./database/models/device.model");
const { generateJWT } = require("./utils/Authorize");
const PORT = 5002;

const app = express();
app.use(cors());
app.use(express.json());


// redis 

const redis = require('redis');
const { CLIENT_TO_DEVICE_REDDIS_CHANNEL, DEVICE_TO_CLIENT_REDDIS_CHANNEL } = require("./constance");
const publisher = redis.createClient({url: process.env.REDIS_URL});

async function Publisher(){
    await publisher.connect();
    console.log("publisher connected")
}
Publisher()

const client = redis.createClient({url: process.env.REDIS_URL});
const subscriber = client.duplicate();

async function Subscriber(){
   
    await subscriber.connect()
    console.log('subscriber connetced')
    await subscriber.subscribe(CLIENT_TO_DEVICE_REDDIS_CHANNEL, (data) => {
        const { msg, devices} = JSON.parse(data);   // devices =  [wstoken, wstoken2, ...]
        console.log('received data from ', CLIENT_TO_DEVICE_REDDIS_CHANNEL)
        
        //send the message to all the devices
        for (let i = 0; i < devices?.length; i++) {
            const device_id = devices[i];
            devices_socket_map[device_id]?.send(JSON.stringify(msg));
            console.log('sent to devices');
        }
    })
    
}

Subscriber();


//
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
    delete devices_socket_map[ws.device_id]
  });
});

function onMessage(msg, ws) {
  msg = msgBufferToJSON(msg);

  // for device  (if it has reached here that means it is for devices)
  const { init, device_id, updateState } = msg;
  console.log(msg, "device");
  if (init) {
    if (!verifyDeviceId(device_id)) return;
    //device verified
    devices_socket_map[device_id] = ws;
    ws.device_id = device_id
    const _clients = getClientsUsingDeviceID(device_id);
    devices[device_id] = _clients;
    console.log(device_id, "device init successfull", _clients);
  }
  if (updateState) {
    if (!verifyDeviceId(device_id)) return;
    console.log("inside updateState");
    //publish
    publisher.publish(DEVICE_TO_CLIENT_REDDIS_CHANNEL, JSON.stringify({msg: msg}))  //device id will be used in the client socket side to find the clients
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

