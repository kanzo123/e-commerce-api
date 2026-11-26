import { BadRequestError } from '../errors/index.js';

const DEFAULT_LIMIT = 10; // items per page when the client does not say
const MAX_LIMIT = 100; // the most items one page may have
const MAX_PAGE = 100000; // stops silly numbers like page=99999999999999999999

// Reads one value from the query string, like the 2 in ?page=2.
// Missing -> use the fallback.
// Not a whole number from 1 to max -> 400.
function readWholeNumber(value, name, fallback, max) {
  if (value === undefined) {
    return fallback;
  }

  // "1", "25" pass. "0", "-1", "1.5", "abc" and "" do not.
  // A value sent twice (?page=1&page=2) arrives as an array, so it fails the typeof check.
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) {
    throw new BadRequestError(`${name} must be a whole number from 1 to ${max}`);
  }

  const number = Number(value);
  if (number > max) {
    throw new BadRequestError(`${name} must be a whole number from 1 to ${max}`);
  }
  return number;
}

// skip = how many items to jump over before the page starts.
export function getPagination(query) {
  const page = readWholeNumber(query.page, 'page', 1, MAX_PAGE);
  const limit = readWholeNumber(query.limit, 'limit', DEFAULT_LIMIT, MAX_LIMIT);

  return { page, limit, skip: (page - 1) * limit };
}