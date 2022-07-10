import { addExtensionMethods } from './hubextensions.ts';
import * as Integrations from './integrations/index.ts';

export type { RequestInstrumentationOptions } from './browser/index.ts';
export type { SpanStatusType } from './span.ts';

export { Integrations };

// This is already exported as part of `Integrations` above (and for the moment will remain so for
// backwards compatibility), but that interferes with treeshaking, so we also export it separately
// here.
//
// Previously we expected users to import tracing integrations like
//
// import { Integrations } from '@sentry/tracing';
// const instance = new Integrations.BrowserTracing();
//
// This makes the integrations unable to be treeshaken though. To address this, we now have
// this individual export. We now expect users to consume BrowserTracing like so:
//
// import { BrowserTracing } from '@sentry/tracing';
// const instance = new BrowserTracing();
//
// For an example of of the new usage of BrowserTracing, see @sentry/nextjs index.client.ts
export { BrowserTracing, BROWSER_TRACING_INTEGRATION_ID } from './browser/index.ts';

export { Span, spanStatusfromHttpCode } from './span.ts';
// eslint-disable-next-line deprecation/deprecation
export { SpanStatus } from './spanstatus.ts';
export { Transaction } from './transaction.ts';
export { instrumentOutgoingRequests, defaultRequestInstrumentationOptions } from './browser/index.ts';
export { IdleTransaction } from './idletransaction.ts';
export { startIdleTransaction } from './hubextensions.ts';

// Treeshakable guard to remove all code related to tracing
declare const __SENTRY_TRACING__: boolean;

// Guard for tree
if (typeof __SENTRY_TRACING__ === 'undefined' || __SENTRY_TRACING__) {
  // We are patching the global object with our hub extension methods
  addExtensionMethods();
}

export { addExtensionMethods };

export {
  extractTraceparentData,
  getActiveTransaction,
  hasTracingEnabled,
  stripUrlQueryAndFragment,
  TRACEPARENT_REGEXP,
} from './utils.ts';
