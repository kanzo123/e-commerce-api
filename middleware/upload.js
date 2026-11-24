import multer from 'multer';
import { BadRequestError } from '../errors/index.js';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

// Multer calls this once for every file in the request, before it reads the file.
// cb(error) stops the request; cb(null, true) lets the file through.
function imageFileFilter(req, file, cb) {
  if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    return cb(new BadRequestError('Only JPEG, PNG and WebP images are allowed'));
  }
  cb(null, true);
}

const upload = multer({
  storage: multer.memoryStorage(), // keep the file in memory (req.file.buffer), never on disk
  fileFilter: imageFileFilter,
  limits: { fileSize: MAX_IMAGE_SIZE },
});

// A ready-to-use middleware: reads ONE file from the form field "image" into req.file.
// It is built once, when this file loads. Express runs it on every request that uses it.
export const uploadImage = upload.single('image');