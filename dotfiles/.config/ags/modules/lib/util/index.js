/*
  ┌─────────────┐
  │ Differences │
  └─────────────┘
  debuglog(...) is a no-op (for now)
  deprecate(...) prints warnings, not errors
  format(...) uses GjsModule format (slightly different output)
  inspect(...) does not produce exact same output and has limited options
  isDeepStrictEqual(...) does not check all the things (for now)

  ┌─────────────┐
  │   Missing   │
  └─────────────┘
  TextDecoder
  TextEncoder
  ALL DEPRECATED METHODS

 */

import _promisify from './src/promisify.js';
import _inspect from './src/inspect.js';
import _isDeepStrictEqual from './src/is-deep-strict-equal.js';


const callbackify = (p) => {
  return (err, ret) => {
    p.then(ret).catch(err);
  };
};

// NOOP for now
const debuglog = () => () => {};

const deprecate = (fn, message) => {
  let warn = true;
  return function () {
    if (warn) warn = (console.warn(message), false);
    return fn.apply(this, arguments);
  };
};

const format = (str, ...info) => imports.format.vprintf(str, info);

// Note: this method is discouraged
//       and GJS supports standard class syntax
const inherits = (constructor, super_) => {
  Object.setPrototypeOf(
    constructor.prototype,
    super_.prototype
  );
  Object.setPrototypeOf(constructor, super_).super_ = super_;
};

const inspect = _inspect;

const isDeepStrictEqual = _isDeepStrictEqual;

const promisify = _promisify;

/**
 * 
 * @param {any} n 
 * @returns {boolean}
 */
const isArray = (n) => {
  return (n instanceof Array);
};

const isDate = (n) => {
  return (n instanceof Date);
};

const isRegExp = (n) => {
  return (n instanceof RegExp);
};

export default {
  callbackify,
  debuglog,
  deprecate,
  format,
  inherits,
  inspect,
  isDeepStrictEqual,
  promisify,
  isArray,
  isDate,
  isRegExp
}
