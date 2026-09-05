# 12Pubs

Archive and route planner for the annual Dublin pub crawl. Thirteen years of
crawls on a map, a planner that does the slot arithmetic, and a tick list for
the night itself.

No build step, no server, no accounts. Six files, dropped into a repo.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. Rarely needs touching. |
| `data.js` | **All the pubs.** This is the file you'll edit. |
| `app.js` | The logic — map, slot maths, editor, ticks. |
| `styles.css` | Colours, type, layout. |
| `manifest.json` | Lets you add it to a phone home screen. |
| `.nojekyll` | Stops GitHub mangling the files. Empty on purpose — leave it. |

## Putting it online

1. On github.com, click **New repository**. Name it `12pubs`. Tick
   **Public**. Create.
2. On the empty repo page, click **uploading an existing file**.
3. Drag in all six files together. Click **Commit changes**.
4. Go to **Settings** → **Pages** in the left sidebar.
5. Under Source pick **Deploy from a branch**, branch **main**, folder
   **/ (root)**. Save.
6. Wait about a minute and refresh. The URL appears at the top of that page:
   `https://<your-username>.github.io/12pubs/`

That link is the dashboard. Open it on your phone and use Share → Add to Home
Screen and it behaves like an app, which is what you want on the night.

### If `.nojekyll` won't upload

GitHub's web uploader sometimes hides files starting with a dot. If it does:
create the file instead. Click **Add file** → **Create new file**, type
`.nojekyll` as the name, leave it empty, and commit.

## Editing the pubs

Open `data.js` in the repo, click the pencil icon, edit, commit. The live site
updates in about a minute.

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
one scorekeeper on the night. Clearing your browser data clears it, so once
you've dragged the amber pins into place, it's worth copying the corrected
coordinates back into `data.js` so they're permanent and everyone sees them.
