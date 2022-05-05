require("./db");
require("express-async-errors");
const express = require("express");
require("dotenv").config();
// const morgan = require("morgan"); //commented because it wont be available in server
const postRouter = require("./routers/post");
const cors = require("cors");

const app = express();
app.use(cors({origin: 'http://localhost:3000'}));
app.use(express.json());
// app.use(morgan("dev")); //commented because it wont be available in server
app.use("/api/post", postRouter);

app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log("Port is listening on " + PORT);
}); //listen to port/backend api
