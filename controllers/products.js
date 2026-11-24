import Product from '../models/Product.js';
import { BadRequestError, NotFoundError } from '../errors/index.js';
import { toProductResponse } from '../utils/product-response.js';
import { removeImage, storeImage } from "../services/images.js";

// The only fields a manager may send. Everything else (image, averageRating,
// numOfReviews, createdBy) is set by the server and never read from the body.
const EDITABLE_FIELDS = [
  'name',
  'price',
  'description',
  'category',
  'company',
  'colors',
  'featured',
  'freeShipping',
  'inventory',
];

function pickEditableFields(body) {
  const fields = {};
  for (const field of EDITABLE_FIELDS) {
    const value = body[field];
    if (value !== undefined) {
      fields[field] = value;
    }
  }
  return fields;
}

export async function createProduct(req, res) {
  // createdBy comes from the login token, never from the body
  const product = await Product.create({
    ...pickEditableFields(req.body),
    createdBy: req.user.userId,
  });

  res.status(201).json({ product: toProductResponse(product) });
}

export async function getAllProducts(req, res) {
  const products = await Product.find({}).sort('-createdAt'); // newest first

  res.status(200).json({
    products: products.map(toProductResponse),
    count: products.length,
  });
}

export async function getSingleProduct(req, res) {
  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.status(200).json({ product: toProductResponse(product) });
}

export async function updateProduct(req, res) {
  // PATCH means partial: change only what was sent
  const updates = pickEditableFields(req.body);

  if (Object.keys(updates).length === 0) {
    throw new BadRequestError(
      `Please provide at least one of: ${EDITABLE_FIELDS.join(', ')}`
    );
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // save() runs the schema rules on the changed fields
  product.set(updates);
  await product.save();

  res.status(200).json({ product: toProductResponse(product) });
}

export async function deleteProduct(req, res) {
  // One call: find it and delete it. Returns the deleted product, or null if there was none.
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  // The product is gone from the database. Now remove its picture from Cloudinary too.
  if (product.image?.publicId) {
    await removeImage(product.image.publicId);
  }

  res.status(200).json({ msg: 'Product removed' });
}

export async function updateProductImage(req, res) {
  // req.file is filled by the upload middleware (routes/products.js)
  if (!req.file) {
    throw new BadRequestError('Please send an image in the form field "image"');
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  const oldPublicId = product.image?.publicId; // undefined if there was no image yet

  // 1. Upload the new file first. If this fails, nothing has changed.
  const newImage = await storeImage(req.file.buffer);

  // 2. Point the product at the new file
  product.image = newImage;
  try {
    await product.save();
  } catch (error) {
    // The product still points at the old file, so the new upload is useless: remove it
    await removeImage(newImage.publicId);
    throw error;
  }

  // 3. Only now remove the old file (the database no longer points at it)
  if (oldPublicId) {
    await removeImage(oldPublicId);
  }

  res.status(200).json({ product: toProductResponse(product) });
}