import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "../errors/index.js";
import multer from 'multer';

export default function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)

  let statusCode = StatusCodes.INTERNAL_SERVER_ERROR
  let msg = 'Something went wrong, please try again later'

  if (err instanceof CustomAPIError) {
    statusCode = err.statusCode
    msg = err.message
  } else if (err.name === 'ValidationError') {
    statusCode = StatusCodes.BAD_REQUEST
    msg = Object.values(err.errors).map((item) => item.message).join(', ');
  } else if (err.name === 'CastError') {
    statusCode = StatusCodes.BAD_REQUEST
    msg = `Invalid value for ${err.path}`
  } else if (err.type === 'entity.parse.failed') {
    statusCode = StatusCodes.BAD_REQUEST;
    msg = 'Invalid JSON in request body';
  } else if (err.type === 'entity.too.large') {
    statusCode = StatusCodes.REQUEST_TOO_LONG;
    msg = 'Request body is too large';
  } else if (err instanceof multer.MulterError) {
    // Multer's own limits: file too big, wrong form field name, too many files...
    statusCode =
      err.code === 'LIMIT_FILE_SIZE'
        ? StatusCodes.REQUEST_TOO_LONG
        : StatusCodes.BAD_REQUEST;
    msg = err.message;
  } else if (err.code === 11000) {
    statusCode = StatusCodes.CONFLICT
    msg = `Duplicate value entered for ${Object.keys(err.keyValue).join(', ')}, please choose another value`
  }

  // Only real server bugs are logged; client mistakes are not
  if (statusCode === StatusCodes.INTERNAL_SERVER_ERROR) console.error(err)

  res.status(statusCode).json({ msg })
}