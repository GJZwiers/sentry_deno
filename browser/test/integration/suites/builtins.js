describe('wrapped built-ins', function () {
  it('should capture exceptions from event listeners', function () {
    return runInSandbox(sandbox, function () {
      var div = document.createElement('div');
      document.body.appendChild(div);
      div.addEventListener(
        'click',
        function () {
          window.element = div;
          window.context = this;
          foo();
        },
        false
      );
      var click = new MouseEvent('click');
      div.dispatchEvent(click);
    }).then(function (summary) {
      // Make sure we preserve the correct context
      assert.equal(summary.window.element, summary.window.context);
      delete summary.window.element;
      delete summary.window.context;
      assert.match(summary.events[0].exception.values[0].value, /baz/);
    });
  });

  it('should transparently remove event listeners from wrapped functions', function () {
    return runInSandbox(sandbox, function () {
      var div = document.createElement('div');
      document.body.appendChild(div);
      var fooFn = function () {
        foo();
      };
      var barFn = function () {
        bar();
      };
      div.addEventListener('click', fooFn);
      div.addEventListener('click', barFn);
      div.removeEventListener('click', barFn);
      div.dispatchEvent(new MouseEvent('click'));
    }).then(function (summary) {
      assert.lengthOf(summary.events, 1);
    });
  });

  it('should remove the original callback if it was registered before Sentry initialized (w. original method)', function () {
    return runInSandbox(sandbox, function () {
      var div = document.createElement('div');
      document.body.appendChild(div);
      window.capturedCall = false;
      var captureFn = function () {
        window.capturedCall = true;
      };
      // Use original addEventListener to simulate non-wrapped behavior (callback is attached without __sentry_wrapped__)
      window.originalBuiltIns.addEventListener.call(div, 'click', captureFn);
      // Then attach the same callback again, but with already wrapped method
      div.addEventListener('click', captureFn);
      div.removeEventListener('click', captureFn);
      div.dispatchEvent(new MouseEvent('click'));
    }).then(function (summary) {
      assert.equal(summary.window.capturedCall, false);
      delete summary.window.capturedCalls;
    });
  });

  it('should capture exceptions inside setTimeout', function () {
    return runInSandbox(sandbox, function () {
      setTimeout(function () {
        foo();
      });
    }).then(function (summary) {
      assert.match(summary.events[0].exception.values[0].value, /baz/);
    });
  });

  it('should capture exceptions inside setInterval', function () {
    return runInSandbox(sandbox, function () {
      var exceptionInterval = setInterval(function () {
        clearInterval(exceptionInterval);
        foo();
      }, 0);
    }).then(function (summary) {
      assert.match(summary.events[0].exception.values[0].value, /baz/);
    });
  });

  describe('requestAnimationFrame', function () {
    it('should capture exceptions inside callback', function () {
      // needs to be visible or requestAnimationFrame won't ever fire
      sandbox.style.display = 'block';

      return runInSandbox(sandbox, { manual: true }, function () {
        requestAnimationFrame(function () {
          window.finalizeManualTest();
          foo();
        });
      }).then(function (summary) {
        assert.match(summary.events[0].exception.values[0].value, /baz/);
      });
    });

    it('wrapped callback should preserve correct context - window (not-bound)', function () {
      // needs to be visible or requestAnimationFrame won't ever fire
      sandbox.style.display = 'block';
      return runInSandbox(sandbox, { manual: true }, function () {
        requestAnimationFrame(function () {
          window.capturedCtx = this;
          window.finalizeManualTest();
        });
      }).then(function (summary) {
        assert.strictEqual(summary.window.capturedCtx, summary.window);
        delete summary.window.capturedCtx;
      });
    });

    it('wrapped callback should preserve correct context - class bound method', function () {
      // needs to be visible or requestAnimationFrame won't ever fire
      sandbox.style.display = 'block';
      return runInSandbox(sandbox, { manual: true }, function () {
        // TypeScript-transpiled class syntax
        var Foo = (function () {
          function Foo() {
            var _this = this;
            this.magicNumber = 42;
            this.getThis = function () {
              window.capturedCtx = _this;
              window.finalizeManualTest();
            };
          }
          return Foo;
        })();
        var foo = new Foo();
        requestAnimationFrame(foo.getThis);
      }).then(function (summary) {
        assert.strictEqual(summary.window.capturedCtx.magicNumber, 42);
        delete summary.window.capturedCtx;
      });
    });

    it('wrapped callback should preserve correct context - `bind` bound method', function () {
      // needs to be visible or requestAnimationFrame won't ever fire
      sandbox.style.display = 'block';
      return runInSandbox(sandbox, { manual: true }, function () {
        function foo() {
          window.capturedCtx = this;
          window.finalizeManualTest();
        }
        requestAnimationFrame(foo.bind({ magicNumber: 42 }));
      }).then(function (summary) {
        assert.strictEqual(summary.window.capturedCtx.magicNumber, 42);
        delete summary.window.capturedCtx;
      });
    });
  });

  it('should capture exceptions from XMLHttpRequest event handlers (e.g. onreadystatechange)', function () {
    return runInSandbox(sandbox, { manual: true }, function () {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/base/subjects/example.json');
      // intentionally assign event handlers *after* open, since this is what jQuery does
      xhr.onreadystatechange = function wat() {
        window.finalizeManualTest();
        // replace onreadystatechange with no-op so exception doesn't
        // fire more than once as XHR changes loading state
        xhr.onreadystatechange = function () {};
        foo();
      };
      xhr.send();
    }).then(function (summary) {
      assert.match(summary.events[0].exception.values[0].value, /baz/);

      if (IS_LOADER) {
        assert.ok(summary.events[0].exception.values[0].mechanism);
      } else {
        var handler = summary.events[0].exception.values[0].mechanism.data.handler;
        delete summary.events[0].exception.values[0].mechanism.data.handler;

        if (summary.window.canReadFunctionName()) {
          assert.equal(handler, 'wat');
        } else {
          assert.equal(handler, '<anonymous>');
        }

        assert.deepEqual(summary.events[0].exception.values[0].mechanism, {
          type: 'instrument',
          handled: true,
          data: {
            function: 'onreadystatechange',
          },
        });
      }
    });
  });

  it('should not call XMLHttpRequest onreadystatechange more than once per state', function () {
    return runInSandbox(sandbox, { manual: true }, function () {
      window.calls = {};
      var xhr = new XMLHttpRequest();
      xhr.open('GET', '/base/subjects/example.json');
      xhr.onreadystatechange = function wat() {
        window.calls[xhr.readyState] = window.calls[xhr.readyState] ? window.calls[xhr.readyState] + 1 : 1;
        if (xhr.readyState === 4) {
          window.finalizeManualTest();
        }
      };
      xhr.send();
    }).then(function (summary) {
      for (var state in summary.window.calls) {
        assert.equal(summary.window.calls[state], 1);
      }
      // IE Triggers all states (1-4), including 1 (open), despite it being assigned before
      // the `onreadystatechange` handler.
      assert.isAtLeast(Object.keys(summary.window.calls).length, 3);
      assert.isAtMost(Object.keys(summary.window.calls).length, 4);
      delete summary.window.calls;
    });
  });

  it(optional("should capture built-in's mechanism type as instrument", IS_LOADER), function () {
    return runInSandbox(sandbox, function () {
      setTimeout(function () {
        foo();
      });
    }).then(function (summary) {
      if (IS_LOADER) {
        // The async loader doesn't wrap setTimeout
        // so we don't receive the full mechanism
        assert.ok(summary.events[0].exception.values[0].mechanism);
      } else {
        var fn = summary.events[0].exception.values[0].mechanism.data.function;
        delete summary.events[0].exception.values[0].mechanism.data;

        if (summary.window.canReadFunctionName()) {
          assert.equal(fn, 'setTimeout');
        } else {
          assert.equal(fn, '<anonymous>');
        }

        assert.deepEqual(summary.events[0].exception.values[0].mechanism, {
          type: 'instrument',
          handled: true,
        });
      }
    });
  });

  it(optional("should capture built-in's handlers fn name in mechanism data", IS_LOADER), function () {
    return runInSandbox(sandbox, function () {
      var div = document.createElement('div');
      document.body.appendChild(div);
      div.addEventListener(
        'click',
        function namedFunction() {
          foo();
        },
        false
      );
      var click = new MouseEvent('click');
      div.dispatchEvent(click);
    }).then(function (summary) {
      if (IS_LOADER) {
        // The async loader doesn't wrap addEventListener
        // so we don't receive the full mechanism
        assert.ok(summary.events[0].exception.values[0].mechanism);
      } else {
        var handler = summary.events[0].exception.values[0].mechanism.data.handler;
        delete summary.events[0].exception.values[0].mechanism.data.handler;
        var target = summary.events[0].exception.values[0].mechanism.data.target;
        delete summary.events[0].exception.values[0].mechanism.data.target;

        if (summary.window.canReadFunctionName()) {
          assert.equal(handler, 'namedFunction');
        } else {
          assert.equal(handler, '<anonymous>');
        }

        // IE vs. Rest of the world
        assert.oneOf(target, ['Node', 'EventTarget']);
        assert.deepEqual(summary.events[0].exception.values[0].mechanism, {
          type: 'instrument',
          handled: true,
          data: {
            function: 'addEventListener',
          },
        });
      }
    });
  });

  it(
    optional('should fallback to <anonymous> fn name in mechanism data if one is unavailable', IS_LOADER),
    function () {
      return runInSandbox(sandbox, function () {
        var div = document.createElement('div');
        document.body.appendChild(div);
        div.addEventListener(
          'click',
          function () {
            foo();
          },
          false
        );
        var click = new MouseEvent('click');
        div.dispatchEvent(click);
      }).then(function (summary) {
        if (IS_LOADER) {
          // The async loader doesn't wrap
          assert.ok(summary.events[0].exception.values[0].mechanism);
        } else {
          var target = summary.events[0].exception.values[0].mechanism.data.target;
          delete summary.events[0].exception.values[0].mechanism.data.target;

          // IE vs. Rest of the world
          assert.oneOf(target, ['Node', 'EventTarget']);
          assert.deepEqual(summary.events[0].exception.values[0].mechanism, {
            type: 'instrument',
            handled: true,
            data: {
              function: 'addEventListener',
              handler: '<anonymous>',
            },
          });
        }
      });
    }
  );
});
