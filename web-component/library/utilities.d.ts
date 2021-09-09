export function renderFor<X, E extends HTMLElement, T extends HTMLElement> (
  te: T,
  xs: Iterable<X>,
  f: (te: T, x: X, i: number, xs: Iterable<X>) => E,
  g?: (te: T, e: E) => E,
  h?: (x: unknown) => string
): Iterable<E>

export function renderIf<E extends HTMLElement, T extends HTMLElement> (
  te: T,
  k: boolean,
  f: (te: T) => HTMLElement,
  g?: (te: T) => HTMLElement,
)
