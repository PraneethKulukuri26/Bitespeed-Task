import express from 'express';
import db from '../db';

const router = express.Router();

router.post("/", (req,res)=>{
    res.json({message:"hello"});
});

export default router;