import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Static accessibility guard for the Edit (step 2) and Review (step 3) takeoff pages.
 *
 * Lighthouse reports "Buttons do not have an accessible name" and "Form elements do not have
 * associated labels" when a `<button>` renders only an icon, or an `<input>`/`<select>` has no
 * `aria-label`, `title`, wrapping `<label>`, or `<label htmlFor>` pointing at its `id`.
 *
 * This scanner reads the JSX source with a dependency-free tag parser (the repo ships no JS parser)
 * and fails with the exact file and line of every unnamed control, so the fix cannot regress.
 */
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/**
 * Components rendered on the edit (step 2) and review (step 3) takeoff pages: the workspace shell,
 * the step surface, and the on-demand surfaces a user can open from them (rates drawer, column
 * mapping, scope panel, export modal).
 */
const EDIT_AND_REVIEW_COMPONENTS = [
  'src/product/components/ProjectWorkspace.tsx',
  'src/product/components/Stepper.tsx',
  'src/product/components/EditStep.tsx',
  'src/product/components/TakeoffGrid.tsx',
  'src/product/components/ScopeInclusionsModal.tsx',
  'src/product/components/ResultsStep.tsx',
  'src/product/components/RatesDrawer.tsx',
  'src/product/components/ColumnMappingModal.tsx',
  'src/product/components/ExportFormatsModal.tsx',
  'src/product/components/ScopeSummaryDisplay.tsx',
  'src/product/components/QuoteContactPanel.tsx',
];

const CONTROL_TAGS = new Set(['button', 'input', 'select', 'textarea']);

interface JsxTag {
  name: string;
  start: number;
  end: number;
  selfClosing: boolean;
  markup: string;
}

/** Every opening JSX tag in a source file, with the offset range of its markup. */
function findTags(source: string): JsxTag[] {
  const tags: JsxTag[] = [];

  for (const match of source.matchAll(/<([A-Za-z][\w.:-]*)/g)) {
    const start = match.index ?? 0;
    const name = match[1];
    const afterName = source[start + match[0].length];
    // Reject comparisons/generics (`a < b`, `Array<T>`), which are not tags.
    if (afterName !== undefined && !/[\s/>]/.test(afterName)) continue;

    let index = start + match[0].length;
    let braceDepth = 0;
    let quote: string | null = null;

    for (; index < source.length; index += 1) {
      const character = source[index];

      if (quote) {
        if (character === '\\') index += 1;
        else if (character === quote) quote = null;
        continue;
      }
      if (character === '"' || character === "'" || character === '`') {
        quote = character;
        continue;
      }
      if (character === '{') {
        braceDepth += 1;
        continue;
      }
      if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
        continue;
      }
      if (character === '>' && braceDepth === 0) break;
    }

    const markup = source.slice(start, index + 1);
    tags.push({ name, start, end: index + 1, selfClosing: /\/>$/.test(markup), markup });
  }

  return tags;
}

/** True when the tag declares the attribute (including bare boolean attributes). */
function hasAttribute(tag: JsxTag, name: string): boolean {
  return new RegExp(`(?:^|\\s)${name}(?:\\s*=|\\s|/?>)`, 'm').test(tag.markup);
}

