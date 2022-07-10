export type { ClientClass } from "./sdk.ts";

export {
  addBreadcrumb,
  addGlobalEventProcessor,
  captureEvent,
  captureException,
  captureMessage,
  configureScope,
  getCurrentHub,
  getHubFromCarrier,
  Hub,
  makeMain,
  Scope,
  setContext,
  setExtra,
  setExtras,
  setTag,
  setTags,
  setUser,
  startTransaction,
  withScope,
} from "../../hub/src/index.ts";
export {
  getEnvelopeEndpointWithUrlEncodedAuth,
  getReportDialogEndpoint,
} from "./api.ts";
export { BaseClient } from "./baseclient.ts";
export { initAndBind } from "./sdk.ts";
export { createTransport } from "./transports/base.ts";
export { SDK_VERSION } from "./version.ts";
export { getIntegrationsToSetup } from "./integration.ts";
export { FunctionToString, InboundFilters } from "./integrations/index.ts";

import * as Integrations from "./integrations/index.ts";

export { Integrations };
