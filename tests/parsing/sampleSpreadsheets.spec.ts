import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { CsvParserService } from '../../../takeoff-engine-backend/src/product/services/csvParser.service.ts';

/**
 * Parses the spreadsheet files shipped in `public/product/samples` with the real backend
 * ingestion engine (the exact function reached by `POST /api/takeoffs/parse`) and asserts that
 * every logical table in every sheet is imported.
 *
 * Run with: `npm run test:parsing`
 */

const SAMPLES_DIR = path.resolve(import.meta.dirname, '../../public/product/samples');
const EXCEL_EXTENSIONS = /\.(xlsx?|xlsm|xlsb)$/i;

/** A representative line item that a correct parse must contain. */
interface ExpectedItem {
  /** Trade/system as it should appear on the parsed item. */
  system: string;
  /** Substring matched against the parsed description; omit to accept any description. */
  descriptionIncludes?: string;
  quantity?: number;
  unit?: string;
}

/** The parser payload as read by this harness (permissive: not every shape is present). */
interface ParsedPayload {
  items?: Array<Record<string, unknown>>;
  requiresMappingModal?: boolean;
  detectedLaborMode?: string;
  subTables?: unknown[];
  errors?: unknown[];
  sheetNames?: string[];
  [key: string]: unknown;
}

interface SampleSheet {
  file: string;
  /** Worksheet to parse; only used for Excel samples. */
  sheet?: string;
  /** When true, the sheet is ambiguous enough that the column mapping modal must open. */
  expectsMappingModal?: boolean;
  /** Number of side-by-side sub-tables the modal must offer (only for mapping-modal samples). */
  expectedSubTables?: number;
  /** Total line items expected once every table in the sheet is imported. */
  expectedItemCount?: number;
  /** Representative items covering each logical table in the sheet. */
  expectedItems?: ExpectedItem[];
}

// Appended to every CSV sample in commit f57d74a as a second, stacked table. A correct parse
// imports these alongside the vendor/main table above them.
const EQUIPMENT_ITEMS: ExpectedItem[] = [
  { system: 'Equipment & Mobilization', descriptionIncludes: 'Mini-Excavator Rental', quantity: 1, unit: 'WK' },
  { system: 'Equipment & Mobilization', descriptionIncludes: 'Skid Steer Loader Rental', quantity: 1, unit: 'WK' },
  { system: 'Equipment & Mobilization', descriptionIncludes: 'Generator & Light Tower Rental', quantity: 1, unit: 'WK' },
];

const CSV_SAMPLES: SampleSheet[] = [
  {
    file: 'sample_takeoff.csv',
    expectedItemCount: 16, // 13 main takeoff rows + 3 equipment rows
    expectedItems: [
      { system: 'Sanitary', quantity: 275, unit: 'LF' },
      { system: 'Storm', quantity: 95, unit: 'LF' },
      { system: 'Domestic Water', quantity: 1, unit: 'EA' },
      ...EQUIPMENT_ITEMS,
    ],
  },
  {
    file: 'sample_bluebeam_takeoff.csv',
    expectedItemCount: 14, // 11 vendor rows + 3 equipment rows
    expectedItems: [
      { system: 'Sanitary Sewer', quantity: 275, unit: 'LF' },
      { system: 'Storm Drainage', quantity: 5, unit: 'EA' },
      { system: 'Water Distribution', quantity: 2, unit: 'EA' },
      ...EQUIPMENT_ITEMS,
    ],
  },
  {
    file: 'sample_planswift_takeoff.csv',
    expectedItemCount: 12, // 9 vendor rows + 3 equipment rows
    expectedItems: [
      { system: 'Sanitary Utilities', quantity: 2, unit: 'EA' },
      { system: 'Storm Utilities', quantity: 160, unit: 'LF' },
      { system: 'Water Utilities', quantity: 540, unit: 'LF' },
      ...EQUIPMENT_ITEMS,
    ],
  },
  {
    file: 'sample_trimble_agtek_takeoff.csv',
    expectedItemCount: 8, // 5 vendor rows + 3 equipment rows
    expectedItems: [
      { system: 'Site Earthwork & Trenching', quantity: 350, unit: 'LF' },
      { system: 'Paving & Restoration', quantity: 640, unit: 'LF' },
      ...EQUIPMENT_ITEMS,
    ],
  },
  {
    // Ambiguous custom headers plus two side-by-side scope tables: the engine must ask the user to
    // confirm the column mapping instead of guessing.
    file: 'sample_edge_cases_takeoff.csv',
    expectsMappingModal: true,
    expectedSubTables: 2,
  },
];

const EXCEL_SAMPLE: SampleSheet = {
  file: 'sample_takeoff.xlsx',
  sheet: 'Takeoff',
  expectedItemCount: 13,
  expectedItems: [
    { system: 'Sanitary', quantity: 275, unit: 'LF' },
    { system: 'Storm', quantity: 320, unit: 'LF' },
    { system: 'Domestic Water', quantity: 410, unit: 'LF' },
  ],
};

