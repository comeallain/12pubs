# 12 Pubs Of Winter

The app for the annual crawl. Anyone with the link signs up with their name
and email. The route, map and check-ins stay hidden until the crawl day
(2 December 2026, Dublin time), and each pub's check-in opens 15 minutes
before its slot. The database enforces both rules. Past years are
only visible with the admin PIN. Nothing private is stored in this repo.

**Live:** https://12pubs.eu

## Using it

- Open the link on your phone and enter your name and email.
- Add it to your home screen and it runs like an app, full screen, and opens
  without signal.
- On the night, tap **Check in** at each pub: take a photo, and the app checks
  you're near the pub. The **Board** shows everyone's progress and photos.

## Running it (admin)

Open **You**, enter the admin PIN, and an **Admin** tab appears with:

- a preview of the route before the day, with practice check-ins,
- the guest list (axe someone and they can't sign up again),
- pub swaps for the night (everyone's app updates within about 20 seconds),
- a button to clear practice check-ins,
- the MasterList of past years, visible only with the PIN.

## Files

| File | What it is |
|---|---|
| `index.html` | The page. |
| `app.js` | The app. Holds the database address and the public key, nothing else. |
| `app.css` | The look. |
| `sw.js` | Lets the app open offline. Bump `CACHE` when you change files. |
| `manifest.json` | Home-screen app details. |
| `2026/` | Old link, now forwards to the app. |
| `CNAME` | Tells GitHub to serve the site at 12pubs.eu. Leave it. |
