# Plant Tracker

> A simple journal-style app for tracking when your houseplants need water, what you've done for them, and how they're doing over time.

[Try the live app →](https://plant-tracker-blue.vercel.app)

<!-- screenshot slot: drop a Home screen capture here once help-center screenshot sweep happens -->

## What it is

Plant Tracker is a small personal app for keeping track of houseplant care. It works in any browser on a phone or laptop, and once you've opened it the first time it keeps working without an internet connection — everything stays saved on your device. There's no sign-up and no account.

It was built as a portfolio practice in AI-assisted product work. The product direction, design choices, and writing are mine; the implementation was done end-to-end with Claude Code as a partner.

The live demo is pre-loaded with sample plants, watering history, photos, and notes adapted from real use, so what you're seeing is the app as it looks once someone has lived in it for a while — not an empty starter screen.

## What's in it

- **A weekly view** that shows which plants are coming up for water in the next seven days
- **A "thirsty" list** that surfaces plants that are due or overdue, sorted by urgency, with a one-tap watering button
- **A care log** that brings every watering, note, photo, repot, prune, and other care event into a single timeline you can scroll back through
- **Per-plant pages** with their own care history, watering cadence chart, photo gallery, and notes
- **Photos** taken on the device — compressed automatically and stored locally
- **Backup and restore** — exports everything (with or without photos) as a single file you can save anywhere

The CHANGELOG has the full release history and the small design decisions that shaped each version.

## How it was built

This is a no-code project in the sense that matters: I wrote no application code by hand. Every change to the app — new features, bug fixes, visual revisions — was made by directing Claude Code, an AI coding assistant, in plain English.

What that looked like in practice:

- I wrote a concept document up front and worked through three dashboard design directions before picking one
- Each change was scoped in conversation, implemented by Claude Code, reviewed in the running app, and refined or reverted from there
- The CHANGELOG is the artifact of that loop — each entry is roughly one working session

The result is a real, working product (offline storage, photo handling, backup format, the lot) built without writing application code by hand. The point of the project is to demonstrate that an enablement specialist with no traditional development background can ship functional proof-of-concept software using current AI tools.

## Built with

React, Vite, Dexie (IndexedDB), and vite-plugin-pwa. Hosted on Vercel.

## Running it locally

If you want to run a copy on your own machine:

```bash
npm install
npm run dev      # starts a local development server
npm run build    # produces a deployable build
```

You'll need Node.js installed. Everything else is in `package.json`.

## A note on the code

The source is public so it can be reviewed as part of a portfolio, but this is a personal project — it isn't intended to be reused or maintained as open source. All rights reserved.

See [`CHANGELOG.md`](./CHANGELOG.md) for the full release history.