async function parseSample(fileName: string, sheetName: string | null = null): Promise<ParsedPayload> {
  const fullPath = path.join(SAMPLES_DIR, fileName);
  const result = await CsvParserService.parseTakeoffPayload(
    EXCEL_EXTENSIONS.test(fileName)
      ? { fileBuffer: fs.readFileSync(fullPath), fileName, sheetName }
      : { fileContent: fs.readFileSync(fullPath, 'utf8'), fileName, sheetName: null },
  );
  return result as unknown as ParsedPayload;
}

const normalize = (value: unknown): string => String(value ?? '').trim().toLowerCase();

function matches(item: Record<string, unknown>, expected: ExpectedItem): boolean {
  if (normalize(item.system) !== normalize(expected.system)) return false;
  if (expected.descriptionIncludes && !normalize(item.description).includes(normalize(expected.descriptionIncludes))) return false;
  if (expected.quantity !== undefined && Math.abs(Number(item.quantity) - expected.quantity) > 1e-6) return false;
  if (expected.unit !== undefined && normalize(item.unit) !== normalize(expected.unit)) return false;
  return true;
}

const describeItem = (expected: ExpectedItem): string =>
  [expected.system, expected.descriptionIncludes && `"${expected.descriptionIncludes}"`, expected.quantity, expected.unit]
    .filter((part) => part !== undefined && part !== '')
    .join(' / ');

/** Asserts a single parsed sheet imported every table it contains. */
function assertSheetParsed(parsed: ParsedPayload, sample: SampleSheet): void {
  const items: Array<Record<string, unknown>> = parsed.items ?? [];
  const label = `${sample.file}${sample.sheet ? ` [${sample.sheet}]` : ''}`;
  const summary = [
    `${label} parsed ${items.length} item(s).`,
    `requiresMappingModal: ${Boolean(parsed.requiresMappingModal)}; detected labor mode: ${parsed.detectedLaborMode ?? 'n/a'}; sub-tables: ${(parsed.subTables ?? []).length}.`,
    `warnings/errors: ${JSON.stringify(parsed.errors ?? [])}`,
    `systems imported: ${JSON.stringify([...new Set(items.map((item) => item.system))])}`,
  ].join('\n  ');

  if (sample.expectsMappingModal) {
    expect(
      Boolean(parsed.requiresMappingModal),
      `${summary}\nThis sheet is ambiguous (custom headers / side-by-side tables) and must open the column mapping modal instead of guessing.`,
    ).toBe(true);
    if (sample.expectedSubTables !== undefined) {
      expect(
        (parsed.subTables ?? []).length,
        `${summary}\nExpected ${sample.expectedSubTables} side-by-side table(s) for the user to choose from.`,
      ).toBe(sample.expectedSubTables);
    }
    return;
  }

  expect(
    Boolean(parsed.requiresMappingModal),
    `${summary}\nThese samples have canonical/vendor headers that must auto-map without the mapping modal.`,
  ).toBe(false);

  const missing = (sample.expectedItems ?? []).filter((expected) => !items.some((item) => matches(item, expected)));
  expect(
    missing.map(describeItem),
    `${summary}\nMissing expected line items (a table was dropped).`,
  ).toEqual([]);

  if (sample.expectedItemCount !== undefined) {
    expect(
      items.length,
      `${summary}\nExpected ${sample.expectedItemCount} line items across every table in the sheet.`,
    ).toBe(sample.expectedItemCount);
  }
}

test.describe('CSV takeoff samples', () => {
  for (const sample of CSV_SAMPLES) {
    const title = sample.expectsMappingModal
      ? `${sample.file} opens the column mapping modal`
      : `${sample.file} imports its main table and the appended equipment table`;
    test(title, async () => {
      assertSheetParsed(await parseSample(sample.file), sample);
    });
  }
});

test.describe('Excel takeoff sample', () => {
  test('sample_takeoff.xlsx imports every worksheet', async () => {
    const workbook = await parseSample(EXCEL_SAMPLE.file);
    const sheetNames: string[] = workbook.sheetNames ?? [];
    expect(sheetNames.length, 'Expected the workbook to expose at least one worksheet.').toBeGreaterThan(0);

    for (const sheetName of sheetNames) {
      const parsed = await parseSample(EXCEL_SAMPLE.file, sheetName);
      assertSheetParsed(parsed, { ...EXCEL_SAMPLE, sheet: sheetName });
    }
  });
});

test.describe('Sample coverage', () => {
  test('every sample spreadsheet has a parsing expectation', () => {
    const sampleFiles = fs
      .readdirSync(SAMPLES_DIR)
      .filter((file) => EXCEL_EXTENSIONS.test(file) || file.toLowerCase().endsWith('.csv'));
    const covered = new Set([...CSV_SAMPLES.map((sample) => sample.file), EXCEL_SAMPLE.file]);
    const uncovered = sampleFiles.filter((file) => !covered.has(file));
    expect(
      uncovered,
      `Add the new sample file(s) to CSV_SAMPLES/EXCEL_SAMPLE so they are covered: ${uncovered.join(', ')}`,
    ).toEqual([]);
  });
});
