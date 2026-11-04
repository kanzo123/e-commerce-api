import { StatusCodes } from "http-status-codes";
import { CustomAPIError } from "./custom-api.js";

export class ForbiddenError extends CustomAPIError {
  constructor(message) {
    super(message, StatusCodes.FORBIDDEN);
  }
}