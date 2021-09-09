import { assert } from "./asserts.js";
import { factorizeSpy, test } from "./testing.js";
import {
  appendElement,
  deferUntil,
  deferUntilNextFrame,
  prependElement,
  randomUUID,
  renderFor
} from "./utilities.js";

window.requestAnimationFrame = (f) => setTimeout(f);

test(
  "deferUntil",
  () => {
    const e = { i: 0 };

    const t = setInterval(
      () => ++e.i,
      100,
    );

    return deferUntil(e, (e) => e.i > 20)
      .then((e) => {
        assert(e.i > 20);
        clearInterval(t);
      });
  },
);

test(
  "deferUntilNextFrame",
  () => deferUntilNextFrame(),
);

test(
  "renderFor: with appendElement",
  (te) => {
    const es = renderFor(
      te,
      Array(10).fill(0).map(() => ({ key: randomUUID() })),
      (_, __, i) => {
        const e = window.document.createElement("div");
        e.dataset.index = i;
        return e;
      },
      appendElement
    );
    assert(es.length === 10);
    Array.from(te.children).forEach((e, i) => {
      assert(e.dataset.index === String(i));
    });
  }
);

test(
  "renderFor: with prependElement",
  (te) => {
    renderFor(
      te,
      Array(10).fill(0).map(() => ({ key: randomUUID() })),
      (_, k, i) => {
        const e = window.document.createElement("div");
        e.dataset.index = String(i);
        return e;
      },
      prependElement
    );
    Array.from(te.children).forEach((e, i) => {
      assert(e.dataset.index === String((te.children.length - 1) - i));
    });
  }
);
