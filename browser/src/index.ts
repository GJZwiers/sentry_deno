export * from "./exports.ts";
console.log("woohoo");

import { Integrations as CoreIntegrations } from "../../core/src/index.ts";
import { getGlobalObject } from "../../utils/src/index.ts";

import * as BrowserIntegrations from "./integrations/index.ts";

let windowIntegrations = {};

// This block is needed to add compatibility with the integrations packages when used with a CDN
const _window = getGlobalObject<Window>();
if (_window.Sentry && _window.Sentry.Integrations) {
  windowIntegrations = _window.Sentry.Integrations;
}

const INTEGRATIONS = {
  ...windowIntegrations,
  ...CoreIntegrations,
  ...BrowserIntegrations,
};

export { INTEGRATIONS as Integrations };
