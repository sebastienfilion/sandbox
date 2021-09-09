import { maybeCall } from "./utilities.js";

export const StateSymbol = Symbol.for("iy-state");

const asyncRender = (element, render, observedAttributes) => (setAttribute) => (event) => {
  if (!observedAttributes) return;

  const state =
    setAttribute(element, Object.assign({}, element[StateSymbol]), event) ||
    {};
  let z = false;

  for (const k in state) {
    const isFromDataset = observedAttributes.includes(`data-${k}`);
    const isObservedAttribute = isFromDataset || observedAttributes.includes(k);

    if (
      isObservedAttribute &&
      element.validateAttribute &&
      !element.validateAttribute(
        { name: (isFromDataset) ? `data-${k}` : k, oldValue: element[StateSymbol][k], value: state[k] },
        element,
        Object.assign({}, element[StateSymbol])
      )
    ) continue;

    element[StateSymbol][k] = state[k];

    if (isFromDataset) {
      element.dataset[k] = state[k];
    } else if (isObservedAttribute) {
      element.setAttribute(k, state[k]);
    } else {
      z = true;
    }
  }

  if (z) {
    render(element, Object.assign({}, element[StateSymbol]));
  }
};

const factorizeFunctionalComponentClass = (TargetConstructor = HTMLElement) => (
  class FunctionalComponent extends TargetConstructor {
    constructor(gs) {
      super();

      for (const g of gs) {
        g(this);
      }

      return this;
    }
  }
);

const parsePascalCaseToSpineCase = (x) =>
  x.split(/(?=[A-Z0-9])/).join('-').toLowerCase();

const parseSpineCaseToCamelCase = (x) =>
  x.replace(/(\-\w)/g, (m) => m[1].toUpperCase())


const parseDatasetToState = (d) =>
  parseSpineCaseToCamelCase(d.replace(/^data-/, ""));

const wrapRender = (render) => {
  const ms = new Map();
  const rs = new Map();

  return (e, s, options) => {
    let ss = ms.get(e);
    let r = rs.get(e);
    if (!ss) {
      ss = [];
      ms.set(e, ss);
    }
    if (!r) {
      r = false;
      rs.set(e, r);
    }
    ss.push(s);
    if (!r) {
      rs.set(e, true);

      window.requestAnimationFrame(() => {
        const ss = ms.get(e);
        const state = Object.assign({}, ...ss);
        const t = performance.now();

        render(e, state);
        e.dispatchEvent(
          new CustomEvent("render", { detail: { state, time: performance.now() - t, ...options } })
        );

        ss.length = 0;
        rs.set(e, false);
      });
    }
  };
};

/**
 * Factorizes a component given a render function, a state and an arbitrary number of composable functions.
 *
 * The first argument is a render function. The function is called once when the component is connected to the DOM.
 * The render function should accept two parameters, the first one is the element that is being rendered.
 * The second parameter is the current state that should be used to render the component.
 *
 * The second argument to the `factorizeComponent` function is an object that will be used as the inital state.
 *
 * `State :: Object`
 * `R :: (DOMElement, State) -> void`
 * `F :: (((Component, R, State) -> C) -> void, ((DOMElement) -> E) -> void) -> void`
 * `factorizeComponent :: ((DOMElement, State) -> void, State, [...F]) -> Component`
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (e { title }) => {
 *       const h1 = window.document.createElement("h1");
 *       h1.textContent = title;
 *       e.appendChild(e);
 *     },
 *     { title: "Bluebird" }
 *   );
 * );
 * ```
 *
 * ## Higher-order-function
 *
 * The `factorizeComponent` also accepts an arbitrary amount of functions as arguments.
 * Those higher-order-functions should accept 2 parameters; the first one is named `factorize`, the second is named
 * `construct`.
 *
 * Both HOFs accepts a function that will be called, respectively, at the factory phase, before the component is
 * initialize, and, at the construction phase, when the component is being instantiated.
 *
 * The factorize function has three parameters; the first parameter is a Component constructor;
 * the second parameter is the render function which can be called to queue a render request;
 * the third parameter is the initial state.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     render,
 *     state,
 *     (factorize, construct) => {
 *       factorize((Component, render) => {
 *         Object.defineProperty(
 *           Component.prototype,
 *           "forceRender",
 *           {
 *             configurable: false,
 *             enumerable: false,
 *             value() {
 *               render(this);
 *             },
 *           }
 *         );
 *
 *         return Component;
 *       });
 *       construct((element) => {
 *         element.dataset.forceRender = true;
 *       });
 *     }
 *   );
 * );
 * ```
 */
