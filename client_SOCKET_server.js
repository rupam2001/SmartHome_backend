require("dotenv").config();
const WebSocket = require("ws");
const USERS = require("./database/models/users.model");
const wss = new WebSocket.Server({ port: 5001, verifyClient: async (info, cb) => {
  // const token = info.req.headers.token
  // console.log(info)
  // if (!token)
  //     cb(false, 401, 'Unauthorized')
  // else{
  //   verifyWsToken().then((decoded) =>{
  //     cb(true)
  //   }).catch(err => {
  //     cb(false, 401, 'Unauthorized')
  //   })
  // }
  cb(true)

}});
console.log("Websocket Stated at port", 5001);
require("./database/dbConnect").connect();
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const ROOM = require("./database/models/room.model");
const DEVICE = require("./database/models/device.model");
const { generateJWT } = require("./utils/Authorize");
const PORT = 5001;

const app = express();
app.use(cors());
app.use(express.json());


// redis 

const redis = require('redis');
const { CLIENT_TO_DEVICE_REDDIS_CHANNEL, DEVICE_TO_CLIENT_REDDIS_CHANNEL } = require("./constance");
const publisher = redis.createClient({url: process.env.REDIS_URL});

const redisClient = redis.createClient({url: process.env.REDIS_URL});
async function RedisClient(){
  await redisClient.connect()
  console.log("redisClient connected")
}
RedisClient();



async function Publisher(){
    await publisher.connect();
    console.log("publisher connected")
}
Publisher()

const client = redis.createClient({url:process.env.REDIS_URL});
const subscriber = client.duplicate();

async function Subscriber(){
    await subscriber.connect()
    console.log('subscriber connetced')
    await subscriber.subscribe(DEVICE_TO_CLIENT_REDDIS_CHANNEL, async (data) => {
        const { msg} = JSON.parse(data);   // clients =  [wstoken, wstoken2, ...]
        console.log('received data from ', DEVICE_TO_CLIENT_REDDIS_CHANNEL, )

        const { device_id } = msg;
        const _clients = await getClientsUsingDeviceID(device_id);
        
        //send the message to all the clients
        for (let i = 0; i < _clients.length; i++) {
            const _wstoken = _clients[i];
            clients_socket_map[_wstoken]?.send(JSON.stringify(msg));
            console.log('sent to clients');
        }
    })
    
}

Subscriber();


//





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
    console.log("disconnected", ws.wstoken);
    delete clients_socket_map[ws.wstoken]
  });
});

async function onMessage(msg, ws) {
  msg = msgBufferToJSON(msg);
  // for the client (app)
  const { wstoken, app_init, getStates, is_command } = msg;
  if (app_init) {
    // try {
    //   await verifyWsToken(wstoken)
    // } catch (error) {
    //   console.log(error)
    //   return 
    // }
    //verification success >>
    clients_socket_map[wstoken] = ws;
    ws.wstoken = wstoken
    ws.send(JSON.stringify({ init_success: true }));


    console.log(
      wstoken,
      "client init successfull >>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>BOOOMMMM"
    );
    return;
  }
  if (getStates) {
    //now request all the devices to send their states
    const _devices = getDevicesUsingWsToken(wstoken);
    
    // publish to redis in 'client_to_device' topic
    publisher.publish(CLIENT_TO_DEVICE_REDDIS_CHANNEL, JSON.stringify({msg:{ command: "getStates"}, devices: _devices}))

    console.log("published in", CLIENT_TO_DEVICE_REDDIS_CHANNEL, 'topic for getStates');
    return;
  }
  if (is_command) {
    const { device_id, command } = msg;
    console.log("is_command", msg)
    // publish to redis in 'client_to_device' topic
    if(Array.isArray(device_id)){
      publisher.publish(CLIENT_TO_DEVICE_REDDIS_CHANNEL, JSON.stringify({msg: { command }, devices: device_id}))
      return
    }
    publisher.publish(CLIENT_TO_DEVICE_REDDIS_CHANNEL, JSON.stringify({msg: { command }, devices: [device_id]}))
    console.log("published in", CLIENT_TO_DEVICE_REDDIS_CHANNEL, 'topic for Command');
    return;
  }

}

async function verifyWsToken(token) {
  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      process.env.ACCESS_TOKEN_SECRET_WS,
      async (err, authData) => {
        if (err) {
          reject({ verified: false });
        } else {
          resolve({ ...authData, verified: true });
        }
      }
    );
  })
}

function getDevicesUsingWsToken(token) {
  if (clients[token] == undefined) return [];
  return clients[token];
}

function verifyDeviceId(id) {
  return true;
}
async function getClientsUsingDeviceID(device_id) {
  try {
    const data = await redisClient.get(device_id)
    if(!data) return []
    const {clients} = JSON.parse(data)
    return clients
    
  } catch (error) {
    console.log(error, "getClientsUsingDeviceID")
    return []
  }
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

