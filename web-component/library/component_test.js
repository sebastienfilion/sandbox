import {
  assert,
  assertEquals,
} from "./asserts.js";
import {
  StateSymbol,
  factorizeComponent,
  useAttributes,
  useCallbacks,
  useShadow,
  useTemplate,
} from "./component.js";
import { constructComponent, factorizeSpy, test, withDom } from "./testing.js";
import { deferUntil, deferUntilNextFrame } from "./utilities.js";

test(
  "factorizeComponent: Render function is called once",
  withDom(() => {
    const [renderSpy, assertRenderSpy] = factorizeSpy();
    const Component = factorizeComponent(renderSpy, { active: false });

    const e = constructComponent(Component);
    e.connectedCallback();

    return deferUntil(null, () => assertRenderSpy.called)
      .then(() => {
        assert(assertRenderSpy.callCount === 1);
        assertRenderSpy((e, state) => {
          assertEquals(e[StateSymbol], state);
        });
      });
  })
);

test(
  "factorizeComponent: Add a factory",
  withDom(() => {
    const [renderSpy, assertRenderSpy] = factorizeSpy();
    const Component = factorizeComponent(
      renderSpy,
      { active: false },
      (factorize) => {
        factorize((Component, render) => {
          const _connectedCallback = Component.prototype.connectedCallback;

          Object.defineProperty(
            Component.prototype,
            "connectedCallback",
            {
              configurable: true,
              enumerable: true,
              value() {
                _connectedCallback && _connectedCallback();
                setTimeout(() => render(this, { active: true }), 500);
              }
            }
          );
        });
      }
    );

    const e = constructComponent(Component);
    e.connectedCallback();

    return deferUntil(null, () => assertRenderSpy.callCount === 2)
      .then(() => {
        assertRenderSpy((e, state, i) => {
          if (i === 0) {
            assertEquals(state, { active: false });
          } else {
            assertEquals(state, { active: true });
          }
        });
      });
  })
);

test(
  "factorizeComponent: Add a contructor",
  withDom(() => {
    const Component = factorizeComponent(
      () => {},
      { active: false },
      (_, construct) => {
        construct((e) => {
          e.attachShadow({ mode: "open" });
        });
      }
    );

    const e = constructComponent(Component);
    assert(e.shadowRoot);
  })
);

test(
  "useAttributes",
  withDom(() => {
    const [attributeMapSpy, assertAttributeMapSpy] = factorizeSpy(Number);
    const [validateAttributeSpy, assertValidateAttributeSpy] = factorizeSpy(
      ({ oldValue, value }) => (oldValue !== value && value >= 0)
    );
    const [renderSpy, assertRenderSpy] = factorizeSpy();

    const Component = factorizeComponent(renderSpy, { value: 42 });

    useAttributes(
      validateAttributeSpy,
      {
        value: attributeMapSpy
      }
    )((f) => f(Component, renderSpy));

    const e = constructComponent(Component);

    assertEquals(Component.observedAttributes, ["value"]);

    e.setAttribute("value", "24");

    return deferUntilNextFrame()
      .then(() => {
        assert(assertAttributeMapSpy.called);
        assertAttributeMapSpy((x) => {
          if (!x) return;
          assert(x === "24");
        });
        assert(assertValidateAttributeSpy.called);
        assertValidateAttributeSpy(({ name, value }) => {
          assert(name === "value");
          assert(value === 24);
        });
        assert(assertRenderSpy.called);
        assertRenderSpy((_, { value }) => {
          assert(value === 24);
        });
      });
  })
);

test(
  "useCallbacks",
  withDom(() => {
    const callback = (e, ...xs) => {
      const render = xs[xs.length - 1];
      render((_, { count }) => ({ active: true, count: ++count }))();
    };
    const [adoptedCallbackSpy, assertAdoptedCallbackSpy] = factorizeSpy(callback);
    const [attributeChangedCallbackSpy, assertAttributeChangedCallbackSpy] = factorizeSpy(callback);
    const [connectedCallbackSpy, assertConnectedCallbackSpy] = factorizeSpy(callback);
    const [disconnectedCallbackSpy, assertDisconnectedCallbackSpy] = factorizeSpy(callback);
    const [renderSpy, assertRenderSpy] = factorizeSpy();

    const Component = factorizeComponent(renderSpy, { active: false, count: 0 });

    useCallbacks({
      adoptedCallback: adoptedCallbackSpy,
      attributeChangedCallback: attributeChangedCallbackSpy,
      connectedCallback: connectedCallbackSpy,
      disconnectedCallback: disconnectedCallbackSpy
    })((f) => f(Component, renderSpy));

    assert(Component.prototype.adoptedCallback);
    assert(Component.prototype.attributeChangedCallback);
    assert(Component.prototype.connectedCallback);
    assert(Component.prototype.disconnectedCallback);

    const e = constructComponent(Component);

    e.adoptedCallback();

    e.attributeChangedCallback("value", null, "42");

    e.connectedCallback();

    e.disconnectedCallback();

    return deferUntilNextFrame()
      .then(() => {
        assert(assertAdoptedCallbackSpy.called);
        assert(assertAttributeChangedCallbackSpy.called);
        assert(assertConnectedCallbackSpy.called);
        assert(assertDisconnectedCallbackSpy.called);
        assert(e[StateSymbol].count === 4);
        assert(assertRenderSpy.callCount === 4);

        return deferUntilNextFrame();
      })
      .then(() => {
        assert(assertRenderSpy.callCount === 5);
      });
  })
);

test(
  "useShadow",
  withDom(() => {
    const Component = factorizeComponent(
      () => {},
      { active: false, count: 0 },
      useShadow()
    );

    const e = constructComponent(Component);

    assert(e.shadowRoot);
  })
);

test(
  "useTemplate",
  withDom(() => {
    const [ renderSpy, assertRenderSpy ] = factorizeSpy();

    const Component = factorizeComponent(renderSpy, { active: false, count: 0 });

    useTemplate(
      () => {
        const t = window.document.createElement("template");
        t.innerHTML = `<span>0</span><button>Add</button>`

        return t;
      },
      {
        addButton: (e) => e.querySelector("button"),
        number: (e) => e.querySelector("span"),
      }
    )((f) => f(Component, renderSpy));

    const e = constructComponent(Component);

    e.connectedCallback();

    return deferUntil(null, () => assertRenderSpy.called)
      .then(() => {
        assert(assertRenderSpy.called);
        assertRenderSpy((e) => {
          assert(e.elements.addButton);
          assert(e.elements.number);
        });
      });
  })
);
