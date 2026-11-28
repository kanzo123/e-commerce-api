import Review from '../models/Review.js';
import Product from '../models/Product.js';

// Reads all ratings of one product and saves the result on the product:
// numOfReviews, and averageRating rounded to one decimal (4.3, not 5).
// Call it after every change to a review (create, edit, delete).
export async function recalculateProductRating(productId) {
  // lean() gives plain objects, not full Mongoose documents. We only read the numbers.
  const reviews = await Review.find({product: productId}).select('rating').lean();

  const numOfReviews = reviews.length;
  const total = reviews.reduce((sum, review) => sum + review.rating, 0);
  const averageRating = numOfReviews === 0 ? 0 : Math.round((total / numOfReviews) * 10) / 10;

  // timestamps: false -> a new review is not an edit of the product, so updatedAt stays as it is
  await Product.updateOne(
    {_id: productId},
    {averageRating, numOfReviews},
    {timestamps: false}
  );
}
