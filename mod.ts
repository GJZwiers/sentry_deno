import * as Sentry from "./browser/src/index.ts";

Sentry.init({
    dsn:
      "https://06ef9282d1214fbea8b930a69a7dcf22@o1299723.ingest.sentry.io/6532902",
    tracesSampleRate: 1.0,
});
  
async function testEvent() {
    // log.info("Sending test event to Sentry.");

    try {
      throw new Error("Nope.");
    } catch (e) {
      Sentry.captureException(e);
      await Sentry.flush();
    }
}
  
await testEvent();
