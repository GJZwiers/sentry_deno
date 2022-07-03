// store references to original, unwrapped built-ins in order to:
// - get a clean, unwrapped setTimeout (so stack traces don't include frames from mocha)
// - make assertions re: wrapped functions
var originalBuiltIns = {
  setTimeout: setTimeout,
  addEventListener: document.addEventListener,
};

var events = [];
var eventHints = [];
var breadcrumbs = [];
var breadcrumbHints = [];

// Oh dear IE10...
var dsn =
  document.location.protocol +
  '//public@' +
  document.location.hostname +
  (document.location.port ? ':' + document.location.port : '') +
  '/1';

function initSDK() {
  Sentry.init({
    dsn: dsn,
    integrations: [new Sentry.Integrations.Dedupe()],
    attachStacktrace: true,
    ignoreErrors: ['ignoreErrorTest'],
    denyUrls: ['foo.js'],
    beforeSend: function (event, eventHint) {
      events.push(event);
      eventHints.push(eventHint);
      return event;
    },
    beforeBreadcrumb: function (breadcrumb, breadcrumbHint) {
      // Filter console logs as we use them for debugging *a lot* and they are not *that* important
      // But allow then if we explicitly say so (for one of integration tests)
      if (breadcrumb.category === 'console' && !window.allowConsoleBreadcrumbs) {
        return null;
      }

      // One of the tests use manually created breadcrumb without eventId and we want to let it through
      if (breadcrumb.category.indexOf('sentry') === 0 && breadcrumb.event_id && !window.allowSentryBreadcrumbs) {
        return null;
      }

      if (
        breadcrumb.type === 'http' &&
        (breadcrumb.data.url.indexOf('test.js') !== -1 || breadcrumb.data.url.indexOf('frame.html') !== -1)
      ) {
        return null;
      }

      // Filter "refresh" like navigation which occurs in Mocha when testing on Android 4
      if (breadcrumb.category === 'navigation' && breadcrumb.data.to === breadcrumb.data.from) {
        return null;
      }

      breadcrumbs.push(breadcrumb);
      breadcrumbHints.push(breadcrumbHint);
      return breadcrumb;
    },
  });
}
