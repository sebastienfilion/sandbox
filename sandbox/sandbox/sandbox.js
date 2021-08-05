import { createComponent } from "/web-component/library/component.js";
import "/core/button-group/button-group.js";

createComponent(
  "iy-sandbox",
  (e, { layout }) => {
    e.elements.toggleButton.setAttribute("data-active", layout);

  },
  {
    connectedCallback: (e, render) => {
      e._handleLayoutToggleClick = render((_, { layout }, { target }) => ({ layout: target.getAttribute("name") }));

      e.elements.toggleButton.addEventListener(
        "click",
        e._handleLayoutToggleClick
      );
    },
    disconnectedCallback: (e) => {
      e.elements.toggleButton.removeEventListener(
        "click",
        e._handleLayoutToggleClick
      );
    },
    elements: {
      toggleButton: (e) => e.shadowRoot.querySelector(".layout-toggle"),
    },
    observedAttributes: ["data-layout"],
    state: { layout: "grid" },
    templatePath: "/sandbox/sandbox/sandbox.html"
  }
);
