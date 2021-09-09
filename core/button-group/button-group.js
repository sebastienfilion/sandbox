import {
  factorizeComponent,
  useAttributes,
  useCallbacks,
  useShadow,
  useTemplate,
} from "../../web-component/library/component.js";

const connectedCallback = (e, render) => {
  e._buttonClick = render((_, __, { target }) => ({
    active: target.getAttribute("name"),
  }));
  Array.from(e.children).forEach((b) => {
    b.slot = "elements";
    if (!b.hasAttribute("name")) {
      b.setAttribute("name", String(i));
    }
    b.addEventListener("click", e._buttonClick);
  });
};

const disconnectedCallback = (e) => {
  Array.from(e.children)
    .forEach((b) => b.removeEventListener("click", e._buttonClick));
};

window.customElements.define(
  "iy-button-group",
  factorizeComponent(
    (e, { active }) =>
      active &&
        Array.from(e.children).forEach(
          (b) => {
            if (b.getAttribute("name") !== active) {
              b.classList.remove("--active");
              b.removeAttribute("data-active");
            } else {
              b.classList.add("--active");
              b.setAttribute("data-active", "true");
            }
          },
        ) ||
      e,
    { active: false },
    useShadow(),
    useTemplate(
      () => {
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
<slot name="elements"></slot>`;
        return t;
      },
    ),
    useAttributes(
      ({ oldValue, value }) => oldValue !== value,
      {
        "data-active": (v) => !["false", "0"].includes(v) || !!v,
      },
    ),
    useCallbacks({ connectedCallback, disconnectedCallback }),
  ),
);