/** Literal value of an attribute, or null when it is absent or computed at runtime. */
function literalAttributeValue(tag: JsxTag, name: string): string | null {
  const match = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`, 'm').exec(tag.markup);
  return match ? (match[1] ?? match[2] ?? '') : null;
}

/** Offset range of each `<label>`'s contents (labels are never nested in this codebase). */
function labelRanges(source: string, tags: JsxTag[]): Array<[number, number]> {
  return tags
    .filter((tag) => tag.name === 'label' && !tag.selfClosing)
    .map((tag) => {
      const close = source.indexOf('</label>', tag.end);
      return [tag.end, close < 0 ? source.length : close] as [number, number];
    });
}

/** True when the element's children contain text or a runtime expression that renders text. */
function hasRenderableContent(source: string, tags: JsxTag[], tag: JsxTag): boolean {
  if (tag.selfClosing) return false;

  const close = source.indexOf(`</${tag.name}>`, tag.end);
  const contentEnd = close < 0 ? source.length : close;
  let content = source.slice(tag.end, contentEnd);

  // Blank out nested tags (icons included) so only text and `{...}` expressions remain. Closing
  // tags are removed too, or `</svg>` alone would read as a label.
  for (const nested of tags) {
    if (nested.start < tag.end || nested.end > contentEnd) continue;
    const relativeStart = nested.start - tag.end;
    const relativeEnd = nested.end - tag.end;
    content = `${content.slice(0, relativeStart)}${' '.repeat(relativeEnd - relativeStart)}${content.slice(relativeEnd)}`;
  }
  content = content.replace(/<\/[A-Za-z][\w.:-]*\s*>/g, ' ');

  return content.trim() !== '';
}

const lineOf = (source: string, index: number): number => source.slice(0, index).split('\n').length;

interface Violation {
  line: number;
  tag: string;
  reason: string;
}

/** Unnamed buttons and unlabeled form controls in one source file. */
function findFormControlViolations(source: string): Violation[] {
  const tags = findTags(source);
  const htmlFor = new Set(
    tags
      .filter((tag) => tag.name === 'label')
      .map((tag) => literalAttributeValue(tag, 'htmlFor'))
      .filter((value): value is string => Boolean(value)),
  );
  const labels = labelRanges(source, tags);
  const violations: Violation[] = [];

  for (const tag of tags) {
    if (!CONTROL_TAGS.has(tag.name)) continue;

    const ariaLabelled =
      hasAttribute(tag, 'aria-label') || hasAttribute(tag, 'aria-labelledby') || hasAttribute(tag, 'title');
    const id = literalAttributeValue(tag, 'id');
    const explicitlyAssociated = Boolean(id && htmlFor.has(id));
    const wrappedByLabel = labels.some(([start, end]) => tag.start >= start && tag.end <= end);
    const isHiddenInput = literalAttributeValue(tag, 'type') === 'hidden';

    if (isHiddenInput) continue;

    if (tag.name === 'button') {
      const named = ariaLabelled || hasRenderableContent(source, tags, tag);
      if (!named) {
        violations.push({ line: lineOf(source, tag.start), tag: 'button', reason: 'no accessible name (icon-only)' });
      }
      continue;
    }

    const nativeValueName =
      tag.name === 'input' &&
      ['submit', 'button', 'reset'].includes(literalAttributeValue(tag, 'type') ?? '') &&
      hasAttribute(tag, 'value');

    if (!ariaLabelled && !explicitlyAssociated && !wrappedByLabel && !nativeValueName) {
      violations.push({
        line: lineOf(source, tag.start),
        tag: tag.name,
        reason: 'no associated <label>, aria-label, aria-labelledby, or title',
      });
    }
  }

  return violations;
}

/** The scanner must be trustworthy before it is used to assert anything. */
describe('form control label scanner', () => {
  it('flags icon-only buttons and unlabeled controls', () => {
    assert.deepEqual(findFormControlViolations('<button><svg /></button>'), [
      { line: 1, tag: 'button', reason: 'no accessible name (icon-only)' },
    ]);
    assert.deepEqual(findFormControlViolations('<input type="text" />').map((v) => v.tag), ['input']);
    assert.deepEqual(findFormControlViolations('<select><option /></select>').map((v) => v.tag), ['select']);
  });

  it('accepts every accessible labelling technique', () => {
    assert.deepEqual(findFormControlViolations('<button aria-label="Close"><svg /></button>'), []);
    assert.deepEqual(findFormControlViolations('<button title="Delete row"><svg /></button>'), []);
    assert.deepEqual(findFormControlViolations('<button>{t("save")}</button>'), []);
    assert.deepEqual(findFormControlViolations('<button>Save</button>'), []);
    assert.deepEqual(findFormControlViolations('<input aria-label="Quantity" />'), []);
    assert.deepEqual(findFormControlViolations('<label htmlFor="qty">Quantity</label><input id="qty" />'), []);
    assert.deepEqual(findFormControlViolations('<label>Quantity <input /></label>'), []);
    assert.deepEqual(findFormControlViolations('<input type="hidden" name="x" />'), []);
  });
});

describe('Edit and review takeoff pages expose named controls', () => {
  for (const relativePath of EDIT_AND_REVIEW_COMPONENTS) {
    it(`${relativePath} labels every button and form control`, () => {
      const source = readFileSync(path.join(projectRoot, relativePath), 'utf8');
      const violations = findFormControlViolations(source);

      assert.deepEqual(
        violations.map((violation) => `${relativePath}:${violation.line} <${violation.tag}> ${violation.reason}`),
        [],
      );
    });
  }
});
