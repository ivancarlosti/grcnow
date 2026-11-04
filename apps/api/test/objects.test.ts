import assert from 'node:assert/strict';
import test from 'node:test';
import { deepMerge, flatten, getDeep, omitEmpty, pick, setDeep } from '../src/common/utils/objects';

const pollutionPayload = () => JSON.parse('{"__proto__": {"polluted": "yes"}, "constructor": {"prototype": {"polluted": "yes"}}, "safe": 1}');

function assertClean() {
  assert.equal(({} as any).polluted, undefined, 'Object.prototype must not be polluted');
  assert.equal(Object.prototype.hasOwnProperty.call({}, 'polluted'), false);
}

test('deepMerge keeps normal behaviour', () => {
  const merged = deepMerge({ a: { b: 1 } }, { a: { c: 2 }, d: 3 });
  assert.deepEqual(merged, { a: { b: 1, c: 2 }, d: 3 });
});

test('deepMerge ignores prototype pollution payloads', () => {
  const merged = deepMerge<Record<string, any>>({}, pollutionPayload());
  assert.equal(merged.safe, 1);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, '__proto__'), false);
  assert.equal(Object.prototype.hasOwnProperty.call(merged, 'constructor'), false);
  assertClean();
});

test('setDeep ignores unsafe dotted paths but writes legitimate ones', () => {
  const target: Record<string, any> = {};
  setDeep(target, '__proto__.polluted', 'yes');
  setDeep(target, 'constructor.prototype.polluted', 'yes');
  setDeep(target, 'nested.__proto__.polluted', 'yes');
  assertClean();

  setDeep(target, 'auth.login.title', 'Sign in');
  assert.deepEqual(target, { auth: { login: { title: 'Sign in' } } });
  assert.equal(getDeep(target, 'auth.login.title'), 'Sign in');
  assert.equal(getDeep(target, '__proto__.polluted'), undefined);
});

test('flatten skips unsafe keys', () => {
  const flat = flatten(pollutionPayload());
  assert.equal(flat.safe, 1);
  assert.equal(Object.keys(flat).length, 1);
  assertClean();
});

test('pick only copies own properties and skips unsafe keys', () => {
  const inherited = Object.create({ inherited: true }) as Record<string, any>;
  inherited.own = 'value';
  assert.deepEqual(pick(inherited, ['own', 'inherited', '__proto__', 'constructor']), { own: 'value' });
  assertClean();
});

test('omitEmpty skips unsafe keys', () => {
  assert.deepEqual(omitEmpty({ a: 1, b: '', c: null, __proto__: { polluted: 'yes' } } as any), { a: 1 });
  assertClean();
});
