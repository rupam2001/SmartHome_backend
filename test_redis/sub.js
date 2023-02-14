const redis = require('redis');

(async () => {

  const client = redis.createClient({url:"redis://192.168.29.19:6379"});

  const subscriber = client.duplicate();

  await subscriber.connect();

  await subscriber.subscribe('client_to_device', (message) => {
    console.log(message); // 'message'
  });

})();