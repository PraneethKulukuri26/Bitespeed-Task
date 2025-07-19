import express from "express";
import './db'

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Welcome to Bitespeed backend!");
});

const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port:${PORT}`);
});