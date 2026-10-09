import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';

const clientPath = path.resolve('src/core/lib/auth/organizations.ts');
const source = fs.readFileSync(clientPath, 'utf8');

test('FE-CLIENT-001 through FE-CLIENT-010: organization client applies authorization and minimal endpoint payloads', () => {
  assert.match(source, /import \{ addAuthorizationHeader \} from '@\/core\/lib\/auth\/sessionToken';/);
  assert.match(source, /return addAuthorizationHeader\(\{\s*'Content-Type': 'application\/json',\s*\}\);/);
  // Signatures carry TypeScript annotations now, so match the method + payload shape rather than an exact signature.
  assert.match(source, /async create\([\s\S]*?body: JSON\.stringify\(\{ name \}\)/);
  assert.match(source, /async inviteMember\([\s\S]*?body: JSON\.stringify\(\{ email, role \}\)/);
  assert.match(source, /async updateMemberRole\([\s\S]*?body: JSON\.stringify\(\{ role \}\)/);
  assert.match(source, /organizations\/\$\{orgId\}\/members\/\$\{memberId\}\/resend/);
  assert.match(source, /organizations\/\$\{orgId\}\/members\/\$\{memberId\}\/revoke/);
});