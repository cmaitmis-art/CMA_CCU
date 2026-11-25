const test = require('node:test');
const assert = require('node:assert/strict');
const { buildFileNoSearchCondition } = require('../utils/fileNoSearch');

test('buildFileNoSearchCondition handles MC/ and M.com/ shorthand file references without matching phone numbers', () => {
  const mcCond = buildFileNoSearchCondition('MC/1066');
  assert.ok(mcCond && Array.isArray(mcCond.$or));
  const mcJson = JSON.stringify(mcCond);
  assert.match(mcJson, /"new_file_no":\{"\$like":"%\/1066%"\}/);
  assert.match(mcJson, /"file_no":\{"\$like":"%MC\/1066%"\}/);
  assert.doesNotMatch(mcJson, /"secretary"/);
  assert.doesNotMatch(mcJson, /"treasurer"/);

  const mcomCond = buildFileNoSearchCondition('M.com/833', ['remark', 'certificate_file_no']);
  assert.ok(mcomCond && Array.isArray(mcomCond.$or));
  const mcomJson = JSON.stringify(mcomCond);
  assert.match(mcomJson, /"new_file_no":\{"\$like":"%\/833%"\}/);
  assert.match(mcomJson, /"old_file_no":\{"\$like":"%M\.com\/833%"\}/);
  assert.doesNotMatch(mcomJson, /"secretary"/);
});

test('buildFileNoSearchCondition keeps broad search for regular text queries', () => {
  const textCond = buildFileNoSearchCondition('Blue Orchid', ['remark']);
  const textJson = JSON.stringify(textCond);
  assert.match(textJson, /"management_corporation_name":\{"\$like":"%Blue Orchid%"\}/);
  assert.match(textJson, /"secretary":\{"\$like":"%Blue Orchid%"\}/);
  assert.match(textJson, /"remark":\{"\$like":"%Blue Orchid%"\}/);
});