export const factorizeComponent = (render, state, ...fs) => {
  const constructors = [], factories = [];
  const FunctionalComponent = factorizeFunctionalComponentClass();
  const Component = function () {
    return Reflect.construct(
      FunctionalComponent,
      [
        [
          (e) => {
            e[StateSymbol] = Object.assign({}, state);
          },
          ...constructors
        ]
      ],
      new.target || FunctionalComponent,
    );
  };

  Object.setPrototypeOf(Component.prototype, FunctionalComponent.prototype);
  Object.setPrototypeOf(Component, FunctionalComponent);

  Object.defineProperty(
    Component.prototype,
    "state",
    {
      get() {
        return this[StateSymbol];
      },
      set() {
      },
    }
  );

  const _render = wrapRender(render);

  for (const f of fs) {
    f(
      (factorize) => factories.push(factorize),
      (construct) => constructors.push(construct),
    );
  }

  for (const h of factories) {
    h(Component, _render, state);
  }

  const _connectedCallback = Component.prototype.connectedCallback;

  Object.defineProperty(
    Component.prototype,
    "connectedCallback",
    {
      configurable: true,
      enumerable: false,
      value() {
        return maybeCall(_connectedCallback, this)
          .then(() => {
            _render(this, Object.assign({}, this[StateSymbol]), { name: "connectedCallback", data: {} });
          });
      }
    }
  );

  return Component;
};

/**
 * Fetches a HTML file from a server and returns the Promise of a `<template>`.
 *
 * ```js
 * const element = window.document.querySelector("div");
 * fetchTemplate("/demo.html")()
 *   .then((template) => {
 *     element.appendChild(template.content.cloneNode(true));
 *   });
 * ```
 */
export const fetchTemplate = (templatePath) => () =>
  fetch(templatePath)
    .then((response) => response.text().then((t) => {
      if (response.ok) {
        return t
      } else {
        return Promise.reject(new Error(t));
      }
    }))
    .then((html) => {
      const e = window.document.createElement("template");
      e.innerHTML = html;

      return e;
    });


/**
 * Creates a reactive lifecycle with a simple state reducer.
 * When a user or a program sets an attribute of the component, the validation function is called which decides if the
 * component should be rendered again.
 *
 * The `useAttributes` function accepts a function to validate an observed attributes value and create a new state. The
 * validation function should have three parameters. The first one is an object representing the attribute that was
 * changed, the second is the element that is affected and the last is the current state of the element. The validation
 * function shoudl return a state fragment or false to cancel the render.
 *
 * The hook function also takes a map object for all of the attributes to observe.The value is a function to transform
 * the value before the validation function called. If not transformation is needed, just pass the identity function.
 * `(x) => x`
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (element, { value }) => {
 *      const span = element.querySelector("span");
 *      span.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useAttributes(
 *       ({ oldValue, value }) => (oldValue !== value && value >= 0) ? ({ value }) : false,
 *       {
 *         value: Number
 *       }
 *     ),
 *     (factorize) => {
 *       factorize((Component) => {
 *         Object.defineProperty(
 *           Component.prototype,
 *           "connectedCallback",
 *           {
 *             enumerable: true,
 *             value() {
 *               console.log("hello");
 *               const span = window.document.createElement("span");
 *               const button = window.document.createElement("button");
 *               button.textContent = "Add";
 *               this.appendChild(span);
 *               this.appendChild(button);
 *               button.addEventListener("click", () => {
 *                 const v = this.getAttribute("value");
 *                 this.setAttribute("value", String(Number(v) + 1));
 *               });
 *             },
 *           },
 *         );
 *         return Component;
 *       });
 *     }
 *   )
 * );
 * ```
 */
