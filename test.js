const fetch = require("node-fetch");
const req = async (url) => {
  const res = await fetch(
    "http://192.168.4.1:80/setwifisettings?ssid=rupam_f62&pwd=qmvx7246",
    { method: "GET" }
  );
  return res;
};

req()
  .then((r) => {
    console.log(r);
  })
  .catch((err) => console.error(err));

// multiple device and client support data
let clients_socket_map = {
  wtoken: "socket",
};
let devices_socket_map = {
  device_id: "socket",
};

//for sending message from device to client
// from devices get all wtoken, for each wtoken go to clients_socket_map and send message
let devices = {
  device_id: ["wtoken1", "wtoken2", "..."],
};

/**
 * for sending message from client to device
 * from clients get all the device_id, for each device_if go yo devices_socket_map and send message
 */
let clients = {
  wtoken: ["device_id1", "device_id2", "..."],
};
