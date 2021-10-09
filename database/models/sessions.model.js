const mongoose = require("mongoose");
const schema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "smart_home_users",
  },
  refresh_token: {
    type: String,
    required: true,
  },
});

const SESSIONS = mongoose.model("smarthome_session", schema);
module.exports = SESSIONS;
