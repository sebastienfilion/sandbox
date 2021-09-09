import { randomUUID } from "./utilities.js";

export const TestsSymbol = Symbol.for("iy-tests");

export const constructComponent = (Component) => {
  if (globalThis.Deno) return new Component();
  else {
    const uuid = `iy-${randomUUID()}`;
    window.customElements.define(uuid, Component);
    return window.document.createElement(uuid);
  }
};

/**
 * Factorizes a testing Spy.
 *
 * ```js
 * const [f, assertF] = factorizeSpy(() => 66);
 * const compose = (f, g, x) => f(g(x));
 * const x = compose(f, (x) => x * 2, 42);
 * assert(x === 66);
 * assert(assertF.called);
 * assert(assertF.callCount === 1);
 * assertF((x) => assert(x === 84));
 * ```
 */
export const factorizeSpy = (f = () => undefined) => {
  const xs = [];
  let i = 0;
  let called = false;
  return [
    (...as) => {
      called = true;
      xs.push(as);
      i++;

      return f(...as);
    },
    Object.defineProperties(
      (g) => {
        xs.forEach((ys, i, zs) => g(...ys, i, zs));
      },
      {
        callCount: {
          get: () => i,
        },
        called: {
          get: () => called,
        },
      },
    ),
  ];
};

export const test = (name, f) => {
  if (globalThis.Deno && f.length === 0) return globalThis.Deno.test(name, f);
  if (!window[TestsSymbol]) {
    window[TestsSymbol] = new Map();
  }
  let tests = window[TestsSymbol].get(window.location.href);
  if (!tests) {
    tests = new Map();
    window[TestsSymbol].set(window.location.href, tests);
  }
  tests.set(f, { name });
};

export const withDom = (f) => {
  if (!window.requestAnimationFrame) {
    window.requestAnimationFrame = (f) => setTimeout(f);
  }

  if (window.HTMLElement) return f;

  return () =>
    Promise.all([ "https://esm.sh/htmlparser2", "https://esm.sh/domhandler" ].map((x) => import(x)))
      .then(([ { Parser }, { DomHandler } ]) => {
        const noop = (_) => undefined;

        const factorizeHTMLElement = (f = (x) => x) => {
          return f(new window.HTMLElement());
        };

        window.HTMLElement = class {
          #state = {};

          constructor() {
            this.observedAttributes = this.constructor.observedAttributes;
          }

          appendChild() {

          }

          attachShadow() {
            this.shadowRoot = new window.HTMLElement();
          }

          dispatchEvent() {

          }

          getAttribute(n) {
            return this.#state[n];
          }

          querySelector() {
            return new window.HTMLElement();
          }

          setAttribute(n, v) {
            if (Reflect.get(this, "observedAttributes")?.includes(n)) {
              this.attributeChangedCallback(n, this.#state[n], v);
            }
            this.#state[n] = v;
          }
        };

        window.document = window.document || {};

        window.document.createElement = (selector) =>
          (selector === "template") ?
            factorizeHTMLElement(
              (t) =>
                Object.defineProperty(
                  t,
                  "content",
                  {
                    enumerable: true,
                    value: {
                      cloneNode: () => new window.HTMLElement()
                    }
                  }
                )
            ) :
            factorizeHTMLElement(
              (t) =>
                Object.defineProperties(
                  t,
                  {
                    "innerHTML": {
                      set(x) {
                        noop(x);
                      },
                    },
                  },
                ),
            );

        const p = f();

        return (p instanceof Promise ? p : Promise.resolve(p))
          .finally(() => {
            window.HTMLElement = undefined;
            window.document = undefined;
          });
      });
};
