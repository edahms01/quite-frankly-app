import test from 'node:test';
import assert from 'node:assert/strict';
import { filterCachedShop, isHiddenShopRow, partitionShopRows } from './shopRows.js';

const rows = [
  { Category: 'Shop', Name: 'Frank’s Coffee', URL: 'https://www.coffeerevolution.shop' },
  { Category: 'Shop', Name: 'Wise Wolf Gold & Silver', URL: 'https://quitefrankly.gold' },
  { Category: 'Affiliate', Name: 'Wise Wolf', URL: 'https://example.com/ww', Note: 'x', Code: 'QF' },
  { Category: 'Affiliate', Name: 'Cultivate Elevate', URL: 'https://cultivateelevate.com', Code: 'QF' },
  { Category: 'Affiliate', Name: 'Gold dealer', URL: 'https://quitefrankly.gold/x' },
];

test('Wise Wolf rows are dropped by name or by link, everything else stays', () => {
  const { stores, affiliates } = partitionShopRows(rows);
  assert.deepEqual(stores.map((s) => s.label), ['Frank’s Coffee']);
  assert.deepEqual(affiliates.map((a) => a.title), ['Cultivate Elevate']);
});

test('a copy cached by an older app version is filtered when read back', () => {
  const cached = { stores: [{ label: 'Wise Wolf', url: 'https://x' }, { label: 'Coffee', url: 'https://y' }], affiliates: [{ title: 'A', url: 'https://quitefrankly.gold' }] };
  assert.deepEqual(filterCachedShop(cached), { stores: [{ label: 'Coffee', url: 'https://y' }], affiliates: [] });
  assert.deepEqual(filterCachedShop(null), { stores: [], affiliates: [] });
  assert.equal(isHiddenShopRow(undefined, undefined), false);
});
