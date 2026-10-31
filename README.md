# Free Flashcards

Free flashcards with spaced repetition.
No accounts, no cloud, no ads.
Everything stays on your device.

It's a web app you can add to your iPhone or Android home screen.
After that it opens full screen and works offline.

## What it does

- Decks and cards, with text and images on either side
- Spaced Repetition (Easy, Good, Hard, Wrong) using [FSRS](https://github.com/open-spaced-repetition/ts-fsrs), the same algorithm modern Anki uses
- Daily limit on new cards per deck, plus "learn 10 more" when you want extra
- Free Drill: go through the whole deck shuffled, front first, back first, or mixed. Doesn't touch your schedule.
- Undo the last answer
- Import from text, CSV, spreadsheets, or Quizlet exports
- Export a full backup, share a single deck (with or without your progress), or export a deck as CSV
- Search cards in a deck
- Keyboard shortcuts on desktop (space to flip, 1 to 4 to rate, z to undo)
- Light and dark mode

> Images get resized to 1280px max before saving, so a deck full of phone photos doesn't eat your storage.

## Stack

- [Vite](https://vite.dev) + [React](https://react.dev) + [TypeScript](https://www.typescriptlang.org)
- [Dexie](https://dexie.org) on top of IndexedDB for local storage (images included)
- [ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs) for scheduling
- [vite-plugin-pwa](https://vite-pwa-org.netlify.app) for offline support and the home screen install
- [Vitest](https://vitest.dev) for tests

No backend. It's just static files.

## Running it

```sh
npm install
npm run dev
```

`npm run dev` also listens on your local network, so you can open it on your phone.

> Current limitation: on a phone over plain http (like `http://192.168.x.x:5173`), the offline bits and install prompt won't kick in. They need https. Deploy it to try the real thing.

Other scripts:

- `npm test` runs the tests
- `npm run build` builds to `dist/`
- `npm run preview` serves the built app
- `npm run icons` regenerates the icons from `public/icon.svg`

## Hosting

It's live on [Vercel](https://vercel.com): https://free-flashcards-omega.vercel.app

Vercel is hooked up to this GitHub repo.
Every push to `main` deploys to production, and PRs get their own preview url.

It's just static files, so any static host works.
[Cloudflare Pages](https://developers.cloudflare.com/pages/) and [Netlify](https://www.netlify.com) are good free options.
Build command `npm run build`, output directory `dist`.

A custom domain is the only thing that costs money, around $10 a year (totally optional).

> To host it under a subpath (like GitHub Pages does), build with `BASE_PATH=/your-subpath/ npm run build`.

## Data and storage

Everything lives in the browser's IndexedDB on that one device.
Nothing is sent anywhere.

That also means:

- Clearing site data deletes your cards.
- Cards don't sync between devices. Export a backup on one and import it on the other.
- Safari can clear data for sites you haven't visited in a while. Apps added to the home screen are exempt, which is why the app nudges you to install it.

The app asks the browser to mark storage as persistent the first time you add cards.
It also reminds you to back up once you have 25+ cards and haven't backed up in a month.

## Backup format

A backup is plain JSON: `decks`, `cards`, and `images` (base64).
Importing merges by id, so restoring the same backup twice doesn't duplicate anything.
A shared deck has no `srs` field on its cards, so importing it never overwrites your own progress.
