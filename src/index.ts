import express from "express";
import identifyRouter from './routes/identify';
import './db'

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Welcome to Bitespeed backend!");
});

app.use("/identify", identifyRouter);

const PORT = 3000;
app.listen(PORT, () => {
    console.log(`Server running on port:${PORT}`);
});