export const useAttributes = (validateAttribute, map) => (factorize) => {
  factorize((Component, render) => {
    const _attributeChangedCallback = Component.prototype.attributeChangedCallback;
    const _connectedCallback = Component.prototype.connectedCallback;
    const observedAttributes = Object.keys(map);
    Object.defineProperty(
      Component,
      "observedAttributes",
      {
        enumerable: true,
        value: observedAttributes,
      },
    );
    Object.defineProperties(
      Component.prototype,
      {
        attributeChangedCallback: {
          configurable: true,
          enumerable: true,
          value(name, oldValue, value) {
            let state = validateAttribute(
              {
                name: name,
                oldValue: Reflect.has(map, name)
                  ? map[name](oldValue)
                  : oldValue,
                value: Reflect.has(map, name)
                  ? map[name](value)
                  : value,
              },
              this,
              Object.assign({}, this[StateSymbol]),
            );

            this.dispatchEvent(
              new CustomEvent(
                "change:attribute",
                {
                  detail: {
                    attribute: { name, oldValue, value },
                    state
                  }
                })
            );
            if (state) {
              if (state === true) {
                const z = parseDatasetToState(name);
                this[StateSymbol][z] = Reflect.has(map, name) ? map[name](value) : value;
              } else {
                for (const k in state) {
                  if (!state.hasOwnProperty(k)) continue;

                  const z = parseDatasetToState(k);
                  this[StateSymbol][z] = state[k];
                }
              }
              render(this, Object.assign({}, this[StateSymbol]), { name: "attributes", data: { name, oldValue, value } });
            }

            _attributeChangedCallback && _attributeChangedCallback.call(this, name, oldValue, value);
          }
        },
        connectedCallback: {
          configurable: true,
          enumerable: true,
          value() {

            return maybeCall(_connectedCallback, this)
              .then(() => {
                for (const key of observedAttributes) {
                  const normalizedKey = parseDatasetToState(key);
                  const value = map[normalizedKey]
                    ? map[normalizedKey](
                      this.getAttribute(key),
                    )
                    : this.getAttribute(key);
                  if (value) this[StateSymbol][normalizedKey] = value;
                }

              });
          }
        },
        validateAttribute: {
          configurable: true,
          enumerable: false,
          value: validateAttribute
        }
      }
    )
  });
}

/**
 * Hooks into the component's lifecycle. Learn more about [lifecycle callbacks on MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks)
 *
 * The function accepts as argument an object of function to hook into one of the following callback:
 * `connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` and `adoptedCallback`.
 *
 * Each callback function will be called when appropriate with the element, the relevant options and a `asyncRender`
 * function as arguments.
 * The `asyncRender` function can be called at any moment with a "state setter" function. This returns a thunk function
 * that may accept an argument. When the thunk function is called, the "state setter" function is called with the
 * current element and state as argument. This function should return a state fragment or false. The state fragment is
 * then merged with the current state and set the relevant component attributes. See `useAttribute`.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (element, { value }) => {
 *       const span = element.querySelector("span");
 *       span.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useCallbacks({
 *       connectedCallback: (element, render) => {
 *         const span = window.document.createElement("span");
 *         const button = window.document.createElement("button");
 *         button.textContent = "Add";
 *         element.appendChild(span);
 *         element.appendChild(button);
 *         button.addEventListener("click", render((e, { value }) => ({ value: ++value })));
 *       }
 *     }),
 *     (factorize) => {
 *       factorize((Component, render) => {
 *         Object.defineProperty(
 *           Component,
 *           "observedAttributes",
 *           {
 *             enumerable: true,
 *             value: ["value"],
 *           },
 *         );
 *
 *         Object.defineProperty(
 *           Component.prototype,
 *           "attributeChangedCallback",
 *           {
 *             enumerable: true,
 *             value(name, oldValue, value) {
 *               this[StateSymbol][name] = value;
 *               render(this, Object.assign({}, this[StateSymbol]));
 *             },
 *           },
 *         );
 *
 *         return Component;
 *       });
 *     }
 *   )
 * );
 * ```
 */
