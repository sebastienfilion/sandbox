import {
  factorizeComponent,
  fetchTemplate,
  useAttributes,
  useCallbacks,
  useShadow,
  useTemplate
} from "../../web-component/library/component.js";
import { deferUntil } from "../../web-component/library/utilities.js";

/*
var jsHighlighter = document.createElement('script');
jsHighlighter.src = 'https://cdn.rawgit.com/google/code-prettify/master/loader/run_prettify.js';
document.body.appendChild(jsHighlighter);
 */

export const highlight = (code, language = "javascript") =>
  window.hljs.highlight(code.trim(), { language }).value;

const connectedCallback =  (e) => {
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
};

window.customElements.define(
  "iy-highlight",
  factorizeComponent(
    (e, { language }) => {
      if (!e.parentElement || !e.firstChild || !e.elements?.code) return;
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
    { language: "javascript" },
    useShadow(),
    useTemplate(
      fetchTemplate("/core/highlight/highlight.html"),
      {
        code: (e) => e.shadowRoot.querySelector("code")
      }
    ),
    useAttributes(
      ({ oldValue, value }) => oldValue !== value,
      {
        "data-language": (v) => v
      }
    ),
    useCallbacks({ connectedCallback })
  )
)

// createComponent(
//   "iy-highlight",
//   (e, { language }) => {
//     if (!e.parentElement || !e.firstChild) return;
//     deferUntil(null, () => window.hljs)
//       .then(() =>
//         (
//           window.hljs.listLanguages().includes(language) &&
//           Promise.resolve(window.hljs.getLanguage(language)) ||
//           Promise.reject(new Error(`Could not find language ${language}`))
//         ))
//       .then(() => {
//         const code = highlight(e.textContent, language)
//         const ls = code.split("\n");
//         for (const l of ls) {
//           const p = window.document.createElement("pre");
//           p.innerHTML = l;
//           e.elements.code.appendChild(p);
//         }
//       });
//   },
//   {
//     connectedCallback: (e) => {
//       // childList on return cariage
//       const m = new MutationObserver((rs, o) => {
//         rs.forEach((r) => {
//           if (r.type === "characterData" && r.addedNodes.length === 0) {
//             const lc = r.target.parentElement.textContent.match(/([\s\n\r])$/m);
//             if (lc) {
//               const s = r.target.parentElement.textContent;
//               const code = highlight(s, e.dataset.language || "javascript");
//               if (r.target.nodeName === "#text") {
//                 const p = r.target.parentElement;
//                 p.innerHTML = code;
//
//                 const t = window.document.createTextNode(lc[0]);
//                 p.appendChild(t);
//                 const range = document.createRange();
//                 const selection = window.getSelection();
//
//                 range.setStart(t, 1);
//                 // range.setEnd(p.lastChild?.lastChild, s.length - 1);
//                 range.collapse(true);
//
//                 selection.removeAllRanges();
//                 selection.addRange(range);
//               }
//             }
//           }
//         });
//       });
//
//       // m.observe(
//       //   e.elements.code,
//       //   {
//       //     subtree: true,
//       //     childList: true,
//       //     characterData: true,
//       //     characterDataOldValue: true
//       //   }
//       // );
//     },
//     elements: {
//       code: (e) => e.shadowRoot.querySelector("code")
//     },
//     observedAttributes: ["data-language"],
//     state: { language: "javascript" },
//     templatePath: "/core/highlight/highlight.html"
//   }
// );
