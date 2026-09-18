import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("defines the complete Honeycomb experience", async () => {
  const [app, layout, pages, people] = await Promise.all([
    readFile(new URL("../app/components/HoneycombApp.jsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/pages.jsx", import.meta.url), "utf8"),
    readFile(new URL("../app/data/people.js", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Honeycomb — Your Experience\. Our Collective History\./i);
  assert.match(app, /Enter the <em>Honeycomb\./);
  assert.match(people, /point of light within a shared history/);
  assert.match(app, /Share your experience/);
  assert.match(pages, /Your Experience\. Our Collective History'/); // title, no trailing period
  assert.match(pages, /compendium of encounters/);
  assert.doesNotMatch(`${app}\n${layout}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("declares the Netlify moderation and hosting surfaces", async () => {
  const [recorder, layout, packageJson, netlifyConfig, forms] = await Promise.all([
    readFile(new URL("../app/components/RecorderModal.jsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
    readFile(new URL("../public/__forms.html", import.meta.url), "utf8"),
  ]);
  assert.match(recorder, /review queue/);
  assert.match(recorder, /submit-experience/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(netlifyConfig, /publish = "\.next"/);
  assert.match(forms, /honeycomb-experience/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
