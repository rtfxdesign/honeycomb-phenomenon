// A story's source picks the frame its cell wears, and the review API accepts
// only the sources listed here.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { SOURCES, SOURCE_VALUES, frameForStory } from '../app/lib/source.js';

test('Archives of the Impossible stories wear the Rice frame; every other story the gold', () => {
  assert.equal(frameForStory({ source: 'archives-of-the-impossible' }), 'rice');
  assert.equal(frameForStory({ source: '' }), 'story');
  assert.equal(frameForStory({}), 'story');
  assert.equal(frameForStory(null), 'story');
});

test('the site itself is a source, as the empty value', () => {
  assert.ok(SOURCE_VALUES.includes(''));
  assert.equal(SOURCES.length, SOURCE_VALUES.length);
});

test('every frame a cell can ask for is on disk, both ways up', () => {
  for (const f of ['team', 'story', 'rice']) {
    assert.ok(existsSync(new URL(`../public/assets/frames/frame-${f}.png`, import.meta.url)), f);
    assert.ok(existsSync(new URL(`../public/assets/frames/frame-${f}-pointy.png`, import.meta.url)), f + ' pointy');
  }
});
