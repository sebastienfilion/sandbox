# Sandbox

This is an experiemental project. The goal is to build a rendering framework
leveraging the [web components API](https://developer.mozilla.org/en-US/docs/Web/Web_Components).
If you don't know what to do with it... it's okay.

If you want to try it anyway, run `./run_sandbox.sh` on the root and navigate to 
the `sandbox` directory in your browser.

## API

### `factorizeComponent`

Factorizes a component given a render function, a state and an arbitrary number of composable functions.

The first argument is a render function. The function is called once when the component is connected to the DOM.
The render function should accept two parameters, the first one is the element that is being rendered.
The second parameter is the current state that should be used to render the component.

The second argument to the `factorizeComponent` function is an object that will be used as the inital state.

`State :: Object`
`R :: (DOMElement, State) -> void`
`F :: (((Component, R, State) -> C) -> void, ((DOMElement) -> E) -> void) -> void`
`factorizeComponent :: ((DOMElement, State) -> void, State, [...F]) -> Component`

```js
window.customElements.define(
  "iy-demo",
  factorizeComponent(
    (e, { title }) => {
      const h1 = window.document.createElement("h1");
      h1.textContent = title;
      e.appendChild(e);
    },
    { title: "Bluebird" }
  )
);
```

#### Higher-order-function

The `factorizeComponent` also accepts an arbitrary amount of functions as arguments.
Those higher-order-functions should accept 2 parameters; the first one is named `factorize`, the second is named
`construct`.

Both HOFs accepts a function that will be called, respectively, at the factory phase, before the component is
initialize, and, at the construction phase, when the component is being instantiated.

The factorize function has three parameters; the first parameter is a Component constructor;
the second parameter is the render function which can be called to queue a render request;
the third parameter is the initial state.

```js
window.customElements.define(
  "iy-demo",
  factorizeComponent(
    render,
    state,
    (factorize, construct) => {
      factorize((Component, render) => {
        Object.defineProperty(
          Component.prototype,
          "forceRender",
          {
            configurable: false,
            enumerable: false,
            value() {
              render(this);
            },
          }
        );

        return Component;
      });
      construct((element) => {
        element.dataset.forceRender = true;
      });
    }
  )
);
```

### `fetchTemplate`

Fetches a HTML file from a server and returns the Promise of a `<template>`.

```js
const element = window.document.querySelector("div");
fetchTemplate("/demo.html")()
  .then((template) => {
    element.appendChild(template.content.cloneNode(true));
  });
```

### `useAttributes`

Creates a reactive lifecycle with a simple state reducer.
When a user or a program sets an attribute of the component, the validation function is called which decides if the
component should be rendered again.

The `useAttributes` function accepts a function to validate an observed attributes value and create a new state. The
validation function should have three parameters. The first one is an object representing the attribute that was
changed, the second is the element that is affected and the last is the current state of the element. The validation
function shoudl return a state fragment or false to cancel the render.

The hook function also takes a map object for all of the attributes to observe.The value is a function to transform
the value before the validation function called. If not transformation is needed, just pass the identity function.
`(x) => x`

```js
window.customElements.define(
  "iy-demo",
  factorizeComponent(
    (element, { value }) => {
     const span = element.querySelector("span");
     span.textContent = String(value);
    },
    { value: 0 },
    useAttributes(
      ({ oldValue, value }) => (oldValue !== value && value >= 0) ? ({ value }) : false,
      {
        value: Number
      }
    ),
    (factorize) => {
      factorize((Component) => {
        Object.defineProperty(
          Component.prototype,
          "connectedCallback",
          {
            enumerable: true,
            value() {
              console.log("hello");
              const span = window.document.createElement("span");
              const button = window.document.createElement("button");
              button.textContent = "Add";
              this.appendChild(span);
              this.appendChild(button);
              button.addEventListener("click", () => {
                const v = this.getAttribute("value");
                this.setAttribute("value", String(Number(v) + 1));
              });
            },
          },
        );
        return Component;
      });
    }
  )
);
```

### `useCallbacks`

Hooks into the component's lifecycle. Learn more about [lifecycle callbacks on MDN](https://developer.mozilla.org/en-US/docs/Web/Web_Components/Using_custom_elements#using_the_lifecycle_callbacks)

The function accepts as argument an object of function to hook into one of the following callback:
`connectedCallback`, `disconnectedCallback`, `attributeChangedCallback` and `adoptedCallback`.

Each callback function will be called when appropriate with the element, the relevant options and a `asyncRender`
function as arguments.
The `asyncRender` function can be called at any moment with a "state setter" function. This returns a thunk function
that may accept an argument. When the thunk function is called, the "state setter" function is called with the
current element and state as argument. This function should return a state fragment or false. The state fragment is
then merged with the current state and set the relevant component attributes. See `useAttribute`.

```js
window.customElements.define(
  "iy-demo",
  factorizeComponent(
    (element, { value }) => {
      const span = element.querySelector("span");
      span.textContent = String(value);
    },
    { value: 0 },
    useCallbacks({
      connectedCallback: (element, render) => {
        const span = window.document.createElement("span");
        const button = window.document.createElement("button");
        button.textContent = "Add";
        element.appendChild(span);
        element.appendChild(button);
        button.addEventListener("click", render((e, { value }) => ({ value: ++value })));
      }
    }),
    (factorize) => {
      factorize((Component, render) => {
        Object.defineProperty(
          Component,
          "observedAttributes",
          {
            enumerable: true,
            value: ["value"],
          },
        );

        Object.defineProperty(
          Component.prototype,
          "attributeChangedCallback",
          {
            enumerable: true,
            value(name, oldValue, value) {
              this[StateSymbol][name] = value;
              render(this, Object.assign({}, this[StateSymbol]));
            },
          },
        );

        return Component;
      });
    }
  )
);
```

### `useShadow`

Attaches a shadow root to every instance of the Component.
 
 ```js
window.customElements.define(
  "iy-demo",
  factorizeComponent(
    (element, { value }) => {
      const span = element.querySelector("span");
      span.textContent = String(value);
    },
    { value: 0 },
    useShadow({ mode: "open" })
  )
);
 ```

### `useTemplate`

Automatically appends a clone of a template to the element or the element's shadow root.

The function accepts a function that must return a template instance or a Promise of a template instance.
Optionally, the function can also be passed an object as the second argument that is used to define
children that would be often queried during the render phase.
The object's values must be a function that will accept the component instance as the first parameter
and return a child element or node list.
The elements will be accessible as the `elements` property of the Component instance element.

```js
window.customElements.define(
  "iy-demo",
  factorizeComponent(
    (e, { value }) => {
      e.elements.number.textContent = String(value);
    },
    { value: 0 },
    useShadow({ mode: "open" }),
    useTemplate(
      () => {
        const t = window.document.createElement("template");
        t.innerHTML = `<span>0</span><button>Add</button>`

        return t;
      },
      {
        number: (e) => e.shadowRoot.querySelector("span"),
        addButton: (e) => e.shadowRoot.querySelector("button")
      }
    )
  ),
);
```
