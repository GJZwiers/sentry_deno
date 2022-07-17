/* eslint-disable max-lines */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import { __DEBUG_BUILD__ } from "../../types/src/globals.ts";

import { getGlobalObject } from "./global.ts";
import { isInstanceOf } from "./is.ts";
import { CONSOLE_LEVELS, logger } from "./logger.ts";
import { fill } from "./object.ts";
import { getFunctionName } from "./stacktrace.ts";
import { supportsNativeFetch } from "./supports.ts";

const global = getGlobalObject<Window>();

export type InstrumentHandlerType =
  | "console"
  | "dom"
  | "fetch"
  | "history"
  | "sentry"
  | "xhr"
  | "error"
  | "unhandledrejection";
export type InstrumentHandlerCallback = (data: any) => void;

/**
 * Instrument native APIs to call handlers that can be used to create breadcrumbs, APM spans etc.
 *  - Console API
 *  - Fetch API
 *  - XHR API
 *  - History API
 *  - DOM API (click/typing)
 *  - Error API
 *  - UnhandledRejection API
 */

const handlers: {
  [key in InstrumentHandlerType]?: InstrumentHandlerCallback[];
} = {};
const instrumented: { [key in InstrumentHandlerType]?: boolean } = {};

/** Instruments given API */
function instrument(type: InstrumentHandlerType): void {
  if (instrumented[type]) {
    return;
  }

  instrumented[type] = true;

  switch (type) {
    case "console":
      instrumentConsole();
      break;
    case "fetch":
      instrumentFetch();
      break;
    case "error":
      instrumentError();
      break;
    case "unhandledrejection":
      instrumentUnhandledRejection();
      break;
    default:
      __DEBUG_BUILD__ && logger.warn("unknown instrumentation type:", type);
      return;
  }
}

/**
 * Add handler that will be called when given type of instrumentation triggers.
 * Use at your own risk, this might break without changelog notice, only used internally.
 * @hidden
 */
export function addInstrumentationHandler(
  type: InstrumentHandlerType,
  callback: InstrumentHandlerCallback,
): void {
  handlers[type] = handlers[type] || [];
  (handlers[type] as InstrumentHandlerCallback[]).push(callback);
  instrument(type);
}

/** JSDoc */
function triggerHandlers(type: InstrumentHandlerType, data: any): void {
  if (!type || !handlers[type]) {
    return;
  }

  for (const handler of handlers[type] || []) {
    try {
      handler(data);
    } catch (e) {
      __DEBUG_BUILD__ &&
        logger.error(
          `Error while triggering instrumentation handler.\nType: ${type}\nName: ${
            getFunctionName(handler)
          }\nError:`,
          e,
        );
    }
  }
}

/** JSDoc */
function instrumentConsole(): void {
  if (!("console" in global)) {
    return;
  }

  CONSOLE_LEVELS.forEach(function (level: string): void {
    if (!(level in console)) {
      return;
    }

    fill(
      console,
      level,
      function (originalConsoleMethod: () => any): Function {
        // parameter list
        // empty tuple type
        return function (...args: any[]): void {
          triggerHandlers("console", { args, level });

          // this fails for some browsers. :(
          if (originalConsoleMethod) {
            originalConsoleMethod.apply(console, args as any);
          }
        };
      },
    );
  });
}

