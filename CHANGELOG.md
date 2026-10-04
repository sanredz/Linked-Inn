# Changelog

## [1.1.2] - 2026-10-04

- Fixed empty profession windows sometimes popping up on their own, mostly
  while standing in a city.

## [1.1.1] - 2026-10-04

- Reading professions in the background no longer plays the profession window
  sound: the window doesn't open at all for the addon's own reads.

## [1.1.0] - 2026-10-04

- Crafters seen in the crafting log ("X creates Y") are remembered and read in
  full the next time you see them.
- Your group, your guild and the players around you are checked quietly in the
  background. Turn on friendly nameplates to check everyone you walk past.
- Scan nearby is gone; the background checks replace it.
- Only crafters whose recipes have been read show up in the list.
- Reading links no longer stops for good after a few failures; it pauses a
  minute and carries on.
- Profession reads are much faster, and links in chat, your group and your
  guild always come before background checks.
- The profession filter resets when you log in.
- New header: search, item type, skill level and settings in one row, the
  profession buttons with Secondary in the next.
- Skill level filter: any, Journeyman+, Expert+, Artisan+ or max.
- Settings (the gear): city scans, how long crafters are kept, reading links,
  minimap button, and forget everyone.
- City scans: in cities, friendly nameplates flash on for a moment every few
  minutes so everyone around you gets checked. On by default; turn it off in
  the settings.
- Crafters who use Linked Inn get a small gold badge.
- The list starts in compact mode.
- Background reads always ask for the Apprentice rank of a profession, so
  crafters below Expert answer too.
- Players on the other hidden realm of your ruleset are skipped: the game
  doesn't let you read their professions, so no time is wasted on them.
- The hidden profession window used while reading can no longer catch your
  mouse clicks.
- A fresh install can read every crafting profession right away, without
  first seeing someone link it.
- The player whose recipe book is open is highlighted in the list.
- Whispers from the addon open with their message filled in.
- Online checks no longer get stuck on "Checking...", and confirmed offline
  players sort below the rest.
- Class icons removed from the list; name pills keep their round ends.

## [1.0.0] - 2026-10-04

First release.

### Crafters
- Saves everyone who links a profession in chat, with their full recipe list,
  without clicking the link. One linked recipe or crafted item is enough too.
- Adds players you see crafting or disenchanting, and Scan nearby looks up the
  players around you.
- Search by item, profession or name. Filter by several professions, item
  type, max skill only, and optional secondary professions.
- List grouped by profession and sorted by who's online, skill and recipes.
- Favorites, last seen with a one-click online check, compact mode.
- Recipe books with categories and reagents. Click a recipe to ask for it.

### Sharing
- Linked Inn users share their professions automatically, including with
  users on the other hidden realms of the same ruleset.
- Your own professions are read at login.

### Work
- Post requests: item, amount, the materials you bring, price, note and how
  long it stays up.
- See requests you can make and offer with one click.
- Offers on your requests show as name tags: whisper, invite or remove.
- Alerts by pop-up, sound and minimap glow, with filters for mats, minimum
  price and professions.
