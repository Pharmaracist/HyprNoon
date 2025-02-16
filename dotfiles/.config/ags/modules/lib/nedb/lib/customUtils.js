import GLib from 'gi://GLib';
import crypto from './../../crypto/index.js';

/**
 * Return a random alphanumerical string of length len
 * There is a very small probability (less than 1/1,000,000) for the length to be less than len
 * (il the base64 conversion yields too many pluses and slashes) but
 * that's not an issue here
 * The probability of a collision is extremely small (need 3*10^12 documents to have one chance in a million of a collision)
 * See http://en.wikipedia.org/wiki/Birthday_problem
 */

function uid (len) {
  const uuid =  GLib.base64_encode(crypto.randomBytes(Math.ceil(Math.max(8, len * 2))))
    ?.replace(/[+\/]/g, '')
    .slice(0, len);
  if (uuid === undefined) { throw Error ('failed to generate uuid, because uuid is undefined'); }
  return uuid;
}


// Interface
export default {uid};