/** JSDoc */
function instrumentFetch(): void {
  if (!supportsNativeFetch()) {
    return;
  }

  fill(global, "fetch", function (originalFetch: () => Promise<Response>): () => void {
    return function (...args: any[]): Promise<Response> {
      const handlerData = {
        args,
        fetchData: {
          method: getFetchMethod(args),
          url: getFetchUrl(args),
        },
        startTimestamp: Date.now(),
      };

      triggerHandlers("fetch", {
        ...handlerData,
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      
      return originalFetch.apply(global, args as any).then(
        (response: Response) => {
          triggerHandlers("fetch", {
            ...handlerData,
            endTimestamp: Date.now(),
            response,
          });
          return response;
        },
        (error: Error) => {
          triggerHandlers("fetch", {
            ...handlerData,
            endTimestamp: Date.now(),
            error,
          });
          // NOTE: If you are a Sentry user, and you are seeing this stack frame,
          //       it means the sentry.javascript SDK caught an error invoking your application code.
          //       This is expected behavior and NOT indicative of a bug with sentry.javascript.
          throw error;
        },
      );
    };
  });
}

/* eslint-disable @typescript-eslint/no-unsafe-member-access */
/** Extract `method` from fetch call arguments */
function getFetchMethod(fetchArgs: any[] = []): string {
  if (
    "Request" in global && isInstanceOf(fetchArgs[0], Request) &&
    fetchArgs[0].method
  ) {
    return String(fetchArgs[0].method).toUpperCase();
  }
  if (fetchArgs[1] && fetchArgs[1].method) {
    return String(fetchArgs[1].method).toUpperCase();
  }
  return "GET";
}

/** Extract `url` from fetch call arguments */
function getFetchUrl(fetchArgs: any[] = []): string {
  if (typeof fetchArgs[0] === "string") {
    return fetchArgs[0];
  }
  if ("Request" in global && isInstanceOf(fetchArgs[0], Request)) {
    return fetchArgs[0].url;
  }
  return String(fetchArgs[0]);
}
/* eslint-enable @typescript-eslint/no-unsafe-member-access */

const debounceDuration = 1000;
let debounceTimerID: number | undefined;
let lastCapturedEvent: Event | undefined;

/**
 * Decide whether the current event should finish the debounce of previously captured one.
 * @param previous previously captured event
 * @param current event to be captured
 */
function shouldShortcircuitPreviousDebounce(
  previous: Event | undefined,
  current: Event,
): boolean {
  // If there was no previous event, it should always be swapped for the new one.
  if (!previous) {
    return true;
  }

  // If both events have different type, then user definitely performed two separate actions. e.g. click + keypress.
  if (previous.type !== current.type) {
    return true;
  }

  try {
    // If both events have the same type, it's still possible that actions were performed on different targets.
    // e.g. 2 clicks on different buttons.
    if (previous.target !== current.target) {
      return true;
    }
  } catch (e) {
    // just accessing `target` property can throw an exception in some rare circumstances
    // see: https://github.com/getsentry/sentry-javascript/issues/838
  }

  // If both events have the same type _and_ same `target` (an element which triggered an event, _not necessarily_
  // to which an event listener was attached), we treat them as the same action, as we want to capture
  // only one breadcrumb. e.g. multiple clicks on the same button, or typing inside a user input box.
  return false;
}


let _oldOnErrorHandler: OnErrorEventHandler = null;
/** JSDoc */
function instrumentError(): void {
  _oldOnErrorHandler = global.onerror;

  // @ts-ignore 
  globalThis.onerror = function (
    msg: any,
    url: any,
    line: any,
    column: any,
    error: any,
  ): boolean {
    triggerHandlers("error", {
      column,
      error,
      line,
      msg,
      url,
    });

    if (_oldOnErrorHandler) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnErrorHandler.apply(this, arguments);
    }

    return false;
  };
}

let _oldOnUnhandledRejectionHandler: ((e: any) => void) | null = null;
/** JSDoc */
function instrumentUnhandledRejection(): void {
  _oldOnUnhandledRejectionHandler = global.onunhandledrejection;

  global.onunhandledrejection = function (e: any): boolean {
    triggerHandlers("unhandledrejection", e);

    if (_oldOnUnhandledRejectionHandler) {
      // eslint-disable-next-line prefer-rest-params
      return _oldOnUnhandledRejectionHandler.apply(this, arguments);
    }

    return true;
  };
  // console.warn("window.onunhandledrejection not implemented.");
}