export const useCallbacks = (callbacks) => (factorize) => {
  factorize((Component, render) => {
    for (const k in callbacks) {
      if (!callbacks.hasOwnProperty(k)) continue;
      const f = callbacks[k];
      if (!f) continue;
      const g = Component.prototype[k];

      Object.defineProperty(
        Component.prototype,
        k,
        {
          configurable: true,
          enumerable: true,
          value(...xs) {

            return maybeCall(g, this, ...xs)
              .then(() => f(this, ...xs, asyncRender(this, render, Component.observedAttributes || [])));
          }
        }
      );
    }

    return Component;
  });
};

export const useProperties = (ps) => (factorize) => {
  factorize((Component, render) => {
    Object.defineProperties(
      Component.prototype,
      ps
        .reduce(
          (o, name) => Object.defineProperty(
            o,
            name,
            {
              enumerable: true,
              value: {
                get() {
                  return this[StateSymbol][name]
                },
                set(v) {
                  this[StateSymbol][name] = v
                  render(this, Object.assign({}, this[StateSymbol]));
                }
              },
              writable: true,
            }
          ),
          {}
        )
    )
  });
};

/**
 * Attaches a shadow root to every instance of the Component.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (element, { value }) => {
 *       const span = element.querySelector("span");
 *       span.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useShadow({ mode: "open" })
 *   )
 * );
 * ```
 */
export const useShadow = (options = { mode: "open" }) => (_, contruct) => {
  contruct((e) => e.attachShadow(options));
};

/**
 * Automatically appends a clone of a template to the element or the element's shadow root.
 *
 * The function accepts a function that must return a template instance or a Promise of a template instance.
 * Optionally, the function can also be passed an object as the second argument that is used to define
 * children that would be often queried during the render phase.
 * The object's values must be a function that will accept the component instance as the first parameter
 * and return a child element or node list.
 * The elements will be accessible as the `elements` property of the Component instance element.
 *
 * ```js
 * window.customElements.define(
 *   "iy-demo",
 *   factorizeComponent(
 *     (e, { value }) => {
 *       e.elements.number.textContent = String(value);
 *     },
 *     { value: 0 },
 *     useShadow({ mode: "open" }),
 *     useTemplate(
 *       () => {
 *         const t = window.document.createElement("template");
 *         t.innerHTML = `<span>0</span><button>Add</button>`
 *
 *         return t;
 *       },
 *       {
 *         number: (e) => e.shadowRoot.querySelector("span"),
 *         addButton: (e) => e.shadowRoot.querySelector("button")
 *       }
 *     )
 *   ),
 * );
 * ```
 */
export const useTemplate = (f, map) => (factorize) => {
  factorize((Component) => {
    const _connectedCallback = Component.prototype.connectedCallback;
    Object.defineProperty(
      Component.prototype,
      "connectedCallback",
      {
        configurable: true,
        enumerable: true,
        value() {

          return maybeCall(_connectedCallback, this)
            .then(() => maybeCall(f))
            .then((template) => {
              (this.shadowRoot || this).appendChild(
                template.content.cloneNode(true),
              );

              if (map) {
                Object.defineProperty(
                  this,
                  "elements",
                  {
                    enumerable: false,
                    value: {}
                  }
                );

                for (const k in map) {
                  if (!map.hasOwnProperty(k)) continue;
                  this.elements[k] = map[k](this);
                }

                Object.freeze(this.elements);
              }
            });
        }
      }
    );
  });
};
