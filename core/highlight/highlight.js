import { createComponent, deferUntil } from "../../web-component/library/component.js";

export const highlight = (code, language = "javascript") => {

  return deferUntil(null, () => window.hljs)
    .then(() =>
      (
        window.hljs.listLanguages().includes(language) &&
        Promise.resolve(window.hljs.getLanguage(language)) ||
        Promise.reject(new Error(`Could not find language ${language}`))
      )
        .then(() => window.hljs.highlight(code.trim(), { language }).value)
    );
}

createComponent(
  "iy-highlight",
  (e, { language }) => {
    if (!e.parentElement || !e.elements.textSource) return;

    highlight(e.firstChild.textContent, language)
      .then((code) => (e.elements.textSource.innerHTML = code));
  },
  {
    elements: {
      textSource: (e) => e.querySelector("pre code")
    },
    observedAttributes: ["data-language"],
    options: { attachShadow: false },
    preRender: (e, es) => {
      const code = e.querySelector("pre code");
      while (es.firstChild) {
        code.append(es.firstChild);
      }
    },
    state: { language: "javascript" },
    templatePath: "/core/highlight/highlight.html"
  }
);
