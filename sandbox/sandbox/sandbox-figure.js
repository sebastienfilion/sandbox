import {
  factorizeComponent,
  fetchTemplate,
  useAttributes,
  useCallbacks,
  useShadow,
  useTemplate,
} from "../../web-component/library/component.js";
import {
  prependElement,
  randomUUID,
  renderFor,
  renderIf,
  renderOnce,
  requestIdleCallback,
} from "../../web-component/library/utilities.js";
import { getApplicableStyles } from "./cssRules.js";
import "../../core/highlight/highlight.js";

const handleCSSRulesCollection = (cssRulesCollection) =>
  ({ target }) => {
    for (const [targetElement, cssRules] of cssRulesCollection) {
      for (const r of cssRules) {
        if (r.selectorText.includes(`:${target.name}`)) {
          for (const k of r.style) {
            if (target.checked) {
              targetElement.style[k] = r.style[k];
            } else if (targetElement.style[k] === r.style[k]) {
              targetElement.style[k] = "";
            }
          }
        }
      }
    }
  };

const renderEventsTool = (e, es, events) => {
  const eventsElement = renderOnce(
    e,
    () => {
      const e = window.document.createElement("div");
      e.classList.add("events");
      return e;
    },
  );

  es.forEach((e) => {
    if (e._handleDebugEvents) {
      e.addEventListener("render", e._handleDebugEvents);
      e.addEventListener("change:attribute", e._handleDebugEvents);
    }
  });

  return renderFor(
    eventsElement,
    events,
    (target, event) => {
      const element = window.document.createElement("div");
      if (event.type === "render") {
        element.classList.add("render");
        if (event.time > 1) {
          element.classList.add(event.time > 2 ? "--very-slow" : "--slow");
        }
        element.textContent = `Render`;
      } else if (event.type === "change:attribute") {
        element.textContent =
          `${event.attribute.name}: ${event.attribute.oldValue} -> ${event.attribute.value}`;
      }
      return element;
    },
    prependElement,
  );
};

const renderHighlight = (e, es) => {
  const highlight = renderOnce(
    e,
    () => {
      const highlight = window.document.createElement("iy-highlight");
      const code = window.document.createElement("code");

      highlight.dataset.language = "xml";
      code.slot = "code";

      highlight.appendChild(code);

      return highlight;
    },
  );

  highlight.querySelector("code").textContent = Array.from(es)
    .map((e) => String(e.outerHTML)).join("\n")
    .replace(/\s*slot="element"/gm, "")
    .replace(/\s*data-(selectable|tool)="(true|false)"/gm, "")
    .replace(/<svg\s[\w\s\d-_="':\/.<>\n]+<\/svg>/gm, "<svg></svg>")
    .replace(
      /<code\s[\w\s\d-_="'\/.<>\n(){}\[\]&;:,#]+<\/code>/gm,
      "<code></code>",
    );

  return highlight;
};

const renderStateTool = (e, es) =>
  renderOnce(
    e,
    (e) => {
      const states = window.document.createElement("div");
      states.classList.add("states");

      const $handleCheckboxChange = new Promise(
        (resolve) =>
          requestIdleCallback(
            () => {
              const cssRulesCollection = Array.from(es).map((
                e,
              ) => [e, getApplicableStyles(e, window.document.styleSheets)]);
              resolve(handleCSSRulesCollection(cssRulesCollection));
            },
            1000 * 5,
          ),
      );

      ["active", "hover", "focus", "visited"].forEach((p) => {
        const l = window.document.createElement("label");
        const c = window.document.createElement("input");
        const t = window.document.createTextNode(`:${p}`);

        c.id = `${p}-${e.id}`;
        c.name = p;
        c.type = "checkbox";
        $handleCheckboxChange.then((f) => c.addEventListener("change", f));

        l.setAttribute("for", c.id);

        l.appendChild(c);
        l.appendChild(t);
        states.appendChild(l);
      });

      return states;
    },
  );

const render = (e, { events, title, tool, withEvents, withStates }) => {
  if (!e?.elements?.title) return null;
  e.id = randomUUID();
  e.elements.title.textContent = title;
  const es = e.querySelectorAll(`[slot="element"]`);

  return renderIf(
    e.elements.tools,
    tool,
    (te) => {
      withStates && renderStateTool(te, es);
      withEvents && renderEventsTool(te, es, events);
      renderHighlight(te, es);
    },
    () => {
      es.forEach((e) => {
        if (e._handleDebugEvents) {
          e.removeEventListener("render", e._handleDebugEvents);
          e.removeEventListener("change:attribute", e._handleDebugEvents);
        }
      });
    },
  );
};

window.customElements.define(
  "iy-sandbox-figure",
  factorizeComponent(
    render,
    {
      events: [],
      title: "Unknown",
      tool: false,
      withEvents: false,
      withStates: false,
    },
    useShadow(),
    useTemplate(
      fetchTemplate("/sandbox/sandbox/sandbox-figure.html"),
      {
        title: (e) => e.shadowRoot.querySelector("figcaption"),
        tools: (e) => e.shadowRoot.querySelector(".tools"),
      },
    ),
    useAttributes(
      ({ name, oldValue, value }) =>
        name === "data-tool"
          ? value ? ({ tool: value }) : ({ tool: value, events: [] })
          : (oldValue !== value),
      {
        "data-title": (v) => v,
        "data-tool": (v) => !["false", "0"].includes(v) || !!v,
        "data-with-events": (v) => !["false", "0"].includes(v) || !!v,
        "data-with-states": (v) => !["false", "0"].includes(v) || !!v,
      },
    ),
    useCallbacks({
      connectedCallback: ({ children }, render) => {
        for (const e of children) {
          e._handleDebugEvents = render(
            (element, state, event) => ({
              events: [...state.events, {
                key: randomUUID(),
                type: event.type,
                ...event.detail,
              }],
            }),
          );
          e.slot = "element";
        }
      },
    }),
  ),
);
