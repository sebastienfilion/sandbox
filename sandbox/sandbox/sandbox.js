import {
  factorizeComponent,
  fetchTemplate,
  useAttributes,
  useCallbacks,
  useShadow,
  useTemplate,
} from "../../web-component/library/component.js";
import { deferUntil } from "../../web-component/library/utilities.js"
import "../../core/button-group/button-group.js";

const connectedCallback = (e, render) => {
  const f = (e) =>
    e.detail.time > 1 && console.warn(`${e.target.tagName} is slow ${e.detail.time}`, e.target);

  e.querySelectorAll(`[slot="element"]`)
    .forEach((c) => c[Symbol.for("iy-state")] && c.addEventListener("render", f))

  e._handleLayoutToggleClick = render((_, { layout }, { target }) => ({ layout: target.getAttribute("name") }));
  e._handleToolToggleClick = render((e, { tool }) => {
    const es = e.querySelectorAll(`[slot="element"]`);

    if (!tool) {
      const f = ({ target }) => {
        if (!target.dataset.tool || target.dataset.tool === "false")
          target.dataset.tool = "true";
        es.forEach((e) => {
          if (e !== target) {
            e.dataset.tool = "false"
          }
          e.dataset.selectable = "false";
          e.removeEventListener("click", f);
        });
        render(() => ({ tool: false }))();
      };
      es.forEach((e) => {
        e.dataset.selectable = "true";
        e.addEventListener("click", f);
      });
    } else {
      es.forEach((e) => e.dataset.selectable = "false")
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
};

const disconnectedCallback = (e) => {
  e.elements.layoutToggleButton.removeEventListener(
    "click",
    e._handleLayoutToggleClick
  );
  e.elements.toolToggleButton.removeEventListener(
    "click",
    e._handleToolToggleClick
  );
};

window.customElements.define(
  "iy-sandbox",
  factorizeComponent(
    (e, { layout }) => {
      e.elements?.layoutToggleButton.setAttribute("data-active", layout);
    },
    { layout: "grid", tool: false },
    useShadow(),
    useTemplate(
      fetchTemplate("/sandbox/sandbox/sandbox.html"),
      {
        toolToggleButton: (e) => e.shadowRoot.querySelector(`[name="tool-toggle"]`),
        layoutToggleButton: (e) => e.shadowRoot.querySelector(`[name="layout-toggle"]`)
      }
    ),
    useAttributes(
      ({ oldValue, value }) => oldValue !== value,
      {
        "data-layout": (v) => v,
        "data-tool": (v) => !["false", "0"].includes(v) || !!v,
      }
    ),
    useCallbacks({ connectedCallback, disconnectedCallback })
  )
);
