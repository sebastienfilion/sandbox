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

const style = `.hljs-tag,
.hljs-keyword,
.hljs-selector-tag,
.hljs-literal,
.hljs-strong,
.hljs-name {
  color: var(--color-highlight-keyword);
}

.hljs-tag .hljs-attr {
  color: var(--color-highlight-variable);
}

.hljs-code {
  color: #66d9ef;
}

.hljs-attribute,
.hljs-symbol,
.hljs-regexp,
.hljs-link {
  color: #bf79db;
}

.hljs-bullet,
.hljs-subst,
.hljs-title,
.hljs-section,
.hljs-emphasis,
.hljs-type,
.hljs-built_in,
.hljs-selector-attr,
.hljs-selector-pseudo,
.hljs-addition,
.hljs-variable,
.hljs-template-tag,
.hljs-template-variable {
  color: var(--color-highlight-variable);
}

.hljs-string {
  color: var(--color-highlight-string);
}

.hljs-title.class_,
.hljs-class .hljs-title {
  color: inherit;
}

.hljs-comment,
.hljs-quote,
.hljs-deletion,
.hljs-meta {
  color: var(--color-highlight-comment);
}

.hljs-tag .hljs-attr,
.hljs-selector-tag,
.hljs-literal,
.hljs-doctag,
.hljs-title,
.hljs-section,
.hljs-type,
.hljs-selector-id {
  font-weight: 500;
}

.hljs-number {
  color: var(--color-highlight-number);
}
`

createComponent(
  "iy-highlight",
  (e, { language }) => {
    if (!e.parentElement || !e.elements.code) return;

    highlight(e.elements.code.textContent, language)
      .then((code) => (e.elements.code.innerHTML = code));
  },
  {
    connectedCallback(e) {
      const s = window.document.createElement("style");
      s.innerText = style;
      e.appendChild(s);
    },
    elements: {
      code: (e) => e.querySelector(`[slot="code"]`)
    },
    observedAttributes: ["data-language"],
    state: { language: "javascript" },
    templatePath: "/core/highlight/highlight.html"
  }
);
