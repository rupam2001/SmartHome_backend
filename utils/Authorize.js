const jwt = require("jsonwebtoken");
const SESSIONS = require("../database/models/sessions.model");

const generateJWT = async (tokenData) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        ...tokenData,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30d" },
      (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      }
    );
  });
};

const generateJWTWsToken = async (tokenData) => {
  return new Promise((resolve, reject) => {
    jwt.sign(
      {
        ...tokenData,
      },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30d" },
      (err, token) => {
        if (err) {
          reject(err);
        } else {
          resolve(token);
        }
      }
    );
  });
};
//FORMAT OF TOKEN
//Authorization: Bearer <access_token> <refreshed_token>

const authenticateToken = async (req, res, next) => {
  //v2
  //get auth header value
  const bearerHeader = req.headers["authorization"];
  // check if bearer is undefined
  if (typeof bearerHeader !== "undefined") {
    //split at the space
    const bearer = bearerHeader.split(" ");
    //get token from array
    const bearerToken = bearer[1];
    // const bearerRefreshToken = bearer[2];
    //set token
    req.token = bearerToken;
    //next middleware
    jwt.verify(
      req.token,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, authData) => {
        if (err) {
          res.sendStatus(403);
        } else {
          req.authData = authData;
          next();
        }
      }
    );
  } else {
    res.sendStatus(403);
  }
};

module.exports = { generateJWT, authenticateToken, generateJWTWsToken };
