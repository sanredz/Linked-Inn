# Changelog

## [1.5.0] - 2026-10-09

- Linked Inn now works in retail World of Warcraft too. One download covers
  both games and sets itself up for whichever you play.
- On retail: all eight crafting professions plus Cooking, each crafter's skill
  for every expansion they've learned, and recipe books grouped by expansion,
  so old recipes for transmog, pets and toys are easy to find. Characters on
  connected realms share one list, and profession names work in every game
  language.
- On retail, loading someone's profession makes the game hitch for a moment,
  so Linked Inn doesn't check people in the background there. Flip the new
  Scan switch at the top of the window in a busy city: it checks everyone
  around you, shows how many crafters it has found, and switches itself off
  when you leave the city or enter combat. Professions linked in chat are
  still read in cities and inns.
- At the Crafting Orders, a Linked Inn panel shows who on your list can make
  the recipe, online first. Pick a personal order and click a name to send it
  to them.
- One list per faction: your Alliance and Horde characters each see their own
  side's crafters. The other side's list is kept safe until you log in over
  there again.
- Linked Inn shows up in Titan Panel and other broker bars: your crafter
  count, click to open, right-click for settings.
- Crafters who drop a profession are noticed and taken off it, and crafters
  you already know are refreshed now and then (at most every two weeks), so
  skill and recipes stay current.
- Clearer reading settings: professions linked in chat and checking the
  people around you are now separate options.
- Checking whether someone is online answers right away, even while Linked Inn
  is busy in the background.
- Smoother reading: big recipe books are read a little at a time, and the
  profession window no longer flashes when a crafter's answer arrives late.
- Rows show skill out of the cap, like "Skill 150/225".
- Faster searching, and lists shared by other Linked Inn users arrive more
  reliably.

## [1.4.0] - 2026-10-05

- A new look: wood and brass windows, a gold title, and profession artwork
  behind recipe books and behind the list when you filter by one profession.
- Only one side window (recipes, settings or requests) is open at a time.
- Other Linked Inn users show up much faster, usually within seconds.
- Linked Inn users on your Battle.net friends list help pass lists along, so
  users on the other half of your realm can show up too.
- A status light in the bottom bar shows whether Linked Inn is working. Hover
  it for a plain explanation.
- A short welcome guide for new users. Open it again with the ? button or
  /li guide.
- Fixed your own profession window sometimes not opening, opening empty or
  closing on its own in busy places.
- Ping replies only show for the person who pinged.

## [1.3.0] - 2026-10-04

- No more "No player named ..." messages popping up in chat.
- Guild only is now Guild and friends only, and online friends get their
  professions checked like guildmates.
- Rows show who's in your guild and who's on your friends list.
- At the same skill, crafters seen more recently come first.
- Other Linked Inn users show up within seconds after you log in or reload,
  instead of up to 15 minutes later.
- Linked Inn users in your guild or group ask each other for their lists
  through the guild or group.
- Fixed guild checks stopping for good after turning on Guild only.
- Crafters you only know through Linked Inn say "via Linked Inn" instead of a
  location.

## [1.2.0] - 2026-10-04

- Housekeeping: Light, Balanced or Strict clears out crafters who add nothing,
  keeping the best 100, 75 or 50 per profession. Rare recipes, favorites,
  guild, friends and Linked Inn users are never touched. Off by default.
- Guild only: Linked Inn reads, lists and talks to your guild only, Work
  included. Everyone else stays saved and comes back when you turn it off.
  Shows how many guildmates are on the other realm, where the game can't read
  them.
- Don't keep skill below: skip and forget professions under a skill level.
- Hide profession links in trade, general, say and yell. They're still read.
- New filter: show only crafters who use Linked Inn.
- Players seen around you, in your group or guild now get all their
  professions checked. Before, only Alchemy and Blacksmithing were found that
  way.
- Guild and group members are checked again after half a day instead of a
  week, and reading no longer waits while a game window is open.
- Linked Inn users are asked for their list again when recipes are missing.
- The waiting list keeps people for 14 days, at most 300.
- Profession windows no longer pop up after a reload.
- The settings panel scrolls.

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
