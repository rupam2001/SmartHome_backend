const mongoose = require("mongoose");

const switch_schema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  id: {
    type: String,
    required: true,
  },
  type: {
    type: String,
  },
  img_url: {
    type: String,
    default:
      "https://us.123rf.com/450wm/jemastock/jemastock1702/jemastock170202722/71262294-lamp-icon-over-white-background-colorful-design-vector-illustration.jpg?ver=6",
  },
});

const schema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "smart_home_users",
    required: true,
  },
  switches: [switch_schema],
  room_id: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: "smart_home_room",
  },
});

const DEVICE = mongoose.model("smart_home_device", schema);
module.exports = DEVICE;
