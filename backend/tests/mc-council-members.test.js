const assert = require('assert');

function normalizeCouncilMembers(value) {
  if (value === null || value === undefined || value === '') return '';
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return typeof parsed === 'string' ? parsed : JSON.stringify(parsed);
    } catch (err) {
      return value;
    }
  }
  if (Array.isArray(value)) {
    return JSON.stringify(value.filter(Boolean));
  }
  if (typeof value === 'object') {
    return JSON.stringify(value);
  }
  return String(value);
}

function testNormalizeCouncilMembers() {
  assert.strictEqual(normalizeCouncilMembers([{ name: 'A' }]), '[{"name":"A"}]');
  assert.strictEqual(normalizeCouncilMembers({ name: 'A' }), '{"name":"A"}');
  assert.strictEqual(normalizeCouncilMembers('[]'), '[]');
  assert.strictEqual(normalizeCouncilMembers(''), '');
}

testNormalizeCouncilMembers();
console.log('mc council members normalization tests passed');
