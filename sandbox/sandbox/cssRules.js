import { intersects, parseSelectorForElement } from "../../web-component/library/utilities.js";

const filterCssRules = (selectors, cssRules) => {
  let xs = [];
  for (const r of cssRules) {
    if (!r.selectorText) {
      if (r.cssRules) {
        xs.push(...filterCssRules(selectors, r.cssRules));
      }
      continue;
    }
    const isApplicable = r.selectorText.split(/\s*,\s*/)
      .reduce(
        (a, x) => {
          const ns = x.split(/\s|\s*>\s*|\s*\+\s*|\s*~\s*/g);

          const b = intersects(
            selectors,
            (ns && ns[ns.length - 1] || x).match(/^\w+|[#.\[].+?(?=[#.\[:]|$)/g)
          );

          return b ? b : a;
        },
        false
      );
    isApplicable && xs.push(r);
  }
  return xs;
}

const filterStyleSheets = (selectors, styleSheets) => {
  let xs = [];
  for (const s of styleSheets) {
    // Some style sheets are not accessible because of CORS
    try { s.cssRules } catch (e) { continue }
    xs.push(...filterCssRules(selectors, s.cssRules));
  }
  return xs;
}

export const getApplicableStyles = (e, styleSheets) => {
  const selectors = parseSelectorForElement(e);

  return filterStyleSheets(selectors, styleSheets);
};
