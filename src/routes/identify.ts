import express from 'express';
import { identifyContactService } from '../services/identifyService';

const router = express.Router();

// POST /identify endpoint to reconcile user identity
router.post("/", (req, res) => {
    // Extract email and phoneNumber from request body
    const { email, phoneNumber } = req.body;
    // Validate input: at least one field must be present
    if (!email && !phoneNumber) {
        return res.status(400).json({ error: "At least one of email or phoneNumber is required." });
    }
    // Call the service to perform identity reconciliation
    const result = identifyContactService(email, phoneNumber);
    // Return the unified identity response
    res.json({ contact: result });
});

export default router;