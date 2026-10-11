# Third-party assets and their licenses

Every asset that is not written by the Honeycomb team, with where it came from
and what its license permits. Add a line before adding the asset. "Physical
display" means the museum exhibit (hex wall, booths); check it explicitly for
anything photographic — stock licenses often exclude or cap it.

| Asset | Where used | Source | License | Web | Physical display | Advertising |
|---|---|---|---|---|---|---|
| Inter (variable, 400–700) | `public/fonts/inter-*.woff2`, body text | rsms.me/inter | SIL OFL 1.1 | yes | yes | yes |
| Lora (normal + italic, 400–700) | `public/fonts/lora-*.woff2`, story text | fonts.google.com/specimen/Lora | SIL OFL 1.1 | yes | yes | yes |
| Montserrat (400–700) | `public/fonts/montserrat-*.woff2`, labels | fonts.google.com/specimen/Montserrat | SIL OFL 1.1 | yes | yes | yes |
| `public/assets/cell-bright.png`, `cell-gold.png` | comb cell frames | **fill in** — DJ Stange original, or photographic source? | **fill in** | | | |
| `public/assets/archive-background.webp` | field background | **fill in** | **fill in** | | | |
| Gold-leaf photographic tiles (planned) | cell material | **fill in** when sourced | **fill in** — must permit physical display | | | |
| `public/hc-connected-field-watermark*.svg` | panel footer mark | Honeycomb team original | — | yes | yes | yes |
| Team portraits `public/team/*` | /about | each person, with their written OK (see design-handoff/legal/approvals/) | personal release | yes | yes | ask |
| Community portraits (R2 `headshots/`, `public/videos/*`) | comb faces, panel | contributors, via Liz's headshot folder | contributor release — see design-handoff/legal/releases/ | per release | per release | per release |

Code dependencies are MIT/Apache/ISC via npm; run `npx license-checker --summary` before a release to confirm nothing copyleft arrived.
