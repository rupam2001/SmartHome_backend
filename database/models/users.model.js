const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  phone: {
    type: Number,
    required: true,
  },
  device_id: {
    type: String,
  },
  ws_token: {
    type: String,
  },
  password: {
    type: String,
  },
});

const USERS = mongoose.model("smart_home_users", schema);
module.exports = USERS;
