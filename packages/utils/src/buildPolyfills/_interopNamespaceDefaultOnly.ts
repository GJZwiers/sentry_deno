import { RequireResult } from './types.ts';

/**
 * Wrap a module in an object, as the value under the key `default`.
 *
 * Adapted from Rollup (https://github.com/rollup/rollup)
 *
 * @param requireResult The result of calling `require` on a module
 * @returns An object containing the key-value pair (`default`, `requireResult`)
 */
export function _interopNamespaceDefaultOnly(requireResult: RequireResult): RequireResult {
  return {
    __proto__: null,
    default: requireResult,
  };
}

// Rollup version
// function _interopNamespaceDefaultOnly(e) {
//   return {
//     __proto__: null,
//     'default': e
//   };
// }
