# 12 Pubs Of Winter

The app for the annual crawl. Guests only: everything private (the route,
check-ins, photos and past years) lives in the database and is only handed to
emails on the guest list. Nothing private is stored in this repo.

**Live:** https://comeallain.github.io/12pubs/

## Using it

- Open the link on your phone, enter your name and the email Kevin has for you.
- Add it to your home screen and it runs like an app, full screen, and opens
  without signal.
- On the night, tap **Check in** at each pub: take a photo, and the app checks
  you're near the pub. The **Board** shows everyone's progress and photos.

## Running it (admin)

Open **You**, enter the admin PIN, and an **Admin** tab appears with:

- the guest list (add or axe people),
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
