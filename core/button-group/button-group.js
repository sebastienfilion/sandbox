import { createComponent } from "/web-component/library/component.js";

createComponent(
  "iy-button-group",
  (e, { active }) => {
    if (active) {
      for (let i = 0; i < e.children.length; i++) {
        const b = e.children[i];

        if (b.getAttribute("name") !== active) {
          b.classList.remove("--active");
          b.removeAttribute("data-active");
        } else {
          b.classList.add("--active");
          b.setAttribute("data-active", "true");
        }
      }
    }
  },
  {
    attributeChangedCallback: ({ oldValue, value }) => (oldValue !== value) ? ({ active: value }) : false,
    connectedCallback: (e, render) => {
      e._buttonClick = render((_, __, { target }) => ({ active: target.getAttribute("name") }));
      for (let i = 0; i < e.children.length; i++) {
        const b = e.children[i];
        b.slot = "elements";
        if (!b.hasAttribute("name")) {
          b.setAttribute("name", String(i));
        }
        b.addEventListener("click", e._buttonClick);
      }
    },
    disconnectedCallback: (e) => {
      for (let i = 0; i < e.children.length; i++) {
        const b = e.children[i];
        b.removeEventListener("click", e._buttonClick);
      }
    },
    observedAttributes: ["data-active"],
    state: { active: null },
    template: () => {
      const t = window.document.createElement("template");
      t.innerHTML = `<style>
:host {
  display: flex;
}
::slotted(button) {
  margin: 0 1px 0 0;
}
::slotted(button:first-child) {
  border-radius: 12px 0 0 12px !important;
}
::slotted(button:last-child) {
  border-radius: 0 12px 12px 0 !important;
}
::slotted(button:not(:first-child):not(:last-child)) {
  border-radius: 0 !important;
}
</style>
<slot name="elements"></slot>`
      return t;
    }
  }
);
