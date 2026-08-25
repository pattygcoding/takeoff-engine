import { parseRawCsv, autoDetectColumnMapping, getTargetFields } from './src/lib/csv.js';
import fs from 'fs';

async function test() {
  const content = fs.readFileSync('./public/sample_edge_cases_takeoff.csv', 'utf8');
  const raw = await parseRawCsv(content);
  console.log('SubTables count:', raw.subTables.length);
  if (raw.subTables.length >= 2) {
    console.log('Detected 2+ tables!');
    raw.subTables.forEach(t => console.log('Table:', t.id, t.label, t.headers));
  } else {
    console.log('Single table detected headers:', raw.headers);
    const auto = autoDetectColumnMapping(raw.headers, raw.rows);
    console.log('Auto mapping:', auto);
    const targetFields = getTargetFields();
    const missing = targetFields.filter(f => f.required && !auto.mapping[f.key]);
    console.log('Missing required:', missing);
    console.log('Overall confidence:', auto.overallConfidence);
  }
}
test();
