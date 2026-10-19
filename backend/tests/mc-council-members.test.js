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

const mcRouter = require('../routes/mc');
const sanitizeDateValue = mcRouter.sanitizeDateValue;

function testSanitizeDateValue() {
  assert.strictEqual(sanitizeDateValue(null), null);
  assert.strictEqual(sanitizeDateValue(undefined), null);
  assert.strictEqual(sanitizeDateValue(''), null);
  assert.strictEqual(sanitizeDateValue('   '), null);
  assert.strictEqual(sanitizeDateValue('_'), null, 'Underscore "_" must become null');
  assert.strictEqual(sanitizeDateValue('__'), null);
  assert.strictEqual(sanitizeDateValue('-'), null);
  assert.strictEqual(sanitizeDateValue('--'), null);
  assert.strictEqual(sanitizeDateValue('.... / .... / ....'), null);
  assert.strictEqual(sanitizeDateValue('N/A'), null);
  assert.strictEqual(sanitizeDateValue('nil'), null);
  assert.strictEqual(sanitizeDateValue('none'), null);
  assert.strictEqual(sanitizeDateValue('0000-00-00'), null);
  assert.strictEqual(sanitizeDateValue('invalid date text'), null);

  assert.strictEqual(sanitizeDateValue('2024-05-12'), '2024-05-12');
  assert.strictEqual(sanitizeDateValue('2024-05-12T14:30:00.000Z'), '2024-05-12');
  assert.strictEqual(sanitizeDateValue('2024-05-12 14:30:00'), '2024-05-12');
  assert.strictEqual(sanitizeDateValue('15/04/2024'), '2024-04-15');
  assert.strictEqual(sanitizeDateValue('15-04-2024'), '2024-04-15');
  assert.strictEqual(sanitizeDateValue('15.04.2024'), '2024-04-15');
  assert.strictEqual(sanitizeDateValue('2024/04/15'), '2024-04-15');
  assert.strictEqual(sanitizeDateValue('2024.04.15'), '2024-04-15');
  assert.strictEqual(sanitizeDateValue(44561), '2021-12-31');
  assert.strictEqual(sanitizeDateValue('44561'), '2021-12-31');
}

testSanitizeDateValue();
console.log('date sanitization tests passed');

