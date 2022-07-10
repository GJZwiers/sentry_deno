# Sentry_deno

This is an unofficial port of the Sentry SDK for JavaScript to Deno.

```ts
import * as Sentry from "deno.land/x/sentry_deno/main.ts";
import * as log from "https://deno.land/std@0.146.0/log/mod.ts";

Sentry.init({
  dsn:
    "<your-sentry-dsn-here>",
  tracesSampleRate: 1.0,
});

async function testEvent() {
  log.info("Sending test event to Sentry.");

  try {
    throw new Error("Nope.");
  } catch (e) {
    Sentry.captureException(e);
    // Sentry.captureMessage("Gotcha!");
    await Sentry.flush();
  }
}

await testEvent();
```
