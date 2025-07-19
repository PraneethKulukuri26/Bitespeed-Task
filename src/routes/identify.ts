import express from 'express';
import { identifyContactService } from '../services/identifyService';

const router = express.Router();

router.post("/", (req, res) => {
    const { email, phoneNumber } = req.body;
    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "At least one of email or phoneNumber is required." });
    }
    const result = identifyContactService(email, phoneNumber);
    res.json({ contact: result });
});

export default router;