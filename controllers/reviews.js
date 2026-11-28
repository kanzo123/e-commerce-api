import Review from '../models/Review.js';
import Product from '../models/Product.js';
import {ConflictError, NotFoundError} from '../errors/index.js';
import {getPagination} from '../utils/pagination.js';
import {toReviewResponse} from '../utils/review-response.js';
import {recalculateProductRating} from '../services/product-rating.js';

export async function createReview(req, res) {
  const productId = req.params.id;

  // exists() only asks "is there such a product?" and returns its _id, or null
  if (!(await Product.exists({_id: productId}))) {
    throw new NotFoundError('Product not found');
  }

  // Only these three come from the client. The writer comes from the token, the product from the URL.
  const {rating, title, comment} = req.body;

  let review;
  try {
    review = await Review.create({
      rating,
      title,
      comment,
      user: req.user.userId,
      product: productId,
    });
  } catch (error) {
    // 11000 = the unique index (product + user) says this user already wrote a review
    if (error.code === 11000) {
      throw new ConflictError('You already reviewed this product');
    }
    throw error;
  }

  await recalculateProductRating(productId); // runs only after the review is saved

  await review.populate('user', 'name'); // so the answer shows the writer's name
  res.status(201).json({review: toReviewResponse(review)});
}

export async function getProductReviews(req, res) {
  const productId = req.params.id;
  const {page, limit, skip} = getPagination(req.query);

  if (!(await Product.exists({_id: productId}))) {
    throw new NotFoundError('Product not found');
  }

  const [reviews, total] = await Promise.all([
    Review.find({product: productId})
      .sort({createdAt: -1, _id: -1}) // newest first (_id breaks ties)
      .skip(skip)
      .limit(limit)
      .populate('user', 'name'),
    Review.countDocuments({product: productId}),
  ]);

  res.status(200).json({
    reviews: reviews.map(toReviewResponse),
    count: reviews.length, // how many are on THIS page
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  });
}
