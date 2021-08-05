import { createComponent } from "/web-component/library/component.js";

createComponent(
  "iy-sandbox-figure",
  (e, { title }) => {
    if (!e.elements.title) return;
    e.elements.title.textContent = title;
  },
  {
    elements: {
      title: (e) => e.shadowRoot.querySelector("figcaption"),
    },
    observedAttributes: ["data-title"],
    state: { title: "Unknown" },
    templatePath: "/sandbox/sandbox/sandbox-figure.html"
  }
);
