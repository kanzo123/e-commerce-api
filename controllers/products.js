import Product from '../models/Product.js';
import { BadRequestError, NotFoundError } from '../errors/index.js';
import { toProductResponse } from '../utils/product-response.js';

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
  // One call: find it and delete it. Returns null if there was no such product.
  const product = await Product.findByIdAndDelete(req.params.id);

  if (!product) {
    throw new NotFoundError('Product not found');
  }

  res.status(200).json({ msg: 'Product removed' });
}