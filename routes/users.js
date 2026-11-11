import express from 'express'
import {
  getAllUsers,
  getCurrentUser,
  getSingleUser,
  updateCurrentUser,
} from "../controllers/users.js";
import { authenticateUser, authorizeRoles } from "../middleware/authentication.js";

const router = express.Router();

// Every route in this file needs a logged-in user
router.use(authenticateUser)

router.get('/me', getCurrentUser)
router.patch('/me', updateCurrentUser)
router.get('/', authorizeRoles('admin'), getAllUsers)

// Must stay AFTER '/me', or Express would read the word "me" as an id
router.get('/:id', getSingleUser)

export default router;