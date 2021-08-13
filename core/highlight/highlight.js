import { createComponent, deferUntil } from "../../web-component/library/component.js";

export const highlight = (code, language = "javascript") =>
  window.hljs.highlight(code.trim(), { language }).value;

createComponent(
  "iy-highlight",
  (e, { language }) => {
    if (!e.parentElement || !e.firstChild) return;
    deferUntil(null, () => window.hljs)
      .then(() =>
        (
          window.hljs.listLanguages().includes(language) &&
          Promise.resolve(window.hljs.getLanguage(language)) ||
          Promise.reject(new Error(`Could not find language ${language}`))
        ))
      .then(() => {
        const code = highlight(e.textContent, language)
        const ls = code.split("\n");
        for (const l of ls) {
          const p = window.document.createElement("pre");
          p.innerHTML = l;
          e.elements.code.appendChild(p);
        }
      });
  },
  {
    connectedCallback: (e) => {
      // childList on return cariage
      const m = new MutationObserver((rs, o) => {
        rs.forEach((r) => {
          if (r.type === "characterData" && r.addedNodes.length === 0) {
            const lc = r.target.parentElement.textContent.match(/([\s\n\r])$/m);
            if (lc) {
              const s = r.target.parentElement.textContent;
              const code = highlight(s, e.dataset.language || "javascript");
              if (r.target.nodeName === "#text") {
                const p = r.target.parentElement;
                p.innerHTML = code;

                const t = window.document.createTextNode(lc[0]);
                p.appendChild(t);
                const range = document.createRange();
                const selection = window.getSelection();

                range.setStart(t, 1);
                // range.setEnd(p.lastChild?.lastChild, s.length - 1);
                range.collapse(true);

                selection.removeAllRanges();
                selection.addRange(range);
              }
            }
          }
        });
      });

      // m.observe(
      //   e.elements.code,
      //   {
      //     subtree: true,
      //     childList: true,
      //     characterData: true,
      //     characterDataOldValue: true
      //   }
      // );
    },
    elements: {
      code: (e) => e.shadowRoot.querySelector("code")
    },
    observedAttributes: ["data-language"],
    state: { language: "javascript" },
    templatePath: "/core/highlight/highlight.html"
  }
);
