const mongoose = require("mongoose");

mongoose
  .connect(process.env.MONGO_URL) //replace with 'mongodb://127.0.0.1:27017/fsrnblog' if run locally, replace device ip
  .then(() => console.log('db connected'))
  .catch((err) => console.log("db connection failed: ", err.message || err));
