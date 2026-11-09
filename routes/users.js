import express from 'express'
import { getAllUsers, getCurrentUser } from "../controllers/users.js";
import { authenticateUser, authorizeRoles } from "../middleware/authentication.js";

const router = express.Router();

// Every route in this file needs a logged-in user
router.use(authenticateUser)

router.get('/me', getCurrentUser)
router.get('/', authorizeRoles('admin'), getAllUsers)

export default router;