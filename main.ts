//export * as Sentry from "./packages/browser/src/index.ts";

import * as Sentry from "./packages/browser/src/index.ts"; // deno.land/x/sentry_deno/main.ts
import * as log from "https://deno.land/std@0.146.0/log/mod.ts";

Sentry.init({
  dsn:
    "https://663001f997ce4ebe95902b8d2d2e3dba@o1299723.ingest.sentry.io/6532902",
  tracesSampleRate: 1.0,
});

async function testEvent() {
  log.info("Sending test event to Sentry.");

  try {
    throw new Error("Nope.");
  } catch (e) {
    // Sentry.captureException(e);
    Sentry.captureMessage("this is a message");
    await Sentry.flush();
  }
}

await testEvent();
