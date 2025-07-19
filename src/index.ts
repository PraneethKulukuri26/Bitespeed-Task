import express from "express";
import identifyRouter from './routes/identify';
import './db'

const app = express();
// Use JSON middleware to parse request bodies
app.use(express.json());

// Root endpoint for health check
app.get("/", (req, res) => {
    res.send("Welcome to Bitespeed backend!");
});

// Register the /identify route
app.use("/identify", identifyRouter);

const PORT = 3000;
// Start the server and listen on the specified port
app.listen(PORT, () => {
    console.log(`Server running on port:${PORT}`);
});