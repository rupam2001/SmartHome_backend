const redis = require('redis');
const publisher = redis.createClient({url:"redis://192.168.29.19:6379"});

(async () => {

  const article = {
    id: '123456',
    name: 'Using Redis Pub/Sub with Node.js',
    blog: 'Logrocket Blog',
  };

  await publisher.connect();

//   await publisher.publish('article', JSON.stringify(article));
})();

const express = require('express');
const { json } = require('express-mung');
const app = express()

app.get("/pub/:msg", async (req, res) =>{
    const msg = req.params.msg
    if(!msg) return res.send("No message?")
    await publisher.publish('article', JSON.stringify({msg}))
    return res.send("published successfully")
})

app.listen(3001, ()=> console.log("server running at port", 3001))