# Blossom: artist site (preview)

A preview of an artist site for Blossom (drum & bass DJ and producer), laid out
after [jjettas.com](https://jjettas.com): a light landing screen with a cut-out
portrait, a diagonal wipe into a sideways run of cards, giant dotted headlines
and photo stacks. No loading screen.

Live preview: https://samsegan.github.io/blossom-site/

The page carries a `noindex` tag and a "Preview build, not yet official" line
in the footer until Blossom signs off on it.

## What is on the page

1. **Landing screen**: portrait, next show, new single.
2. **Tour**: every upcoming show as a pass, then **Bookings** (agents, demos,
   stages played, 2026 so far).
3. **Music**: the whole discography in one sideways row (drag, trackpad, arrow
   keys, arrow buttons), newest first, with year marks and filters. Songs play
   in the page through SoundCloud's own player; on phones Play opens SoundCloud.
4. **Moments** (Coachella 2026), **Pink Planet** (Discord, Twitch, text
   updates), **About** (bio, facts, press), **Links**.

## Files

Plain HTML, CSS and JavaScript. No build step, no framework.

| File | What it holds |
|---|---|
| `index.html` | Every section and all the wording |
| `css/styles.css` | The look |
| `js/app.js` | Fills in the lists and moves things with the scroll position |
| `js/data.js` | Generated: releases and shows (do not edit by hand) |
| `data/catalog.json` | The discography, one row per release |
| `data/shows.json` | Upcoming shows, 2026 so far, totals |
| `art/`, `img/`, `fonts/` | Cover art, photos, fonts |

## Changing things

**A new show or a cancelled one:** edit `data/shows.json`, then run the build
below. A show drops off the page by itself the day after it happens, and the
next one becomes the landing screen's "Next up".

**A new release:** add a row at the top of `data/catalog.json` (`sc` is the
SoundCloud path, `sp` the Spotify album id), then:

    uv run --with pillow tools/build_data.py

That fetches the cover and length from SoundCloud's public web API (Spotify's
oEmbed for a release that is not on SoundCloud) and rewrites `js/data.js`.

**Photos:** `tools/build_images.py` crops and compresses the originals, which
are not kept in this repo. Cut-outs come from `tools/cutout.swift` (Apple's
subject lift).

**Wording, contacts, links:** straight in `index.html`.

## Where the facts come from

- Shows: Blossom's Bandsintown listing and her Fall/Winter 2026 tour poster.
- Discography: her SoundCloud (own uploads and the label uploads in her
  playlists) and Spotify. Labels are as Spotify or the upload names them.
- Contacts: the contact page of blossomofficial.com and her profiles.
- Bio and press quotes: agency and promoter bios, Phoenix New Times, DJ Life
  Mag, iWantEDM. Each quote on the page links to its source.
- Photos: her press shots and Instagram posts; photographers are credited in
  the footer.

## Preview locally

    python3 -m http.server 8811

then open http://127.0.0.1:8811/.
