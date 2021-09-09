export const deferUntil = (e, f, d = 1000 * 5) =>
  new Promise((resolve, reject) => {
    if (f(e)) resolve();
    else {
      let t1, t2;
      t1 = setTimeout(() => {
        reject(new Error("Timed out"));
        t1 && clearTimeout(t1);
        t2 && clearInterval(t2);
      }, d);
      t2 = setInterval(() => {
        if (f(e)) {
          resolve(e);
          t1 && clearTimeout(t1);
          t2 && clearInterval(t2);
        }
      });
    }
  });

export const deferUntilNextFrame = () =>
  new Promise(
    (resolve) => window.requestAnimationFrame(() => resolve()),
  );

export const disconnectAllElements = (e) => {
  for (const k in e.elements) {
    for (const f of b.listeners) {
      if (e.elements.hasOwnProperty(k)) {
        e.elements[k].removeEventListener(f)
      }
    }
  }
};

export const intersects = (xs, ys) => ys && ys.reduce(
  (b, y) => !xs.includes(y) ? false : b,
  true
) || false;

export const maybeCall = (f, e, ...xs) => {
  const p = f && f.call(e, ...xs);

  return (p instanceof Promise ? p : Promise.resolve(p));
};

export const parseSelectorForElement = (e) => {
  const as = [ e.localName ];
  for (const { name, value } of e.attributes) {
    if (name === "class") {
      as.push(
        ...value.split(" ").map((x) => `.${x}`)
      );
    } else {
      as.push(
        name === "id" ? `#${value}` : `[${name}="${value}"]`
      );
    }
  }
  return as;
};

export const randomUUID = () => window.crypto.randomUUID &&
  window.crypto.randomUUID() ||
  "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    let r = Math.random() * 16 | 0,
      v = c === "x" ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });

export const removeAllChildren = (e) => {
  while (e.firstElementChild) {
    e.removeChild(e.firstElementChild);
  }
};

const compose = (f, g, x) => f(g(x));

export const appendElement = (x, y) => x.append(y) || y;
export const appendNode = (x, y) => x.appendChild(y) || y;
export const prependElement = (x, y) => x.prepend(y) || y;

export const requestIdleCallback = (f, d = 1000) => window.requestIdleCallback &&
  window.requestIdleCallback(f, { timeout: d }) ||
  window.setTimeout(f);

/**
 * Renders elements given an iterable.
 *
 */
export const renderFor = (te, xs, f, g = appendElement, h = (x) => x.key) => {
  const fragment = window.document.createDocumentFragment();
  if (xs.length >= te.children.length) {
    const es = Array.from(xs).map((x, i, xs) => renderOnce(
      te,
      (te) => {
        const e = f(te, x, i, xs);
        e.dataset.key = h(x) || String(i);
        return e;
      },
      (_, e) => g(fragment, e),
    ));
    te.appendChild(fragment);
    return es;
  }
  removeAllChildren(te);
  return Array.from(xs).map((x) => g(te, f(te, x)));
};

export const renderIf = (te, k, f, g = (x) => x, ...xs) => {
  removeAllChildren(te);
  return (k) ? f(te, ...xs) : g(te, ...xs);
};

export const renderOnce = (
  te,
  f,
  g = appendElement,
  h = (te, e) => te.querySelector(parseSelectorForElement(e).join("")),
) => {
  const e = f(te);
  return h(te, e) || g(te, e);
};

