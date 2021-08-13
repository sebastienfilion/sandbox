import { createComponent } from "/web-component/library/component.js";
import "/core/highlight/highlight.js";

const randomUUID = () => window.crypto.randomUUID &&
  window.crypto.randomUUID() ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    let r = Math.random() * 16 | 0,
      v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

const parseSelectorForElement = (e) => {
  const as = [ e.localName ];
  for (const { name, value } of e.attributes) {
    if (name === "class") {
      as.push(
        ...value.split(" ").map((x) => `.${x}`)
      );
    } else {
      as.push(
        name === "id" ? `#${value}` : `[${name}="${value}"]`
      );
    }
  }
  return as;
};

const intersects = (xs, ys) => ys && ys.reduce(
  (b, y) => !xs.includes(y) ? false : b,
  true
) || false;

const filterCssRules = (selectors, cssRules) => {
  let xs = [];
  for (const r of cssRules) {
    if (!r.selectorText) {
      if (r.cssRules) {
        xs.push(...filterCssRules(selectors, r.cssRules));
      }
      continue;
    }
    const isApplicable = r.selectorText.split(/\s*,\s*/)
      .reduce(
        (a, x) => {
          const ns = x.split(/\s|\s*>\s*|\s*\+\s*|\s*~\s*/g);

          const b = intersects(
            selectors,
            (ns && ns[ns.length - 1] || x).match(/^\w+|[#.\[].+?(?=[#.\[:]|$)/g)
          );

          return b ? b : a;
        },
        false
      );
    isApplicable && xs.push(r);
  }
  return xs;
}

const filterStyleSheets = (selectors, styleSheets) => {
  let xs = [];
  for (const s of styleSheets) {
    // Some style sheets are not accessible because of CORS
    try { s.cssRules } catch (e) { continue }
    xs.push(...filterCssRules(selectors, s.cssRules));
  }
  return xs;
}

const getApplicableStyles = (e) => {
  const selectors = parseSelectorForElement(e);

  return filterStyleSheets(selectors, document.styleSheets);
};

createComponent(
  "iy-sandbox-figure",
  (e, { title, tool }) => {
    if (!e.elements.title) return;
    e.id = randomUUID();
    e.elements.title.textContent = title;

    if (tool) {
      while (e.elements.tools.firstElementChild) {
        e.elements.tools.removeChild(e.elements.tools.firstElementChild);
      }

      const targetElements = e.querySelectorAll(`[slot="element"]`);
      const highlight = window.document.createElement("iy-highlight");
      const code = window.document.createElement("code");

      const cssRulesCollection = Array.from(targetElements).map((e) => [e, getApplicableStyles(e)]);

      const states = window.document.createElement("div");
      states.classList.add("states");

      const _handleCheckboxChange = ({ target }) => {
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

      for (const p of ["active", "hover", "focus", "visited"]) {
        const l = window.document.createElement("label");
        const c = window.document.createElement("input");
        const t = window.document.createTextNode(`:${p}`);

        c.id = `${p}-${e.id}`;
        c.name = p;
        c.type = "checkbox";
        c.addEventListener("change", _handleCheckboxChange);

        l.setAttribute("for", c.id);

        l.appendChild(c);
        l.appendChild(t);
        states.appendChild(l);
      }

      e.elements.tools.appendChild(states);

      highlight.dataset.language = "xml";
      code.slot = "code";
      code.textContent = Array.from(e.querySelectorAll(`[slot="element"]`))
        .map((e) => e.outerHTML + "").join("\n")
        .replace(/\s*slot="element"\s*/gm, "")
        .replace(/\s*data-(selectable|tool)="(true|false)"\s*/gm, "")
        .replace(/<svg\s[\w\s\d-_="':\/\.<>\n]+<\/svg>/gm, "<svg></svg>")
        .replace(/<code\s[\w\s\d-_="':\/\.<>\n(){}\[\]&;:,#]+<\/code>/gm, "<code></code>");

      highlight.appendChild(code);

      e.elements.tools.appendChild(highlight);
    } else {
      while (e.elements.tools.firstElementChild) {
        e.elements.tools.removeChild(e.elements.tools.firstElementChild);
      }
    }
  },
  {
    attributeChangedCallback: ({ name, oldValue, value }) =>
      (oldValue !== value) ? ({ [name]: value }) : name === "data-tool" ? ({ tool: value }) : false,
    connectedCallback: (e) => {
      for (let i = 0; i < e.children.length; i++) {
        const b = e.children[i];
        b.addEventListener("render", (event) => console.log(event.target, event.detail));
        b.slot = "element"
      }
    },
    elements: {
      title: (e) => e.shadowRoot.querySelector("figcaption"),
      tools: (e) => e.shadowRoot.querySelector(".tools"),
    },
    mapAttributeToState: {
      "data-tool": (v) =>
        (typeof v === "string") ? !["false", "0"].includes(v) : !!v,
    },
    observedAttributes: ["data-title", "data-tool"],
    state: { title: "Unknown", tool: false },
    templatePath: "/sandbox/sandbox/sandbox-figure.html"
  }
);

