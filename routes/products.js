import express from 'express';
import { authenticateUser, authorizeRoles } from '../middleware/authentication.js';
import { uploadImage } from "../middleware/upload.js";
import {
  createProduct,
  deleteProduct,
  getAllProducts,
  getSingleProduct,
  updateProduct,
  updateProductImage,
  deleteProductImage,
} from '../controllers/products.js';
import { createReview, getProductReviews } from "../controllers/reviews.js";

const router = express.Router();

// Built once, when this file loads. Express runs the list in order on every request:
// first the login check (it sets req.user), then the role check (it reads req.user.role).
const managerOrAdmin = [authenticateUser, authorizeRoles('manager', 'admin')];
const adminOnly = [authenticateUser, authorizeRoles('admin')];

router.route('/')
  .get(getAllProducts) // Anyone can browse, even without an account
  .post(...managerOrAdmin, createProduct);

// Order matters: first who you are, then your role, and only then is the file read
router.route('/:id/image')
  .patch(...managerOrAdmin, uploadImage, updateProductImage)
  .delete(...managerOrAdmin, deleteProductImage);

// Reviews of one product. Reading is public. Writing needs a login (any role).
router.route('/:id/reviews')
  .get(getProductReviews)
  .post(authenticateUser, createReview)

router.route('/:id')
  .get(getSingleProduct) // Anyone can browse, even without an account
  .patch(...managerOrAdmin, updateProduct)
  .delete(...adminOnly, deleteProduct);

export default router;