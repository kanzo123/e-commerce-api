// The only review fields we send back.
// Load the review with .populate('user', 'name') first, or "user" is only an id.
export function toReviewResponse(review) {
  return {
    id: review.id,
    rating: review.rating,
    title: review.title,
    comment: review.comment,
    user: review.user ? {id: review.user.id, name: review.user.name} : null, // null: the account is gone
    product: String(review.product),
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}
