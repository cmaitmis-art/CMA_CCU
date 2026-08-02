const test = require('node:test');
const assert = require('node:assert/strict');
const { mergeImportPayload } = require('../utils/importMerge');

test('fills only blank fields and keeps existing values intact during bulk import', () => {
  const existing = {
    file_no: 'MC-001',
    management_corporation_name: 'Old Name',
    address: '',
    status: 'Active',
    created_by: 'admin',
    modified_by: '',
    history: JSON.stringify([{ name: 'admin', action: 'Added', time: '2024-01-01T00:00:00.000Z' }]),
  };

  const incoming = {
    file_no: 'MC-001',
    management_corporation_name: 'New Name',
    address: '123 Main Street',
    status: 'Pending',
    created_by: 'importer',
    modified_by: 'importer',
  };

  const merged = mergeImportPayload(existing, incoming, { importUser: 'importer' });

  assert.equal(merged.file_no, 'MC-001');
  assert.equal(merged.management_corporation_name, 'Old Name');
  assert.equal(merged.address, '123 Main Street');
  assert.equal(merged.status, 'Active');
  assert.equal(merged.created_by, 'admin');
  assert.equal(merged.modified_by, 'importer');
  assert.match(merged.history, /Added/);
  assert.match(merged.history, /Modified/);
});
