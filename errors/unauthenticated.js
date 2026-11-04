import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api.js";

export class UnauthenticatedError extends CustomAPIError {
  constructor(message) {
    super(message, StatusCodes.UNAUTHORIZED);
  }
}