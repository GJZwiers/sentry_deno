> **Note** 
> As of Deno v1.25 it is possible to import the Sentry SDK for Node directly into Deno using npm URLs, e.g. `import * as Sentry from 'npm:@sentry/node'. Therefore I have deprecated this module. You are still welcome to use it, but I will no longer update it.

# Sentry_deno

This is an unofficial port of the Sentry SDK (`@sentry/browser`) to Deno.

```ts
import * as Sentry from "https://deno.land/x/sentry_deno/main.ts";
import * as log from "https://deno.land/std@0.146.0/log/mod.ts";

Sentry.init({
  dsn: "<your-sentry-dsn-here>",
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

[Sentry Docs](https://docs.sentry.io/platforms/javascript/)

Note: Some code in this repository may not yet pass type-checking. Running this module with `deno run --check` may not always succeed.
