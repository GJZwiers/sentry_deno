export type {
  Breadcrumb,
  Request,
  SdkInfo,
  Event,
  Exception,
  // eslint-disable-next-line deprecation/deprecation
  Severity,
  SeverityLevel,
  StackFrame,
  Stacktrace,
  Thread,
  User,
} from '../../types/src/index.ts';

export type { BrowserOptions, ReportDialogOptions } from '../../browser/src/index.ts';

export {
  addGlobalEventProcessor,
  addBreadcrumb,
  captureException,
  captureEvent,
  captureMessage,
  configureScope,
  getHubFromCarrier,
  getCurrentHub,
  Hub,
  Scope,
  setContext,
  setExtra,
  setExtras,
  setTag,
  setTags,
  setUser,
  startTransaction,
  makeFetchTransport,
  makeXHRTransport,
  withScope,
} from '../../browser/src/index.ts';

export { BrowserClient } from '../../browser/src/index.ts';
export {
  defaultIntegrations,
  forceLoad,
  init,
  lastEventId,
  onLoad,
  showReportDialog,
  flush,
  close,
  wrap,
} from '../../browser/src/index.ts';
export { SDK_VERSION } from '../../browser/src/index.ts';

import { Integrations as BrowserIntegrations } from '../../browser/src/index.ts';
import { getGlobalObject } from '../../utils/src/index.ts';

import { BrowserTracing } from './browser/index.ts';
import { addExtensionMethods } from './hubextensions.ts';

export { Span } from './span.ts';

let windowIntegrations = {};

// This block is needed to add compatibility with the integrations packages when used with a CDN
const _window = getGlobalObject<Window>();
if (_window.Sentry && _window.Sentry.Integrations) {
  windowIntegrations = _window.Sentry.Integrations;
}

const INTEGRATIONS = {
  ...windowIntegrations,
  ...BrowserIntegrations,
  BrowserTracing,
};

export { INTEGRATIONS as Integrations };
// Though in this case exporting this separately in addition to exporting it as part of `Sentry.Integrations` doesn't
// gain us any bundle size advantage (we're making the bundle here, not the user, and we can't leave anything out of
// ours), it does bring the API for using the integration in line with that recommended for users bundling Sentry
// themselves.
export { BrowserTracing };

// We are patching the global object with our hub extension methods
addExtensionMethods();

export { addExtensionMethods };
