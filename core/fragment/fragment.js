import {
  factorizeComponent,
  fetchTemplate,
  useAttributes,
  useCallbacks
} from "../../web-component/library/component.js";
import { renderIf } from "../../web-component/library/utilities.js";

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

const connectedCallback = (e, render) => {
  const observer = new MutationObserver(
    (ms) =>
      ms.forEach(({ attributeName, target, ...xs }) => {
        if (attributeName === "data-src") {
          const path = target.getAttribute(attributeName);
          render(() => ({ loading: true }));
          fetchTemplate(path)()
            .then(render((e, s, template) => ({ loading: false, template })))
            .catch((e) => {
              console.error(e);
            });
        }
      }),
  );

  observer.observe(e, { attributes: true, attributeFilter: ["data-src"] });

  const path = e.getAttribute("data-src");
  fetchTemplate(path)()
    .then(render((e, s, template) => ({ loading: false, template })))
    .catch((e) => {
      console.error(e);
    });
};

const renderLoading = (e) => {
  const text = document.createElement("span");
  text.innerText = "Loading...";
  e.appendChild(text);
  return e;
};

const renderTemplate = (e, template, trust) => {
  e.appendChild(template.content.cloneNode(true),);

  if (trust) {
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

      if (!script.hasAttribute("data-src")) {
        const i = findIndexModuleImport(script.textContent);
        const t = document.createTextNode(
          `${script.textContent.substring(0, i)}(function(){${script.textContent.substring(i + 1)}}).call(document.querySelector('iy-fragment[data-src=\"${
            e.getAttribute("data-src")
          }\"]'))`,
        );
        console.log(script.textContent.substring(0, i));
        s.appendChild(t);
      }
      sibling.insertAdjacentElement("afterend", s);
      parent.removeChild(script);
    }
  }

  return e;
};

window.customElements.define(
  "iy-fragment",
  factorizeComponent(
    (e, { loading, template, trust }) => {
      renderIf(
        e,
        loading,
        renderLoading,
        renderTemplate,
        template,
        trust
      )
    },
    { loading: true, template: null },
    useAttributes(
      ({ oldValue, value }) => oldValue !== value,
      {
        "data-loading": (v) => !["false", "0"].includes(v) || !!v,
        "data-trust": (v) => !["false", "0"].includes(v) || !!v,
      },
    ),
    useCallbacks({ connectedCallback })
  )
);

