import { v2 as cloudinary } from 'cloudinary';
import { BadRequestError } from '../errors/index.js';

const PRODUCT_IMAGES_FOLDER = 'e-commerce-api/products';

// Sends an image (a Buffer) to Cloudinary. Resolves with the two things we keep:
// the public link (src) and the publicId (the name Cloudinary needs to delete it later).
export function storeImage(buffer) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: PRODUCT_IMAGES_FOLDER,
        resource_type: 'image', // Cloudinary itself rejects files that are not images
        allowed_formats: ['jpg', 'png', 'webp'], // and images in any other format (SVG, GIF, ...)
      },
      // Cloudinary calls this once, when it has answered
      (err, result) => {
        if (err) {
          // Cloudinary answers 400 when it cannot use the file: the client's mistake
          if (err.http_code === 400) {
            return reject(
              new BadRequestError('The file is not a valid JPEG, PNG or WebP image')
            );
          }
          // Anything else (wrong key, network, Cloudinary down) is our problem, not the client's
          // return is mandatory here, otherwise result.secure_url will throw a TypeError
          return reject(new Error(`Cloudinary upload failed: ${err.message}`));
        }
        resolve({ src: result.secure_url, publicId: result.public_id });
      }
    );
    stream.end(buffer); // send the whole file, then close the stream
  });
}

// Deletes one file from Cloudinary. It never throws: a file left behind only wastes
// space, and that must not turn an already successful request into an error.
export async function removeImage(publicId) {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error(`Could not delete Cloudinary image ${publicId}:`, err.message ?? err);
    // notice that we are not using `throw err` here otherwise the user would
    // get a 500 even though the database change (updating the image)
    // already worked. Here we only write a line in the log and the
    // request still succeeds
  }
}