const express = require("express");

const cors = require("cors");

const PORT = 5000;

const app = express();
app.use(cors());
app.use(express.json());
require("./database/dbConnect").connect();

app.listen(PORT, () => console.log("Server is running at", PORT));
