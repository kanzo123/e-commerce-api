import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/authentication.js';
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
} from '../controllers/products.js';

const router = express.Router();

// Built once, when this file loads. Express runs the list in order on every request:
// first the login check (it sets req.user), then the role check (it reads req.user.role).
const managerOrAdmin = [authenticateUser, authorizeRoles('manager', 'admin')];
const adminOnly = [authenticateUser, authorizeRoles('admin')];

router.route('/')
  .get(getAllProducts) // Anyone can browse, even without an account
  .post(...managerOrAdmin, createProduct);

router.route('/:id')
  .get(getSingleProduct) // Anyone can browse, even without an account
  .patch(...managerOrAdmin, updateProduct)
  .delete(...adminOnly, deleteProduct);

export default router;