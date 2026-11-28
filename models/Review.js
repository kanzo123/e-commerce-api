import mongoose from 'mongoose';

const ReviewSchema = new mongoose.Schema(
  {
    rating: {
      type: Number,
      required: [true, 'Please provide rating'],
      min: [1, 'Rating must be from 1 to 5'],
      max: [5, 'Rating must be from 1 to 5'],
      validate: {
        validator: Number.isInteger,
        message: 'Rating must be a whole number from 1 to 5',
      },
    },
    title: {
      type: String,
      required: [true, 'Please provide review title'],
      trim: true,
      maxlength: [100, 'Title must be at most 100 characters'],
    },
    comment: {
      type: String,
      required: [true, 'Please provide review comment'],
      trim: true,
      maxlength: [1000, 'Comment must be at most 1000 characters'],
    },
    // Who wrote it. Comes from the login token, never from the request body.
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Which product it is about. Comes from the URL, never from the request body.
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
    },
  },
  {timestamps: true}
);

// One review per user per product. The database enforces it, even when two requests arrive together.
// This index also makes "all reviews of one product" fast (it starts with product).
ReviewSchema.index({product: 1, user: 1}, {unique: true});

export default mongoose.model('Review', ReviewSchema);
