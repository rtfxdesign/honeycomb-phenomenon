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

test('the gold wears by the decade of the experience', async () => {
  const { wearForYear } = await import('../app/lib/source.js');
  assert.equal(wearForYear('2024'), 0);
  assert.equal(wearForYear(2020), 0);
  assert.equal(wearForYear('2019'), 1);
  assert.equal(wearForYear('around 1995'), 2);
  assert.equal(wearForYear('1979'), 3);
  assert.equal(wearForYear(''), 0);
  assert.equal(wearForYear(undefined), 0);
  assert.equal(wearForYear('unknown'), 0);
});

test('precedence: Rice, then community bronze, then gold by decade', () => {
  assert.equal(frameForStory({ source: 'archives-of-the-impossible', privacy: 'community', experienceYear: '1970' }), 'rice');
  assert.equal(frameForStory({ privacy: 'community', experienceYear: '1970' }), 'bronze');
  assert.equal(frameForStory({ privacy: 'public', experienceYear: '1970' }), 'story3');
  assert.equal(frameForStory({ experienceYear: '2003' }), 'story1');
  assert.equal(frameForStory({ experienceYear: '2025' }), 'story');
});

test('every frame frameForStory can return is on disk', () => {
  for (const f of ['story', 'story1', 'story2', 'story3', 'bronze', 'wax', 'rice']) {
    assert.ok(existsSync(new URL(`../public/assets/frames/frame-${f}.png`, import.meta.url)), f);
  }
});
