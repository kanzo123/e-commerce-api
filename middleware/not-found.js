import { NotFoundError } from "../errors/index.js";

export default function notFound() {
  throw new NotFoundError('Router does not exist')
};