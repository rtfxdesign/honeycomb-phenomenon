// The About page is built from app/data/team.js. Everyone the old About
// flyout showed must still be there, each with a portrait that exists, a way
// to reach them and a bio — so nobody drops off the page by accident.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { TEAM, ADVISORS } from '../app/data/team.js';

const FLYOUT = ['Paul Werenko', 'Eavie Arntzen', 'James Faulk', 'Liz Perez', 'Dane Street'];

test('everyone from the old About flyout is on the About page, with an email', () => {
  for (const n of FLYOUT) {
    const m = TEAM.find((t) => t.name === n);
    assert.ok(m, `${n} is missing from TEAM`);
    assert.ok(m.email, `${n} lost their email`);
  }
});

test('Allen is on the team', () => {
  assert.ok(TEAM.some((m) => m.name === 'Allen Grabo'));
});

test('each team member has a portrait on disk and a bio; an email, if given, is well formed', () => {
  for (const m of TEAM) {
    assert.ok(existsSync(new URL(`../public${m.image}`, import.meta.url)), `${m.name}: ${m.image} not in public/`);
    if (m.email !== undefined) assert.match(m.email, /^[^@\s]+@[^@\s]+$/, `${m.name}: email`);
    assert.ok(Array.isArray(m.bio) && m.bio.length > 0 && m.bio.every((p) => p.length > 40), `${m.name}: bio`);
  }
});

test('team slots on the comb never collide', () => {
  const slots = TEAM.filter((m) => m.slot).map((m) => m.slot.join(','));
  assert.equal(new Set(slots).size, slots.length);
});

test('the advisors are named', () => {
  const names = ADVISORS.map((a) => a.name);
  assert.ok(names.includes('Karin Austin'));
  assert.ok(names.includes('Andrea Oddo'));
});
