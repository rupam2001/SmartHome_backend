const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  user_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "smart_home_users",
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  tags:[
    {
      type: String
    }
  ]
});

const ROOM = mongoose.model("smart_home_room", schema);
module.exports = ROOM;
