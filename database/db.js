const crypto = require("crypto");
let USERS = (() => {
  let users = {};

  return {
    create({ name, email, password }) {
      let user = { name, email, password };
      let _id = crypto.randomBytes(16).toString("hex");
      user._id = _id;
      users[_id] = user;
    },
    findById({ _id }) {
      return users[_id];
    },
    findOne({ name, email, password, _id }) {
      let target_score =
        (name != undefined) +
        (email != undefined) +
        (password != undefined) +
        (_id != undefined);

      for (const key in users) {
        const user = users[key];
        let score = 0;
        if (user.name == name && name) {
          score++;
        }
        if (user.email == email && email) {
          score++;
        }
        if (user.password == password && password) {
          score++;
        }
        if (user._id == _id && _id) {
          score++;
        }
        if (score == target_score) {
          return user;
        }
      }
    },
  };
})();

module.exports = {
  USERS,
};
