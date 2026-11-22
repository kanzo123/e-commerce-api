import mongoose from 'mongoose';
import validator from 'validator';

// A wrapper on purpose: validator.isHexColor takes a second argument (options),
// and Array.every would pass the item's position there.
function isColor(value) {
  return validator.isHexColor(value, { require_hashtag: true });
}

// "required" does not reject an empty list, so we check the length here.
// Array.isArray also stops a null (or a non-list) from reaching .length
function isListOfColors(colors) {
  return Array.isArray(colors) && colors.length > 0 && colors.every(isColor);
}

const ProductSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide product name'],
      trim: true,
      maxlength: [100, 'Name must be at most 100 characters'],
    },
    // Money is stored as a whole number of the smallest unit (25999 means 259.99)
    price: {
      type: Number,
      required: [true, 'Please provide product price'],
      min: [0, 'Price cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Price must be a whole number (the smallest unit, like cents)',
      },
    },
    // required rejects null
    description: {
      type: String,
      required: [true, 'Please provide product description'],
      trim: true,
      maxlength: [1000, 'Description must be at most 1000 characters'],
    },
    // Written only by the server (upload route). No default: no image means no value.
    // image built this way is optional and with no default, so it will not be added to the product when calling
    // create unlike fields that have default value
    image: {
      src: String,
      publicId: String, // Cloudinary needs this to delete the file later
    },
    category: {
      type: String,
      required: [true, 'Please provide product category'],
      enum: {
        values: ['office', 'kitchen', 'bedroom'],
        message: '{VALUE} is not a supported category',
      },
    },
    company: {
      type: String,
      required: [true, 'Please provide product company'],
      enum: {
        values: ['ikea', 'liddy', 'marcos'],
        message: '{VALUE} is not a supported company',
      },
    },
    colors: {
      type: [String],
      default: ['#222'],
      validate: {
        validator: isListOfColors,
        message: 'Colors must be a list of hex colors like #ff0000',
      },
    },
    featured: {
      type: Boolean,
      default: false,
    },
    freeShipping: {
      type: Boolean,
      default: false,
    },
    // How many are in stock. No default: whoever creates the product must say.
    inventory: {
      type: Number,
      required: [true, 'Please provide product inventory'],
      min: [0, 'Inventory cannot be negative'],
      validate: {
        validator: Number.isInteger,
        message: 'Inventory must be a whole number',
      },
    },
    // Saved summary of the reviews. Only the server changes these (Part 5).
    averageRating: {
      type: Number,
      default: 0,
    },
    numOfReviews: {
      type: Number,
      default: 0,
    },
    // Who added the product
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.model('Product', ProductSchema);