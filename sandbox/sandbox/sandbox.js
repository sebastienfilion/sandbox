import { createComponent, deferUntil } from "/web-component/library/component.js";
import "/core/button-group/button-group.js";

createComponent(
  "iy-sandbox",
  (e, { layout }) => {
    e.elements.layoutToggleButton.setAttribute("data-active", layout);
  },
  {
    connectedCallback: (e, render) => {
      e._handleLayoutToggleClick = render((_, { layout }, { target }) => ({ layout: target.getAttribute("name") }));
      e._handleToolToggleClick = render((e, { tool }) => {
        const xs = e.querySelectorAll(`[slot="element"]`);

        if (!tool) {
          const f = ({ target }) => {
            if (!target.dataset.tool || target.dataset.tool === "false")
              target.dataset.tool = "true";
            for (const x of xs) {
              if (x !== target) {
                x.dataset.tool = "false"
              }
              x.dataset.selectable = "false";
              x.removeEventListener("click", f);
            }
            render(() => ({ tool: false }))();
          };
          for (const x of xs) {
            x.dataset.selectable = "true";
            x.addEventListener("click", f);
          }
        } else {
          for (const x of xs) {
            x.dataset.selectable = "false";
          }
        }

        return { tool: !tool };
      });

      deferUntil(e, (e) => e.querySelectorAll(`[slot="element"]`)[0])
        .then(() => {
          e.querySelectorAll(`[slot="element"]`)[0].dataset.tool = "true";
        });

      e.elements.layoutToggleButton.addEventListener(
        "click",
        e._handleLayoutToggleClick
      );
      e.elements.toolToggleButton.addEventListener(
        "click",
        e._handleToolToggleClick
      );
    },
    disconnectedCallback: (e) => {
      e.elements.layoutToggleButton.removeEventListener(
        "click",
        e._handleLayoutToggleClick
      );
      e.elements.toolToggleButton.removeEventListener(
        "click",
        e._handleToolToggleClick
      );
    },
    elements: {
      toolToggleButton: (e) => e.shadowRoot.querySelector(`[name="tool-toggle"]`),
      layoutToggleButton: (e) => e.shadowRoot.querySelector(`[name="layout-toggle"]`)
    },
    mapAttributeToState: {
      "data-tool": (v) =>
        (typeof v === "string") ? !["false", "0"].includes(v) : !!v,
    },
    observedAttributes: ["data-layout", "data-tool"],
    state: { layout: "grid", tool: false },
    templatePath: "/sandbox/sandbox/sandbox.html"
  }
);
