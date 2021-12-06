const { Deno } = globalThis;
const noColor = typeof Deno?.noColor === "boolean" ? Deno.noColor : true;
let enabled = !noColor;
function code(open, close) {
  return {
    open: `\x1b[${open.join(";")}m`,
    close: `\x1b[${close}m`,
    regexp: new RegExp(`\\x1b\\[${close}m`, "g"),
  };
}
function run(str, code1) {
  return enabled
    ? `${code1.open}${str.replace(code1.regexp, code1.open)}${code1.close}`
    : str;
}
function bold(str) {
  return run(
    str,
    code([
      1,
    ], 22),
  );
}
function red(str) {
  return run(
    str,
    code([
      31,
    ], 39),
  );
}
function green(str) {
  return run(
    str,
    code([
      32,
    ], 39),
  );
}
function white(str) {
  return run(
    str,
    code([
      37,
    ], 39),
  );
}
function gray(str) {
  return brightBlack(str);
}
function brightBlack(str) {
  return run(
    str,
    code([
      90,
    ], 39),
  );
}
function bgRed(str) {
  return run(
    str,
    code([
      41,
    ], 49),
  );
}
function bgGreen(str) {
  return run(
    str,
    code([
      42,
    ], 49),
  );
}
const ANSI_PATTERN = new RegExp(
  [
    "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:[a-zA-Z\\d]*(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
    "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))",
  ].join("|"),
  "g",
);
function stripColor(string) {
  return string.replace(ANSI_PATTERN, "");
}
var DiffType;
(function (DiffType1) {
  DiffType1["removed"] = "removed";
  DiffType1["common"] = "common";
  DiffType1["added"] = "added";
})(DiffType || (DiffType = {}));
const REMOVED = 1;
const COMMON = 2;
const ADDED = 3;
function createCommon(A, B, reverse) {
  const common = [];
  if (A.length === 0 || B.length === 0) return [];
  for (let i = 0; i < Math.min(A.length, B.length); i += 1) {
    if (
      A[reverse ? A.length - i - 1 : i] === B[reverse ? B.length - i - 1 : i]
    ) {
      common.push(A[reverse ? A.length - i - 1 : i]);
    } else {
      return common;
    }
  }
  return common;
}
function diff(A, B) {
  const prefixCommon = createCommon(A, B);
  const suffixCommon = createCommon(
    A.slice(prefixCommon.length),
    B.slice(prefixCommon.length),
    true,
  ).reverse();
  A = suffixCommon.length
    ? A.slice(prefixCommon.length, -suffixCommon.length)
    : A.slice(prefixCommon.length);
  B = suffixCommon.length
    ? B.slice(prefixCommon.length, -suffixCommon.length)
    : B.slice(prefixCommon.length);
  const swapped = B.length > A.length;
  [A, B] = swapped
    ? [
      B,
      A,
    ]
    : [
      A,
      B,
    ];
  const M = A.length;
  const N = B.length;
  if (!M && !N && !suffixCommon.length && !prefixCommon.length) return [];
  if (!N) {
    return [
      ...prefixCommon.map((c) => ({
        type: DiffType.common,
        value: c,
      })),
      ...A.map((a) => ({
        type: swapped ? DiffType.added : DiffType.removed,
        value: a,
      })),
      ...suffixCommon.map((c) => ({
        type: DiffType.common,
        value: c,
      })),
    ];
  }
  const offset = N;
  const delta = M - N;
  const size = M + N + 1;
  const fp = new Array(size).fill({
    y: -1,
  });
  const routes = new Uint32Array((M * N + size + 1) * 2);
  const diffTypesPtrOffset = routes.length / 2;
  let ptr = 0;
  let p = -1;
  function backTrace(A1, B1, current, swapped1) {
    const M1 = A1.length;
    const N1 = B1.length;
    const result = [];
    let a = M1 - 1;
    let b = N1 - 1;
    let j = routes[current.id];
    let type = routes[current.id + diffTypesPtrOffset];
    while (true) {
      if (!j && !type) break;
      const prev = j;
      if (type === 1) {
        result.unshift({
          type: swapped1 ? DiffType.removed : DiffType.added,
          value: B1[b],
        });
        b -= 1;
      } else if (type === 3) {
        result.unshift({
          type: swapped1 ? DiffType.added : DiffType.removed,
          value: A1[a],
        });
        a -= 1;
      } else {
        result.unshift({
          type: DiffType.common,
          value: A1[a],
        });
        a -= 1;
        b -= 1;
      }
      j = routes[prev];
      type = routes[prev + diffTypesPtrOffset];
    }
    return result;
  }
  function createFP(slide, down, k, M1) {
    if (slide && slide.y === -1 && down && down.y === -1) {
      return {
        y: 0,
        id: 0,
      };
    }
    if (
      down && down.y === -1 || k === M1 ||
      (slide && slide.y) > (down && down.y) + 1
    ) {
      const prev = slide.id;
      ptr++;
      routes[ptr] = prev;
      routes[ptr + diffTypesPtrOffset] = ADDED;
      return {
        y: slide.y,
        id: ptr,
      };
    } else {
      const prev = down.id;
      ptr++;
      routes[ptr] = prev;
      routes[ptr + diffTypesPtrOffset] = REMOVED;
      return {
        y: down.y + 1,
        id: ptr,
      };
    }
  }
  function snake(k, slide, down, _offset, A1, B1) {
    const M1 = A1.length;
    const N1 = B1.length;
    if (k < -N1 || M1 < k) {
      return {
        y: -1,
        id: -1,
      };
    }
    const fp1 = createFP(slide, down, k, M1);
    while (fp1.y + k < M1 && fp1.y < N1 && A1[fp1.y + k] === B1[fp1.y]) {
      const prev = fp1.id;
      ptr++;
      fp1.id = ptr;
      fp1.y += 1;
      routes[ptr] = prev;
      routes[ptr + diffTypesPtrOffset] = COMMON;
    }
    return fp1;
  }
  while (fp[delta + offset].y < N) {
    p = p + 1;
    for (let k = -p; k < delta; ++k) {
      fp[k + offset] = snake(
        k,
        fp[k - 1 + offset],
        fp[k + 1 + offset],
        offset,
        A,
        B,
      );
    }
    for (let k1 = delta + p; k1 > delta; --k1) {
      fp[k1 + offset] = snake(
        k1,
        fp[k1 - 1 + offset],
        fp[k1 + 1 + offset],
        offset,
        A,
        B,
      );
    }
    fp[delta + offset] = snake(
      delta,
      fp[delta - 1 + offset],
      fp[delta + 1 + offset],
      offset,
      A,
      B,
    );
  }
  return [
    ...prefixCommon.map((c) => ({
      type: DiffType.common,
      value: c,
    })),
    ...backTrace(A, B, fp[delta + offset], swapped),
    ...suffixCommon.map((c) => ({
      type: DiffType.common,
      value: c,
    })),
  ];
}
function diffstr(A, B) {
  function tokenize(string, { wordDiff = false } = {}) {
    if (wordDiff) {
      const tokens = string.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/);
      const words =
        /^[a-zA-Z\u{C0}-\u{FF}\u{D8}-\u{F6}\u{F8}-\u{2C6}\u{2C8}-\u{2D7}\u{2DE}-\u{2FF}\u{1E00}-\u{1EFF}]+$/u;
      for (let i = 0; i < tokens.length - 1; i++) {
        if (
          !tokens[i + 1] && tokens[i + 2] && words.test(tokens[i]) &&
          words.test(tokens[i + 2])
        ) {
          tokens[i] += tokens[i + 2];
          tokens.splice(i + 1, 2);
          i--;
        }
      }
      return tokens.filter((token) => token);
    } else {
      const tokens = [], lines = string.split(/(\n|\r\n)/);
      if (!lines[lines.length - 1]) {
        lines.pop();
      }
      for (let i = 0; i < lines.length; i++) {
        if (i % 2) {
          tokens[tokens.length - 1] += lines[i];
        } else {
          tokens.push(lines[i]);
        }
      }
      return tokens;
    }
  }
  function createDetails(line, tokens) {
    return tokens.filter(({ type }) =>
      type === line.type || type === DiffType.common
    ).map((result, i, t) => {
      if (
        result.type === DiffType.common && t[i - 1] &&
        t[i - 1]?.type === t[i + 1]?.type && /\s+/.test(result.value)
      ) {
        result.type = t[i - 1].type;
      }
      return result;
    });
  }
  const diffResult = diff(tokenize(`${A}\n`), tokenize(`${B}\n`));
  const added = [], removed = [];
  for (const result of diffResult) {
    if (result.type === DiffType.added) {
      added.push(result);
    }
    if (result.type === DiffType.removed) {
      removed.push(result);
    }
  }
  const aLines = added.length < removed.length ? added : removed;
  const bLines = aLines === removed ? added : removed;
  for (const a of aLines) {
    let tokens = [], b;
    while (bLines.length) {
      b = bLines.shift();
      tokens = diff(
        tokenize(a.value, {
          wordDiff: true,
        }),
        tokenize(b?.value ?? "", {
          wordDiff: true,
        }),
      );
      if (
        tokens.some(({ type, value }) =>
          type === DiffType.common && value.trim().length
        )
      ) {
        break;
      }
    }
    a.details = createDetails(a, tokens);
    if (b) {
      b.details = createDetails(b, tokens);
    }
  }
  return diffResult;
}
const CAN_NOT_DISPLAY = "[Cannot display]";
class AssertionError1 extends Error {
  constructor(message) {
    super(message);
    this.name = "AssertionError";
  }
}
function _format1(v) {
  const { Deno: Deno1 } = globalThis;
  return typeof Deno1?.inspect === "function"
    ? Deno1.inspect(v, {
      depth: Infinity,
      sorted: true,
      trailingComma: true,
      compact: false,
      iterableLimit: Infinity,
    })
    : `"${String(v).replace(/(?=["\\])/g, "\\")}"`;
}
function createColor(diffType, { background = false } = {}) {
  switch (diffType) {
    case DiffType.added:
      return (s) => background ? bgGreen(white(s)) : green(bold(s));
    case DiffType.removed:
      return (s) => background ? bgRed(white(s)) : red(bold(s));
    default:
      return white;
  }
}
function createSign(diffType) {
  switch (diffType) {
    case DiffType.added:
      return "+   ";
    case DiffType.removed:
      return "-   ";
    default:
      return "    ";
  }
}
function buildMessage(diffResult, { stringDiff = false } = {}) {
  const messages = [], diffMessages = [];
  messages.push("");
  messages.push("");
  messages.push(
    `    ${gray(bold("[Diff]"))} ${red(bold("Actual"))} / ${
      green(bold("Expected"))
    }`,
  );
  messages.push("");
  messages.push("");
  diffResult.forEach((result) => {
    const c = createColor(result.type);
    const line = result.details?.map((detail) =>
      detail.type !== DiffType.common
        ? createColor(detail.type, {
          background: true,
        })(detail.value)
        : detail.value
    ).join("") ?? result.value;
    diffMessages.push(c(`${createSign(result.type)}${line}`));
  });
  messages.push(
    ...stringDiff
      ? [
        diffMessages.join(""),
      ]
      : diffMessages,
  );
  messages.push("");
  return messages;
}
function isKeyedCollection(x) {
  return [
    Symbol.iterator,
    "size",
  ].every((k) => k in x);
}
function equal1(c, d) {
  const seen = new Map();
  return (function compare(a, b) {
    if (
      a && b &&
      (a instanceof RegExp && b instanceof RegExp ||
        a instanceof URL && b instanceof URL)
    ) {
      return String(a) === String(b);
    }
    if (a instanceof Date && b instanceof Date) {
      const aTime = a.getTime();
      const bTime = b.getTime();
      if (Number.isNaN(aTime) && Number.isNaN(bTime)) {
        return true;
      }
      return a.getTime() === b.getTime();
    }
    if (Object.is(a, b)) {
      return true;
    }
    if (a && typeof a === "object" && b && typeof b === "object") {
      if (a && b && a.constructor !== b.constructor) {
        return false;
      }
      if (a instanceof WeakMap || b instanceof WeakMap) {
        if (!(a instanceof WeakMap && b instanceof WeakMap)) return false;
        throw new TypeError("cannot compare WeakMap instances");
      }
      if (a instanceof WeakSet || b instanceof WeakSet) {
        if (!(a instanceof WeakSet && b instanceof WeakSet)) return false;
        throw new TypeError("cannot compare WeakSet instances");
      }
      if (seen.get(a) === b) {
        return true;
      }
      if (Object.keys(a || {}).length !== Object.keys(b || {}).length) {
        return false;
      }
      if (isKeyedCollection(a) && isKeyedCollection(b)) {
        if (a.size !== b.size) {
          return false;
        }
        let unmatchedEntries = a.size;
        for (const [aKey, aValue] of a.entries()) {
          for (const [bKey, bValue] of b.entries()) {
            if (
              aKey === aValue && bKey === bValue && compare(aKey, bKey) ||
              compare(aKey, bKey) && compare(aValue, bValue)
            ) {
              unmatchedEntries--;
            }
          }
        }
        return unmatchedEntries === 0;
      }
      const merged = {
        ...a,
        ...b,
      };
      for (
        const key of [
          ...Object.getOwnPropertyNames(merged),
          ...Object.getOwnPropertySymbols(merged),
        ]
      ) {
        if (!compare(a && a[key], b && b[key])) {
          return false;
        }
        if (key in a && !(key in b) || key in b && !(key in a)) {
          return false;
        }
      }
      seen.set(a, b);
      if (a instanceof WeakRef || b instanceof WeakRef) {
        if (!(a instanceof WeakRef && b instanceof WeakRef)) return false;
        return compare(a.deref(), b.deref());
      }
      return true;
    }
    return false;
  })(c, d);
}
function assert1(expr, msg = "") {
  if (!expr) {
    throw new AssertionError1(msg);
  }
}
function assertEquals1(actual, expected, msg) {
  if (equal1(actual, expected)) {
    return;
  }
  let message1 = "";
  const actualString = _format1(actual);
  const expectedString = _format1(expected);
  try {
    const stringDiff = typeof actual === "string" &&
      typeof expected === "string";
    const diffResult = stringDiff
      ? diffstr(actual, expected)
      : diff(actualString.split("\n"), expectedString.split("\n"));
    const diffMsg = buildMessage(diffResult, {
      stringDiff,
    }).join("\n");
    message1 = `Values are not equal:\n${diffMsg}`;
  } catch {
    message1 = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
  }
  if (msg) {
    message1 = msg;
  }
  throw new AssertionError1(message1);
}
function assertNotEquals1(actual, expected, msg) {
  if (!equal1(actual, expected)) {
    return;
  }
  let actualString;
  let expectedString;
  try {
    actualString = String(actual);
  } catch {
    actualString = "[Cannot display]";
  }
  try {
    expectedString = String(expected);
  } catch {
    expectedString = "[Cannot display]";
  }
  if (!msg) {
    msg = `actual: ${actualString} expected: ${expectedString}`;
  }
  throw new AssertionError1(msg);
}
function assertStrictEquals1(actual, expected, msg) {
  if (actual === expected) {
    return;
  }
  let message1;
  if (msg) {
    message1 = msg;
  } else {
    const actualString = _format1(actual);
    const expectedString = _format1(expected);
    if (actualString === expectedString) {
      const withOffset = actualString.split("\n").map((l) => `    ${l}`).join(
        "\n",
      );
      message1 =
        `Values have the same structure but are not reference-equal:\n\n${
          red(withOffset)
        }\n`;
    } else {
      try {
        const stringDiff = typeof actual === "string" &&
          typeof expected === "string";
        const diffResult = stringDiff
          ? diffstr(actual, expected)
          : diff(actualString.split("\n"), expectedString.split("\n"));
        const diffMsg = buildMessage(diffResult, {
          stringDiff,
        }).join("\n");
        message1 = `Values are not strictly equal:\n${diffMsg}`;
      } catch {
        message1 = `\n${red(CAN_NOT_DISPLAY)} + \n\n`;
      }
    }
  }
  throw new AssertionError1(message1);
}
function assertNotStrictEquals1(actual, expected, msg) {
  if (actual !== expected) {
    return;
  }
  throw new AssertionError1(
    msg ?? `Expected "actual" to be strictly unequal to: ${_format1(actual)}\n`,
  );
}
function assertExists1(actual, msg) {
  if (actual === undefined || actual === null) {
    if (!msg) {
      msg = `actual: "${actual}" expected to not be null or undefined`;
    }
    throw new AssertionError1(msg);
  }
}
function assertStringIncludes1(actual, expected, msg) {
  if (!actual.includes(expected)) {
    if (!msg) {
      msg = `actual: "${actual}" expected to contain: "${expected}"`;
    }
    throw new AssertionError1(msg);
  }
}
function assertArrayIncludes1(actual, expected, msg) {
  const missing = [];
  for (let i = 0; i < expected.length; i++) {
    let found = false;
    for (let j = 0; j < actual.length; j++) {
      if (equal1(expected[i], actual[j])) {
        found = true;
        break;
      }
    }
    if (!found) {
      missing.push(expected[i]);
    }
  }
  if (missing.length === 0) {
    return;
  }
  if (!msg) {
    msg = `actual: "${_format1(actual)}" expected to include: "${
      _format1(expected)
    }"\nmissing: ${_format1(missing)}`;
  }
  throw new AssertionError1(msg);
}
function assertMatch1(actual, expected, msg) {
  if (!expected.test(actual)) {
    if (!msg) {
      msg = `actual: "${actual}" expected to match: "${expected}"`;
    }
    throw new AssertionError1(msg);
  }
}
function assertNotMatch1(actual, expected, msg) {
  if (expected.test(actual)) {
    if (!msg) {
      msg = `actual: "${actual}" expected to not match: "${expected}"`;
    }
    throw new AssertionError1(msg);
  }
}
function assertObjectMatch1(actual, expected) {
  const seen = new WeakMap();
  return assertEquals1(
    function filter(a, b) {
      if (seen.has(a) && seen.get(a) === b) {
        return a;
      }
      seen.set(a, b);
      const filtered = {};
      const entries = [
        ...Object.getOwnPropertyNames(a),
        ...Object.getOwnPropertySymbols(a),
      ].filter((key) => key in b).map((key) => [
        key,
        a[key],
      ]);
      for (const [key, value] of entries) {
        if (Array.isArray(value)) {
          const subset = b[key];
          if (Array.isArray(subset)) {
            filtered[key] = value.slice(0, subset.length).map(
              (element, index) => {
                const subsetElement = subset[index];
                if (typeof subsetElement === "object" && subsetElement) {
                  return filter(element, subsetElement);
                }
                return element;
              },
            );
            continue;
          }
        } else if (typeof value === "object") {
          const subset = b[key];
          if (typeof subset === "object" && subset) {
            filtered[key] = filter(value, subset);
            continue;
          }
        }
        filtered[key] = value;
      }
      return filtered;
    }(actual, expected),
    expected,
  );
}
function fail1(msg) {
  assert1(false, `Failed assertion${msg ? `: ${msg}` : "."}`);
}
function assertThrows1(fn, ErrorClass, msgIncludes = "", msg) {
  let doesThrow = false;
  try {
    fn();
  } catch (e) {
    if (e instanceof Error === false) {
      throw new AssertionError1("A non-Error object was thrown.");
    }
    if (ErrorClass && !(e instanceof ErrorClass)) {
      msg =
        `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${
          msg ? `: ${msg}` : "."
        }`;
      throw new AssertionError1(msg);
    }
    if (
      msgIncludes && !stripColor(e.message).includes(stripColor(msgIncludes))
    ) {
      msg =
        `Expected error message to include "${msgIncludes}", but got "${e.message}"${
          msg ? `: ${msg}` : "."
        }`;
      throw new AssertionError1(msg);
    }
    doesThrow = true;
  }
  if (!doesThrow) {
    msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
    throw new AssertionError1(msg);
  }
}
async function assertRejects1(fn, ErrorClass, msgIncludes = "", msg) {
  let doesThrow = false;
  try {
    await fn();
  } catch (e) {
    if (e instanceof Error === false) {
      throw new AssertionError1("A non-Error object was thrown or rejected.");
    }
    if (ErrorClass && !(e instanceof ErrorClass)) {
      msg =
        `Expected error to be instance of "${ErrorClass.name}", but was "${e.constructor.name}"${
          msg ? `: ${msg}` : "."
        }`;
      throw new AssertionError1(msg);
    }
    if (
      msgIncludes && !stripColor(e.message).includes(stripColor(msgIncludes))
    ) {
      msg =
        `Expected error message to include "${msgIncludes}", but got "${e.message}"${
          msg ? `: ${msg}` : "."
        }`;
      throw new AssertionError1(msg);
    }
    doesThrow = true;
  }
  if (!doesThrow) {
    msg = `Expected function to throw${msg ? `: ${msg}` : "."}`;
    throw new AssertionError1(msg);
  }
}
export { assertRejects1 as assertThrowsAsync };
function unimplemented1(msg) {
  throw new AssertionError1(msg || "unimplemented");
}
function unreachable1() {
  throw new AssertionError1("unreachable");
}
export { AssertionError1 as AssertionError };
export { _format1 as _format };
export { equal1 as equal };
export { assert1 as assert };
export { assertEquals1 as assertEquals };
export { assertNotEquals1 as assertNotEquals };
export { assertStrictEquals1 as assertStrictEquals };
export { assertNotStrictEquals1 as assertNotStrictEquals };
export { assertExists1 as assertExists };
export { assertStringIncludes1 as assertStringIncludes };
export { assertArrayIncludes1 as assertArrayIncludes };
export { assertMatch1 as assertMatch };
export { assertNotMatch1 as assertNotMatch };
export { assertObjectMatch1 as assertObjectMatch };
export { fail1 as fail };
export { assertThrows1 as assertThrows };
export { assertRejects1 as assertRejects };
export { unimplemented1 as unimplemented };
export { unreachable1 as unreachable };
