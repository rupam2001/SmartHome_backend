require("dotenv").config();
const WebSocket = require("ws");
const USERS = require("./database/models/users.model");
// const wss = new WebSocket.Server({ port: 5001 });
// console.log("Websocket Stated at port", 5001);
require("./database/dbConnect").connect();
const jwt = require("jsonwebtoken");

const crypto = require("crypto");
const express = require("express");
const cors = require("cors");
const ROOM = require("./database/models/room.model");
const DEVICE = require("./database/models/device.model");
const { generateJWT, generateJWTWsToken } = require("./utils/Authorize");
const PORT = 5003;

const app = express();
app.use(cors());
app.use(express.json());


// redis 

const redis = require('redis');
const redisClient = redis.createClient({url:"redis://192.168.29.19:6379"});

async function RedisClient(){
    await redisClient.connect();
    console.log("redisClient connected")
}
RedisClient()


app.post("/get_user_data", async (req, res) => {
    const { accessToken } = req.body;
    try {
      const { user_id } = await getAuthDataFromAccessToken(accessToken);
      
      const user = await USERS.findById(user_id, { password: 0})

      return res.status(200).json(user);
    } catch (error) {
      console.log(error, "get_device");
      res.sendStatus(500);
    }
  });
  


app.post("/get_devices", async (req, res) => {
  const { accessToken } = req.body;
  try {
    const { user_id } = await getAuthDataFromAccessToken(accessToken);
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

    const wstoken = await generateJWTWsToken({ user_id });
    //get all the devices for this account
    const _devices = await DEVICE.find({ user_id });
    //now for all the devices set clients and devices map
    
    for (let i = 0; i < _devices.length; i++) {
      //set clients
      const device_id = _devices[i]._id.toString();
      let device_ws_map = await redisClient.get(device_id)
      console.log(device_ws_map,'device_ws_map')
      if(!device_ws_map){
        //set
        await redisClient.set(device_id, JSON.stringify({ clients:[wstoken] }))  //i think we can elemenate await
      }else{
        device_ws_map = JSON.parse(device_ws_map)
        await redisClient.set(device_id, JSON.stringify({ clients:[ ...device_ws_map.clients,  wstoken] }))
      }
      redisClient.expireAt(device_id, parseInt((+new Date)/1000) + 86400)  //expire it after 24 hours
    }
    console.log("wstoken created and send",);
    res.status(200).json({ wstoken, success: true });
  } catch (error) {
    console.log(error);
    return res.sendStatus(500);
  }
});

app.get("/getrediswstokens/:deviceid", async(req, res) => {
    const device_ws_map = await redisClient.get(req.params.deviceid)
    if(!device_ws_map) return res.send("empty")
    res.send(JSON.stringify(device_ws_map))
})


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
        title: "Switch 1",
        id: "l1",
      },
      {
        title: "Switch 2",
        id: "l2",
      },
      {
        title: "Switch 3",
        id: "l3",
      },
      {
        title: "Switch 4",
        id: "l4",
      },
      {
        title: "Switch 5",
        id: "l5",
      },
      {
        title: "Switch 6",
        id: "l6",
      },
      {
        title: "Switch 7",
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


app.post("/room/edit", async (req, res) => {
    try {
        const { accessToken } = req.body;
        const { user_id } = await getAuthDataFromAccessToken(accessToken);
        const { title }  = req.body
        console.log(user_id, title)
        if(!title) return res.sendStatus(400);
        await ROOM.updateOne({user_id: user_id}, { $set: { title: title}})
        return res.status(200).json({success: true})
    } catch (error) {
        res.sendStatus(500)
        console.log(error)
    }
})

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
