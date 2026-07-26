import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

test("defines the complete Honeycomb experience", async () => {
  const [page, layout] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
  ]);
  assert.match(layout, /Honeycomb — Your Experience\. Our Collective History\./i);
  assert.match(page, /Your experience/);
  assert.match(page, /Our collective history/);
  assert.match(page, /Explore the archive/);
  assert.match(page, /Share your experience/);
  assert.doesNotMatch(`${page}\n${layout}`, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("declares the Netlify moderation and hosting surfaces", async () => {
  const [page, layout, packageJson, netlifyConfig, forms] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
    readFile(new URL("../netlify.toml", import.meta.url), "utf8"),
    readFile(new URL("../public/__forms.html", import.meta.url), "utf8"),
  ]);
  assert.match(page, /Record your story/);
  assert.match(page, /review queue/);
  assert.match(layout, /og\.png/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  assert.match(netlifyConfig, /publish = "\.next"/);
  assert.match(forms, /honeycomb-experience/);
  await assert.rejects(access(new URL("../app/_sites-preview", import.meta.url)));
});
