import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const sourceExtensions = new Set(['.html', '.htm', '.js', '.jsx', '.ts', '.tsx']);

function getSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      return getSourceFiles(entryPath);
    }

    return sourceExtensions.has(path.extname(entry.name)) ? [entryPath] : [];
  });
}

function getImageTags(source) {
  const tags = [];

  for (const match of source.matchAll(/<img\b/g)) {
    let braceDepth = 0;
    let quote = null;

    for (let index = match.index + match[0].length; index < source.length; index += 1) {
      const character = source[index];

      if (quote) {
        if (character === '\\') {
          index += 1;
        } else if (character === quote) {
          quote = null;
        }
        continue;
      }

      if (character === '"' || character === "'" || character === '`') {
        quote = character;
      } else if (character === '{') {
        braceDepth += 1;
      } else if (character === '}') {
        braceDepth = Math.max(0, braceDepth - 1);
      } else if (character === '>' && braceDepth === 0) {
        tags.push({ markup: source.slice(match.index, index + 1), index: match.index });
        break;
      }
    }
  }

  return tags;
}

function findImagesWithoutAlt(source) {
  return getImageTags(source).filter(({ markup }) => !/\balt\s*=/.test(markup));
}

function lineNumber(source, index) {
  return source.slice(0, index).split('\n').length;
}

describe('Image alternative text', () => {
  it('detects images without an alt attribute', () => {
    assert.equal(findImagesWithoutAlt('<img src="/logo.png" />').length, 1);
    assert.equal(findImagesWithoutAlt('<img src="/logo.png" alt="Company logo" />').length, 0);
    assert.equal(findImagesWithoutAlt('<img src={logoUrl} alt="" />').length, 0);
    assert.equal(findImagesWithoutAlt('<img src={logoUrl} alt={companyName} />').length, 0);
  });

  it('requires every frontend image to declare alt text or an empty decorative alt', () => {
    const sourceDirectories = [path.join(projectRoot, 'src'), path.join(projectRoot, 'public')];
    const missingAlt = [];

    for (const directory of sourceDirectories) {
      for (const filePath of getSourceFiles(directory)) {
        const source = readFileSync(filePath, 'utf8');

        for (const image of findImagesWithoutAlt(source)) {
          missingAlt.push(`${path.relative(projectRoot, filePath)}:${lineNumber(source, image.index)}`);
        }
      }
    }

    assert.deepEqual(
      missingAlt,
      [],
      `Images must declare alt text or alt="" when decorative:\n${missingAlt.join('\n')}`,
    );
  });
});