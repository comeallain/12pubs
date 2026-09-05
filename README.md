# 12Pubs

Archive and route planner for the annual Dublin pub crawl. Thirteen years of
crawls on a map, a planner that does the slot arithmetic, and a tick list for
the night itself.

No build step, no server, no accounts. A handful of files in a repo.

**Live:** https://comeallain.github.io/12pubs/

Open that on your phone and use Share → **Add to Home Screen** and it behaves
like an app, which is what you want on the night.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Rarely needs touching. |
| `data.js` | **All the pubs.** This is the file you'll edit. |
| `app.js` | The logic — map, slot maths, editor, ticks. |
| `styles.css` | Colours, type, layout. |
| `manifest.json` | Home-screen app details. |
| `icon.svg`, `icon-*.png`, `apple-touch-icon.png` | The app icon. Edit the SVG, re-export the PNGs. |
| `.nojekyll` | Stops GitHub mangling the files. Empty on purpose — leave it. |

## Editing the pubs

Two ways, same result — the live site updates about a minute after a commit
to `main`:

- **In the browser:** open `data.js` on
  [github.com/comeallain/12pubs](https://github.com/comeallain/12pubs), click
  the pencil icon, edit, commit.
- **Locally:** clone the repo, edit, `git push`.

If you change `index.html`, `app.js` or `styles.css`, bump the `?v=` number on
the three local links at the top and bottom of `index.html` — that's what makes
browsers pick up the new files.

**Adding a candidate pub** — copy a line inside `CANDIDATES` and change it:

```
["Name", latitude, longitude, opens, closes, "N", "Area"],
```

Times are 24-hour decimal, so `15.5` means 15:30 and `23.5` means 23:30. Use
`-1, -1` for a pub that's shut on Wednesdays. `"N"` or `"S"` is which side of
the river. Get coordinates by right-clicking the spot on Google Maps — it copies
them in the right order.

**Recording a finished crawl** — easier to do in the dashboard itself. Build the
route in the planner, then in Archive click **Record a new year** and it offers
to seed itself from that route. If you'd rather type it, add a block to
`ARCHIVE` in the same shape as the others: twelve pubs in walking order, with a
final `true` or `false` for whether you're sure of the location.

**Names matter.** The clash detector compares names, so keep the disambiguators
where two pubs share one — `"The Yacht (Ringsend)"` and `"The Yacht (Clontarf)"`
are different houses and the brackets are what keeps them apart.

## What it checks for you

- A pub already on the 12Pubs list, blocked with the year it was done
- A same-name pub in a different part of town, warned but allowed
- Arriving before a pub opens, or a pub shutting before you leave
- A stop with too little drinking time once the walk is deducted
- A last stop more than 1.2km from O'Connell Bridge

Walking times are straight-line distance × 1.2 at your chosen pace. That's an
estimate, not a routing engine — it was calibrated against known legs and runs
slightly conservative, which is the right way round.

## What's stored on your device

Pin corrections, your archive edits, the route you're planning, and the ticks.
All in the browser, on whichever phone or laptop you're using. Nothing syncs —
one scorekeeper on the night. Clearing your browser data clears it, so if you
drag a pin or fix a name, it's worth copying the change back into `data.js` so
it's permanent and everyone sees it.

## Provenance of the pins

Every location was verified in September 2026 against OpenStreetMap or
researched by hand. The closed and renamed houses are pinned where they stood:
the Dark Horse Inn (now a Starbucks), Ryans of Christchurch (now the
Christchurch Inn), Bakers (now Dudley's), Shanahans of The Coombe (now
Spitalfields), Mulligans of Sandymount (later the Chophouse), Becky Morgans
(now the Storyteller), The Berkeley (now Nanny O'Shea's), the Glen of Aherlow
(now Donoghue's), and the Underdog (now Bar Anam). The Loft in Howth was the
Abbey Tavern's upstairs restaurant, so 2019's stops 5 and 6 share a building —
pub downstairs, dinner upstairs.
