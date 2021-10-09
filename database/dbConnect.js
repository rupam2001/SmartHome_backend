const mongoose = require("mongoose");
let NUM_RETRIES = 3;

async function DBConnect() {
  if (NUM_RETRIES < 0) {
    throw new Error("Could not connect to database");
  }
  try {
    await mongoose.connect(process.env.MONGODB_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(">> Database connected successfully");
  } catch (err) {
    console.log(">> Unable to connect to Database. Retrying...");
    NUM_RETRIES--;
    DBConnect();
  }
}

module.exports = { connect: DBConnect };
