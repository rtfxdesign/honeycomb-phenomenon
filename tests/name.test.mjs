// The contributor's name and the submission ID: how a name renders at each
// display level, what a cell falls back to without one, and that an ID is
// something a person can read back over the phone.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatDisplayName, cellLabel, initialsOf } from '../app/lib/name.js';
import { generateSubmissionId, normaliseSubmissionId, SUBMISSION_ID_RE } from '../app/lib/submission-id.js';

test('a name renders at each display level', () => {
  assert.equal(formatDisplayName('Jane', 'Doe', 'full'), 'Jane Doe');
  assert.equal(formatDisplayName('Jane', 'Doe', 'first-initial'), 'Jane D.');
  assert.equal(formatDisplayName('Jane', 'Doe', 'initials'), 'J.D.');
});

test('a partial name never produces a dangling initial', () => {
  assert.equal(formatDisplayName('Jane', '', 'first-initial'), 'Jane');
  assert.equal(formatDisplayName('', 'Doe', 'first-initial'), 'D.');
  assert.equal(formatDisplayName('Jane', '', 'initials'), 'J.');
  assert.equal(formatDisplayName('  ', '  ', 'full'), '');
});

test('cell label falls back name → location → title', () => {
  assert.equal(cellLabel({ displayName: 'Jane D.', location: 'Tulsa, OK', title: 'Lights' }), 'Jane D.');
  assert.equal(cellLabel({ firstName: 'Jane', lastName: 'Doe', nameDisplay: 'initials', location: 'Tulsa, OK' }), 'J.D.');
  assert.equal(cellLabel({ location: 'Tulsa, OK', title: 'Lights' }), 'Tulsa, OK');
  assert.equal(cellLabel({ title: 'The light above the pines' }), 'The light above the pines');
  assert.equal(cellLabel({}), '');
});

test('the display level governs how the name renders, not which field is used', () => {
  // initials-only with no name still shows the place, not initials of the place
  assert.equal(cellLabel({ nameDisplay: 'initials', location: 'Tulsa, OK' }), 'Tulsa, OK');
});

test('initials come from the label, whatever it is', () => {
  assert.equal(initialsOf('J.D.'), 'JD');
  assert.equal(initialsOf('Hudson Valley, NY'), 'HV');
  assert.equal(initialsOf('The light above the pines'), 'TL');
  assert.equal(initialsOf(''), '');
});

test('a submission ID is dated, short, and free of look-alike characters', () => {
  const id = generateSubmissionId(new Date('2026-09-18T15:00:00Z'));
  assert.match(id, SUBMISSION_ID_RE);
  assert.ok(id.startsWith('HC-2026-09-18-'));
  assert.equal(id.length, 'HC-2026-09-18-XXXX'.length);
  for (const bad of ['0', 'O', '1', 'I']) assert.ok(!id.slice(-4).includes(bad), `contains ${bad}`);
});

test('a typed ID is accepted however a person writes it', () => {
  assert.equal(normaliseSubmissionId('hc-2026-09-18-7k3m'), 'HC-2026-09-18-7K3M');
  assert.equal(normaliseSubmissionId(' HC 2026-09-18-7K3M '), 'HC-2026-09-18-7K3M');
  assert.equal(normaliseSubmissionId('2026-09-18-7K3M'), 'HC-2026-09-18-7K3M');
  assert.equal(normaliseSubmissionId('HC-2026-09-18-7K30'), null); // 0 is not in the alphabet
  assert.equal(normaliseSubmissionId('nonsense'), null);
});
