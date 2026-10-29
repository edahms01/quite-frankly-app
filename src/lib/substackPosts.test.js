import test from 'node:test';
import assert from 'node:assert/strict';
import { listablePosts } from './substackPosts.js';

test('listablePosts hides paid posts only', () => {
  const posts = [{ id: 'a', audience: 'free' }, { id: 'b', audience: 'paid' }, { id: 'c' }];
  assert.deepEqual(listablePosts(posts).map((p) => p.id), ['a', 'c']);
  assert.deepEqual(listablePosts(undefined), []);
});
