import { __DEBUG_BUILD__ } from "../../types/src/globals.ts";
import { getGlobalObject } from "./global.ts";
import { logger } from "./logger.ts";

/**
 * Tells whether current environment supports ErrorEvent objects
 * {@link supportsErrorEvent}.
 *
 * @returns Answer to the given question.
 */
export function supportsErrorEvent(): boolean {
  try {
    new ErrorEvent("");
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Tells whether current environment supports DOMError objects
 * {@link supportsDOMError}.
 *
 * @returns Answer to the given question.
 */
export function supportsDOMError(): boolean {
  try {
    // Chrome: VM89:1 Uncaught TypeError: Failed to construct 'DOMError':
    // 1 argument required, but only 0 present.
    // @ts-ignore It really needs 1 argument, not 0.
    new DOMError("");
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Tells whether current environment supports DOMException objects
 * {@link supportsDOMException}.
 *
 * @returns Answer to the given question.
 */
export function supportsDOMException(): boolean {
  try {
    new DOMException("");
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Tells whether current environment supports Fetch API
 * {@link supportsFetch}.
 *
 * @returns Answer to the given question.
 */
export function supportsFetch(): boolean {
  if (!("fetch" in getGlobalObject<Window>())) {
    return false;
  }

  try {
    new Headers();
    new Request("http://www.example.com");
    new Response();
    return true;
  } catch (e) {
    return false;
  }
}
/**
 * isNativeFetch checks if the given function is a native implementation of fetch()
 */
// eslint-disable-next-line @typescript-eslint/ban-types
export function isNativeFetch(func: Function): boolean {
  return func &&
    /^function fetch\(\)\s+\{\s+\[native code\]\s+\}$/.test(func.toString());
}

/**
 * Tells whether current environment supports Fetch API natively
 * {@link supportsNativeFetch}.
 *
 * @returns true if `window.fetch` is natively implemented, false otherwise
 */
export function supportsNativeFetch(): boolean {
  return true;
}

/**
 * Tells whether current environment supports ReportingObserver API
 * {@link supportsReportingObserver}.
 *
 * @returns Answer to the given question.
 */
export function supportsReportingObserver(): boolean {
  return "ReportingObserver" in getGlobalObject();
}

/**
 * Tells whether current environment supports Referrer Policy API
 * {@link supportsReferrerPolicy}.
 *
 * @returns Answer to the given question.
 */
export function supportsReferrerPolicy(): boolean {
  // Despite all stars in the sky saying that Edge supports old draft syntax, aka 'never', 'always', 'origin' and 'default'
  // (see https://caniuse.com/#feat=referrer-policy),
  // it doesn't. And it throws an exception instead of ignoring this parameter...
  // REF: https://github.com/getsentry/raven-js/issues/1233

  if (!supportsFetch()) {
    return false;
  }

  try {
    new Request("_", {
      referrerPolicy: "origin" as ReferrerPolicy,
    });
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Tells whether current environment supports History API
 * {@link supportsHistory}.
 *
 * @returns Answer to the given question.
 */
export function supportsHistory(): boolean {
  return false;
  // NOTE: in Chrome App environment, touching history.pushState, *even inside
  //       a try/catch block*, will cause Chrome to output an error to console.error
  // borrowed from: https://github.com/angular/angular.js/pull/13945/files
  // const global = getGlobalObject<Window>();
  // /* eslint-disable @typescript-eslint/no-unsafe-member-access */
  // // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // const chrome = (global as any).chrome;
  // const isChromePackagedApp = chrome && chrome.app && chrome.app.runtime;
  // /* eslint-enable @typescript-eslint/no-unsafe-member-access */
  // const hasHistoryApi = "history" in global && !!global.history.pushState &&
  //   !!global.history.replaceState;

  // return !isChromePackagedApp && hasHistoryApi;
}
