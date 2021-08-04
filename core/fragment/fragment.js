import { createComponent } from "../../web-component/library/component.js";

const findIndexModuleImport = (c) => {
  let i = 0, j = 0;
  while (i + 1 < c.length) {
    const k = c.indexOf("\n", i + 1);
    if (k === -1) break;
    const s = c.substring(i, k);
    if (/^\s+import\s/.test(s)) {
      j = k;
    }
    if (s.trim() !== "") break;
    i = k;
  }
  return j;
};

const fetchFragment = (path) => (
  window[Symbol.for("iy-templates")][path] ||
  (
    window[Symbol.for("iy-templates")][path] = fetch(
      path,
    )
      .then((response) => response.text())
      .then((html) => ({
        cloneNode() {
          const e = window.document.createElement("div");
          e.innerHTML = html;

          return { content: e };
        },
      }))
  )
);

const connectedCallback = (e, render) => {
  const observer = new MutationObserver(
    (ms) =>
      ms.forEach(({ attributeName, target, ...xs }) => {
        if (attributeName === "src") {
          const path = target.getAttribute(attributeName);
          render(() => ({ loading: true }));
          fetchFragment(path)
            .then(render((e, s, template) => ({ loading: false, template })))
            .catch((e) => {
              console.error(e);
            });
        }
      }),
  );

  observer.observe(e, { attributes: true, attributeFilter: ["src"] });

  const path = e.getAttribute("src");
  fetchFragment(path)
    .then(render((e, s, template) => ({ loading: false, template })))
    .catch((e) => {
      console.error(e);
    });
};

createComponent(
  "iy-fragment",
  (e, { loading, template }) => {
    while (e.firstElementChild) {
      e.removeChild(e.firstChild);
    }

    if (loading) {
      const text = document.createElement("span");
      text.innerText = "Loading...";
      e.appendChild(text);
    } else {
      const content = template.cloneNode(true).content;

      while (content.firstElementChild) {
        e.appendChild(content.firstElementChild);
      }

      if (e.dataset.trust) {
        for (const script of e.querySelectorAll("script")) {
          if (
            e.dataset.trust !== "true" && e.dataset.trust !== "1" &&
            !e.dataset.trust.includes(script.id)
          ) {
            continue;
          }
          const parent = script.parentNode;
          const sibling = script.previousElementSibling;
          const s = document.createElement("script");

          for (const n of script.attributes) {
            s.setAttribute(n.nodeName, n.nodeValue);
          }

          if (!script.hasAttribute("src")) {
            const i = findIndexModuleImport(script.textContent);
            const t = document.createTextNode(
              `${script.textContent.substring(0, i)}(function(){${script.textContent.substring(i + 1)}}).call(document.querySelector('iy-fragment[src=\"${
                e.getAttribute("src")
              }\"]'))`,
            );
            s.appendChild(t);
          }
          sibling.insertAdjacentElement("afterend", s);
          parent.removeChild(script);
        }
      }
    }
  },
  {
    connectedCallback,
    mapAttributeToState: {
      "data-loading": (v) =>
        (typeof v === "string") ? !["false", "0"].includes(v) : !!v,
    },
    observedAttributes: ["data-loading"],
    options: { attachShadow: false },
    state: { loading: true, template: null },
  },
);
