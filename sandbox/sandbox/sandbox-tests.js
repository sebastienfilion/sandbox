import {
  factorizeComponent,
  useProperties,
  useShadow
} from "/web-component/library/component.js";
import {
  renderFor
} from "/web-component/library/utilities.js";

window.customElements.define(
  "iy-sandbox-tests",
  factorizeComponent(
    (e, { tests }) => {
      renderFor(
        e.shadowRoot,
        tests,
        (te, { name, f }) => {
          const e = window.document.createElement("iy-sandbox-test");
          e.dataset.name = name;
          e.f = f;
          return e;
        }
      );
    },
    { testsHref: null },
    useShadow(),
    useAttributes(
      ({ oldValue, value }) => oldValue !== value,
      {
        "data-tests-href": (v) => v
      }
    )
  )
);

/*
 setTimeout(() => {
    const tests = window[Symbol.for("iy-tests")].get(window.location.href);
    for (const [ f, { name } ] of tests.entries()) {

      new Promise((resolve, reject) => {
        try {
          const p = f(document.createDocumentFragment());

          resolve(p);
        } catch (e) {
          reject(e);
        }
      })
        .then(
          () => console.debug(`Test - ${name}... %cSuccess!`, "color: green"),
          (e) => console.debug(`Test - ${name}... %cFailure!`, "color: red")
            || console.error(e)
        );
    }
  }, 1000);
 */
