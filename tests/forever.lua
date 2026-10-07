
Setup()
Boot()
check(LI.ready and LI.playerKey == "Brew Master-TestRealm" or LI.playerKey == "Brew-Master-TestRealm", "player key has the surname", LI.playerKey)
check(LI.settings.autoRead == true, "automatic reading is on by default")
do
	W.defaultLinks = true
	Boot()
	local links = LI.db.profLinks
	check(links.enchanting and links.engineering and links.leatherworking and links.alchemy and links.tailoring and links.blacksmithing and not links.mining, "a fresh install already knows how to read every crafting profession")
	W.defaultLinks = nil
	Setup()
	Boot()
end
local agos = { LI.ShortAgo(time() - 30), LI.ShortAgo(time() - 300), LI.ShortAgo(time() - 7300), LI.ShortAgo(time() - 3 * 86400), LI.ShortAgo(time() - 21 * 86400), LI.ShortAgo(nil) }
check(table.concat(agos, ",") == "now,5m,2h,3d,3w,?", "short ages read now, minutes, hours, days, weeks", table.concat(agos, ","))

Say("CHAT_MSG_CHANNEL", "WTB tailor " .. TradeLink("Player-1-AAA", 3908, 197, "Tailoring") .. " lol", "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
local anna = LI.crafters["Anna Smith-TestRealm"]
check(anna and anna.profs.tailoring, "a profession link in Trade records the crafter")
check(anna and anna.where == "Trade", "where the link was seen is shortened", anna and anna.where)
check(anna and anna.class == "PRIEST", "the class comes from the GUID", anna and anna.class)
check(anna and anna.profs.tailoring.link == "trade:Player-1-AAA:3908:197", "the link is stored for opening later")
check(anna and anna.profs.tailoring.icon == 103908, "the profession icon comes from the link's spell")
check(LI.test.links == 1 and #LI.test.formats == 1, "the test counts links and keeps a format sample")
check(LI.test.formats[1].shape == "3 fields, longest 12", "the link shape is described", LI.test.formats[1].shape)
check(LI.Reader.QueueSize() == 1, "the link is queued for an automatic read")

Say("CHAT_MSG_CHANNEL", "plain text, no links", "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
check(LI.test.links == 1, "messages without links don't count")

W.autoWorks = true
Advance(4)
check(W.hyperlinks[1] == "trade:Player-1-AAA:3908:197", "the automatic read asks for the stored link", W.hyperlinks[1])
Advance(2)
local tailoring = anna.profs.tailoring
check(tailoring.recipes and tailoring.recipes[18560] and tailoring.recipes[3914], "automatic read saves learned recipes")
check(tailoring.recipes and not tailoring.recipes[3915], "unlearned recipes are skipped")
check(tailoring.via == "auto" and tailoring.count == 2, "the read is marked automatic", tailoring.via)
check(tailoring.rank == 260 and tailoring.max == 300, "skill level is saved")
check(LI.test.auto.ok == 1 and LI.test.auto.tries == 1 and LI.test.auto.flashed == 0, "the test counts one clean automatic read")
check(W.closed == 1, "the profession window is closed after an automatic read")
check(LI.db.recipes[18560].k == "bag" and LI.db.recipes[3914].k == "armor", "recipes get an item type", LI.db.recipes[18560].k)
check(LI.db.recipes[18560].c == 10 and LI.db.cats[10].n == "Bags" and LI.db.cats[10].o == 1, "recipes remember their category, named once in a shared table")
check(LI.db.recipes[18560].r == "14342:4;14256:2;8343:2", "reagents are stored once per recipe", LI.db.recipes[18560].r)
check(LI.db.recipes[3914].r == "2996:2;2320:1", "optional reagents are left out", LI.db.recipes[3914].r)
check(LI.Reader.QueueSize() == 0, "the queue is empty after reading")
W.trade = { linked = true, linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
Fire("TRADE_SKILL_SHOW")
Fire("TRADE_SKILL_LIST_UPDATE")
Advance(1)
check(LI.test.click == 0 and LI.test.auto.ok == 1, "a late update from an automatic read is not counted as a click", LI.test.click)
check(W.trade == nil, "and the late window is closed again by itself")
W.closed = W.closed - 1
W.clickWorks = true
SetItemRef("trade:Player-1-AAA:3908:197", "[Tailoring]", "LeftButton")
Advance(1)
check(LI.test.click == 1, "a click right after an automatic read still counts", LI.test.click)
W.clickWorks = false
C_TradeSkillUI.CloseTradeSkill()
W.closed = W.closed - 1

Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
check(LI.Reader.QueueSize() == 0, "fresh recipes are not read again")

W.guild = { { name = "Bob Stone-TestRealm", online = true } }
W.autoWorks = false
LI.settings.autoRead = false
Say("CHAT_MSG_GUILD", TradeLink("Player-1-BBB", 3908, 197, "Tailoring"), "Bob Stone-TestRealm", "Player-1-BBB")
Fire("GUILD_ROSTER_UPDATE")
check(LI.crafters["Bob Stone-TestRealm"].where == "Guild", "guild chat links are labeled Guild")
Advance(30)
check(LI.test.auto.tries == 1, "automatic reading can be switched off")

check(#LI.Search("bob") == 0, "a crafter whose recipes aren't read yet stays off the list")
LI.SetRecipes("Bob Stone-TestRealm", { name = "Tailoring", rank = 260, max = 300 }, { { id = 3914, name = "Brown Linen Pants", item = 4343 } }, "auto")
local results = LI.Search("mooncloth")
check(#results == 1, "searching an item finds only the crafter who can make it", #results)
check(results[1].key == "Anna Smith-TestRealm" and results[1].recipeMeta and results[1].recipeMeta.n == "Mooncloth Bag", "the matching recipe is attached", results[1] and results[1].key)
check(results[1].status == "recent", "someone seen in chat a moment ago counts as recently active", results[1].status)

results = LI.Search("", { kind = "bag" })
check(#results == 1 and results[1].makes == 1, "the item type filter works without a search")
results = LI.Search("", { kind = "consumable" })
check(#results == 0, "nobody shows up for a type nobody makes")
results = LI.Search("anna")
check(#results == 1 and results[1].key == "Anna Smith-TestRealm", "searching a name finds the crafter")
results = LI.Search("TAILOR")
check(#results == 2, "searching a profession is case-insensitive")
results = LI.Search("", { profs = { alchemy = true } })
check(#results == 0, "the profession filter hides other professions")
results = LI.Search("", { profs = { alchemy = true, tailoring = true } })
check(#results == 2, "several professions can be picked at once")
LI.SetRecipes("Max Out-TestRealm", { name = "Tailoring", rank = 300, max = 300 }, { { id = 3914, name = "Brown Linen Pants", item = 4343 } }, "click")
LI.SetRecipes("Max Out-TestRealm", { name = "Alchemy", rank = 50, max = 75 }, { { id = 2330, name = "Minor Healing Potion", item = 118 } }, "click")
LI.SetRecipes("Half Way-TestRealm", { name = "Alchemy", rank = 120, max = 150 }, { { id = 2330, name = "Minor Healing Potion", item = 118 } }, "click")
local caps = LI.SkillCaps()
check(caps.tailoring == 300 and caps.alchemy == 150, "the skill cap comes from the highest cap seen", caps.alchemy)
results = LI.Search("", { maxOnly = true })
check(#results == 1 and results[1].key == "Max Out-TestRealm" and #results[1].groups == 1 and results[1].groups[1].key == "tailoring", "max skill keeps only maxed professions, and hides unknown skill", #results)
LI.crafters["Half Way-TestRealm"].profs.alchemy.rank = 150
results = LI.Search("", { maxOnly = true, profs = { alchemy = true } })
check(#results == 1 and results[1].key == "Half Way-TestRealm", "it works together with the profession filter")
LI.Forget("Max Out-TestRealm")
LI.Forget("Half Way-TestRealm")

Advance(20 * 60)
check(LI.Status("Anna Smith-TestRealm") == "offline", "people not seen for a while count as offline")
Say("CHAT_MSG_SAY", "hello", "Anna Smith-TestRealm", "Player-1-AAA")
check(LI.Status("Anna Smith-TestRealm") == "recent", "any chat line marks a crafter active again")
Fire("CHAT_MSG_SYSTEM", "No player named 'Anna Smith' is currently playing.")
check(LI.Status("Anna Smith-TestRealm") == "offline", "a failed whisper marks the crafter offline")
W.units = { mouseover = { name = "Anna", surname = "Smith" } }
local fired = 0
LI.Listen("StatusChanged", function() fired = fired + 1 end)
Fire("UPDATE_MOUSEOVER_UNIT")
check(LI.Status("Anna Smith-TestRealm") == "recent", "hovering a crafter in the world counts as seeing them")
check(LI.crafters["Anna Smith-TestRealm"].where == "Stormwind City", "a world sighting records the zone", LI.crafters["Anna Smith-TestRealm"].where)
check(fired == 1, "a sighting refreshes the list")
Fire("UPDATE_MOUSEOVER_UNIT")
Fire("PLAYER_TARGET_CHANGED")
check(fired == 1, "repeat sightings within a minute don't refresh again", fired)
Advance(20 * 60)
W.units = { nameplate3 = { name = "Anna", surname = "Smith" } }
Fire("NAME_PLATE_UNIT_ADDED", "nameplate3")
check(LI.Status("Anna Smith-TestRealm") == "recent", "a nameplate counts as seeing them")
W.units = { target = { name = "Stranger", surname = "Danger" }, mouseover = { name = "Anna", surname = "Smith", npc = true } }
Fire("PLAYER_TARGET_CHANGED")
check(LI.crafters["Stranger Danger-TestRealm"] == nil, "seeing someone who isn't a crafter adds nothing")
W.units = nil
LI.crafters["Anna Smith-TestRealm"].where = "Trade"
LI.crafters["Bob Stone-TestRealm"].seen = time() - 3600
Fire("GUILD_ROSTER_UPDATE")
check(LI.crafters["Bob Stone-TestRealm"].seen == time(), "an online guild member counts as seen now")
Fire("CHAT_MSG_SYSTEM", "No player named 'Anna Smith' is currently playing.")

Say("CHAT_MSG_CHANNEL", "selling stuff " .. TradeLink("Player-1-CCC", 2259, 171, "Alchemy"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
check(LI.crafters["Cora Vale-TestRealm"] and LI.crafters["Cora Vale-TestRealm"].profs.alchemy, "a relinked profession belongs to its owner, not the sender")
check(not LI.crafters["Anna Smith-TestRealm"].profs.alchemy, "the sender doesn't get the relinked profession")

W.clickWorks = true
SetItemRef("trade:Player-1-CCC:2259:171", "[Alchemy]", "LeftButton")
Advance(1)
local cora = LI.crafters["Cora Vale-TestRealm"].profs.alchemy
check(cora.recipes and cora.recipes[2330] and cora.via == "click", "clicking a link saves recipes", cora.via)
check(LI.test.click == 2, "the test counts reads from clicks")
check(LI.db.recipes[2330].k == "consumable", "potions are consumables")
Fire("TRADE_SKILL_LIST_UPDATE")
Advance(1)
check(LI.test.click == 2, "list updates of the same window don't count twice")
check(W.closed == 1, "a window the player opened is left open")
C_TradeSkillUI.CloseTradeSkill()

W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
Fire("TRADE_SKILL_SHOW")
Advance(1)
local me = LI.crafters[LI.playerKey]
check(me and me.profs.alchemy and me.profs.alchemy.via == "own" and me.profs.alchemy.recipes[2330], "opening your own profession saves it")
check(LI.test.own == 1, "the test counts your own professions")
check(me.profs.alchemy.link == "trade:Player-1-ME:2259:171" and me.profs.alchemy.text == "[Alchemy]", "your own profession gets a link so its button can open it", me.profs.alchemy.link)
check(LI.Status(LI.playerKey) == "online", "you are always online")
Fire("TRADE_SKILL_LIST_UPDATE")
Advance(1)
check(LI.test.own == 1, "your own profession is counted once")
C_TradeSkillUI.CloseTradeSkill()

local uiErrors = #W.errors
LI.UI.Open()
local main = LinkedInnFrame
check(main and main:IsShown(), "the window opens")
local function Shape()
	local out = {}
	for _, row in ipairs(main.list.__rows) do
		if row.data.header then
			out[#out + 1] = "#" .. row.data.group.key
		else
			out[#out + 1] = row.entry.key:match("^(%S+)")
		end
	end
	return table.concat(out, " ")
end
check(Shape() == "#alchemy Cora #tailoring Bob Anna", "crafters are grouped under profession headers, online first, without you", Shape())
local rows = main.list.__rows
check(rows[1].headName.__text == "Alchemy" and rows[1].headCount.__text == "1 crafter", "a header names the profession and counts crafters", rows[1].headCount.__text)
check(rows[3].headCount.__text:find("2 crafters", 1, true) and rows[3].headCount.__text:find("1 online", 1, true), "a header counts who is online", rows[3].headCount.__text)
check(main.count.__text:find("3 crafters remembered", 1, true), "the footer doesn't count you", main.count.__text)
check(rows[2].headName:IsShown() == false and rows[2].name:IsShown(), "crafter rows hide the header parts")
check(rows[1].name:IsShown() == false, "header rows hide the crafter parts")
local bobRow = rows[4]
check(bobRow.line.__text:find("^Skill 260  ·  1 recipe"), "a row describes that profession", bobRow.line.__text)
check(rows[5].line.__text == "Skill 260  ·  2 recipes", "skill and recipe count are shown", rows[5].line.__text)
bobRow.__scripts.OnClick(bobRow, "LeftButton")
check(W.tells[1] == "Bob Stone", "clicking a row whispers the crafter by name without the realm", W.tells[1])
W.typing = false
bobRow.__scripts.OnClick(bobRow, "RightButton")
check(W.lastMenu and W.lastMenu.entries[2] and W.lastMenu.entries[2].text == "Whisper", "right-click opens a menu with Whisper")
local opened = false
for _, e in ipairs(W.lastMenu.entries) do
	if e.text == "Open Tailoring" then opened = true end
end
check(opened, "the menu can open the stored profession link")
local tells = #W.tells
rows[1].__scripts.OnClick(rows[1], "LeftButton")
Advance(1)
check(Shape() == "#alchemy #tailoring Bob Anna", "clicking a header collapses it", Shape())
check(#W.tells == tells, "clicking a header doesn't whisper anyone")
main.list.__rows[1].__scripts.OnClick(main.list.__rows[1], "LeftButton")
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Bob Anna", "clicking it again expands it", Shape())
LI.SetRecipes("Anna Smith-TestRealm", { name = "Alchemy", rank = 40 }, { { id = 2330, name = "Minor Healing Potion", item = 118 } }, "click")
Advance(1)
check(Shape() == "#alchemy Cora Anna #tailoring Bob Anna", "someone with two professions is listed under both, higher skill first", Shape())
local annaAlch = main.list.__rows[3]
check(annaAlch.books[1].key == "alchemy" and annaAlch.books[2].key == "tailoring" and annaAlch.books[2]:IsShown(), "their row still shows every profession button")
LI.crafters["Anna Smith-TestRealm"].profs.alchemy = nil
LI.Fire("CraftersChanged")
Advance(1)

local triesBefore, streakBefore = LI.test.auto.tries, LI.test.auto.streak
local hyperBefore = #W.hyperlinks
W.autoWorks = true
check(LI.CheckOnline("Cora Vale-TestRealm") and LI.IsChecking("Cora Vale-TestRealm"), "with a stored link, the online check probes the profession")
check(W.hyperlinks[hyperBefore + 1] == "trade:Player-1-CCC:2259:171" and #W.who == 0, "the probe asks for the link, not /who", W.hyperlinks[hyperBefore + 1])
Advance(3)
check(not LI.IsChecking("Cora Vale-TestRealm") and LI.Status("Cora Vale-TestRealm") == "online", "a reply means they're online")
check(LI.test.auto.tries == triesBefore, "probes don't count as automatic reads")
local annaLink = "trade:Player-1-AAA:3908:197"
local annaData = W.linkData[annaLink]
W.linkData[annaLink] = nil
LI.CheckOnline("Anna Smith-TestRealm")
Advance(7)
check(not LI.IsChecking("Anna Smith-TestRealm") and LI.Status("Anna Smith-TestRealm") == "offline", "no reply means they're offline")
check(LI.test.auto.streak == streakBefore and LI.test.auto.timeout == 0, "an offline probe doesn't count against automatic reading")
W.linkData[annaLink] = annaData

W.guids["Player-1-DDD"] = { class = "MAGE", name = "Dee Gone", realm = "" }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-DDD", 3908, 197, "Tailoring"), "Dee Gone-TestRealm", "Player-1-DDD", "Trade - City")
LI.settings.autoRead = true
LI.crafters["Dee Gone-TestRealm"].seen = time() - 3600
local order = {}
local firstHyper = #W.hyperlinks
for _, k in ipairs({ "Cora Vale-TestRealm", "Anna Smith-TestRealm", "Dee Gone-TestRealm", "Bob Stone-TestRealm" }) do
	check(LI.CheckOnline(k), "rapid clicks are all accepted: " .. k)
end
check(LI.IsChecking("Anna Smith-TestRealm") and LI.IsChecking("Bob Stone-TestRealm"), "every clicked crafter shows as checking")
Advance(0.3)
check(not LI.IsChecking("Cora Vale-TestRealm") and LI.Status("Cora Vale-TestRealm") == "online", "an online reply resolves right away")
Advance(5)
check(not LI.IsChecking("Bob Stone-TestRealm") and LI.Status("Dee Gone-TestRealm") == "offline", "all queued checks finish within a few seconds", LI.Status("Dee Gone-TestRealm"))
check(W.hyperlinks[firstHyper + 1] == "trade:Player-1-CCC:2259:171" and W.hyperlinks[firstHyper + 3] == "trade:Player-1-DDD:3908:197", "queued checks run in click order, before background reads", W.hyperlinks[firstHyper + 3])
check(math.abs(LI.Reader.ProbeTimeout() - 0.4) < 0.01, "the wait adapts to how fast replies arrive", LI.Reader.ProbeTimeout())
check(#W.who == 0, "no /who was needed")
LI.Forget("Dee Gone-TestRealm")

W.guids["Player-1-EEE"] = { class = "MAGE", name = "Eve One", realm = "" }
W.guids["Player-1-FFF"] = { class = "MAGE", name = "Fay Two", realm = "" }
LI.tried["Eve One-TestRealm"] = time()
LI.tried["Fay Two-TestRealm"] = time()
Advance(10)
Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-EEE", 3908, 197, "Tailoring"), "Eve One-TestRealm", "Player-1-EEE", "Trade - City")
Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-FFF", 3908, 197, "Tailoring"), "Fay Two-TestRealm", "Player-1-FFF", "Trade - City")
local mark = #W.hyperlinks
for _ = 1, 40 do
	Advance(0.1)
	if #W.hyperlinks > mark then break end
end
check(W.hyperlinks[mark + 1] == "trade:Player-1-FFF:3908:197", "a background read started", W.hyperlinks[mark + 1])
LI.CheckOnline("Cora Vale-TestRealm")
Advance(5)
check(W.hyperlinks[mark + 2] == "trade:Player-1-CCC:2259:171", "a click jumps ahead of queued background reads", W.hyperlinks[mark + 2])
LI.settings.autoRead = false
LI.Forget("Eve One-TestRealm")
LI.Forget("Fay Two-TestRealm")
Advance(10)

W.autoWorks = false
LI.CheckOnline("Anna Smith-TestRealm")
W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
Fire("TRADE_SKILL_SHOW")
local hyperlinksAtOpen = #W.hyperlinks
Advance(0.1)
check(LI.IsChecking("Anna Smith-TestRealm"), "opening your own profession during a check doesn't count as their reply")
C_TradeSkillUI.CloseTradeSkill()
Advance(1)
check(LI.IsChecking("Anna Smith-TestRealm") and #W.hyperlinks == hyperlinksAtOpen, "nothing is read right after you close your own window", #W.hyperlinks - hyperlinksAtOpen)
Advance(6)
check(LI.Status("Anna Smith-TestRealm") == "offline", "the check still ends as offline")
Advance(5)
W.combat = true
local inFight = #W.hyperlinks
LI.CheckOnline("Cora Vale-TestRealm")
Advance(3)
check(#W.hyperlinks == inFight and LI.IsChecking("Cora Vale-TestRealm"), "a check clicked in combat waits")
W.combat = false
Advance(3)
check(#W.hyperlinks == inFight + 1, "and runs once combat ends")
Advance(3)
LI.settings.autoRead = false
W.autoWorks = false
Advance(10)

local stash = {}
for _, c in pairs(LI.crafters) do
	for _, prof in pairs(c.profs) do
		if prof.link then
			stash[#stash + 1] = { p = prof, link = prof.link }
			prof.link = nil
		end
	end
end
LI.ToggleFavorite("Cora Vale-TestRealm")
LI.ToggleFavorite("Cora Vale-TestRealm")
local coraRow
for _, row in ipairs(main.list.__rows) do
	if row.entry and row.entry.key == "Cora Vale-TestRealm" then coraRow = row end
end
LI.UI.Refresh()
for _, row in ipairs(main.list.__rows) do
	if row.entry and row.entry.key == "Cora Vale-TestRealm" then coraRow = row end
end
check(coraRow and coraRow.entry.key == "Cora Vale-TestRealm", "found Cora's row")
check(coraRow.pill:IsShown(), "each row has a last seen pill")
check(#coraRow.pill.text.__text <= 7, "last seen is shown short", coraRow.pill.text.__text)
local function CoraRow()
	for _, row in ipairs(main.list.__rows) do
		if row.entry and row.entry.key == "Cora Vale-TestRealm" then return row end
	end
end
coraRow.pill.__scripts.OnClick(coraRow.pill)
coraRow = CoraRow()
check(coraRow.pill.text.__text == "...", "clicking the pill starts a check and shows dots", coraRow.pill.text.__text)
check(W.who[1] and W.who[1].filter == "x-Cora+Vale" and W.who[1].origin == 3, "the check sends an exact /who with the surname joined", W.who[1] and W.who[1].filter)
check(LI.CheckOnline("Anna Smith-TestRealm") == false and #W.who == 1, "only one check runs at a time")
Fire("CHAT_MSG_SYSTEM", "You have learned a new spell.")
Advance(1)
check(LI.IsChecking("Cora Vale-TestRealm"), "unrelated system messages don't end the check")
W.whoResults = { { fullName = "Cora Vale", area = "Orgrimmar", level = 60 } }
Fire("WHO_LIST_UPDATE")
Advance(1)
check(LI.Status("Cora Vale-TestRealm") == "online", "a /who hit marks the crafter online")
check(LI.crafters["Cora Vale-TestRealm"].where == "Orgrimmar", "the zone from /who is shown", LI.crafters["Cora Vale-TestRealm"].where)
local said = false
for _, m in ipairs(W.chat) do
	if m:find("is online in Orgrimmar", 1, true) then said = true end
end
check(said, "the result is printed in chat")
coraRow = CoraRow()
check(coraRow.pill.text.__text == "online", "a confirmed online crafter's pill says online", coraRow.pill.text.__text)

W.whoResults = {}
LI.CheckOnline("Bob Stone-TestRealm")
Fire("CHAT_MSG_SYSTEM", "0 players total")
Advance(1)
check(not LI.IsChecking("Bob Stone-TestRealm"), "zero results end the check")
check(LI.Status("Bob Stone-TestRealm") == "online", "guild status still wins over /who for guild members")

LI.CheckOnline("Anna Smith-TestRealm")
Fire("CHAT_MSG_SYSTEM", "0 players total")
Advance(1)
check(LI.Status("Anna Smith-TestRealm") == "offline", "zero results mark the crafter offline")
LI.CheckOnline("Anna Smith-TestRealm")
Fire("CHAT_MSG_SYSTEM", "[Anna Smith]: Level 60 Human Priest - Stormwind City")
Advance(1)
check(LI.Status("Anna Smith-TestRealm") == "online" and LI.crafters["Anna Smith-TestRealm"].where == "Stormwind City", "a /who line printed to chat counts too", LI.crafters["Anna Smith-TestRealm"].where)
LI.CheckOnline("Anna Smith-TestRealm")
Advance(6)
check(not LI.IsChecking("Anna Smith-TestRealm"), "a check with no answer gives up")
check(LI.Status("Anna Smith-TestRealm") == "online", "no answer keeps the last known status")
LI.crafters["Anna Smith-TestRealm"].where = "Trade"

LI.CheckOnline("Bob Stone-TestRealm")
Fire("CHAT_MSG_SYSTEM", "0 players total")
LI.CheckOnline("Cora Vale-TestRealm")
Fire("CHAT_MSG_SYSTEM", "0 players total")
Advance(1)
local coraNow
for _, row in ipairs(main.list.__rows) do
	if row.entry and row.entry.key == "Cora Vale-TestRealm" then coraNow = row end
end
check(coraNow and coraNow.pill.text.__text == "offline", "a confirmed offline crafter's pill says offline", coraNow and coraNow.pill.text.__text)
for _, item in ipairs(stash) do
	item.p.link = item.link
end

local favRow
for _, row in ipairs(main.list.__rows) do
	if row.entry and row.entry.key == "Cora Vale-TestRealm" then favRow = row end
end
check(favRow.star:GetAlpha() == 0, "the star is hidden until you hover a row")
favRow.__scripts.OnEnter(favRow)
check(favRow.star:GetAlpha() > 0, "hovering a row shows its star")
favRow.__scripts.OnLeave(favRow)
favRow.star.__scripts.OnClick(favRow.star)
Advance(1)
check(LI.IsFavorite("Cora Vale-TestRealm"), "clicking the star adds a favorite")
check(Shape():find("^#favorites Cora #alchemy") ~= nil, "favorites are listed first in their own section", Shape())
check(main.list.__rows[1].headName.__text == "Favorites", "the favorites header is named")
check(main.list.__rows[2].star:GetAlpha() == 1, "a favorite's star stays visible")
local coraCount = 0
for _, row in ipairs(main.list.__rows) do
	if row.entry and row.entry.key == "Cora Vale-TestRealm" then coraCount = coraCount + 1 end
end
check(coraCount == 2, "a favorite also stays under its profession", coraCount)
main.search:SetText("tailor")
main.search.__scripts.OnTextChanged(main.search)
Advance(1)
check(Shape():find("#favorites", 1, true) == nil, "favorites that don't match the search are hidden", Shape())
main.search:SetText("")
main.search.__scripts.OnTextChanged(main.search)
Advance(1)
main.list.__rows[2].star.__scripts.OnClick(main.list.__rows[2].star)
Advance(1)
check(not LI.IsFavorite("Cora Vale-TestRealm") and Shape():find("#favorites", 1, true) == nil, "clicking the star again removes the favorite", Shape())
LI.ToggleFavorite("Cora Vale-TestRealm")
LI.ToggleFavorite("Cora Vale-TestRealm")
Advance(1)

local function Chips()
	local out = {}
	for _, chip in ipairs(main.chips) do
		if chip:IsShown() then out[#out + 1] = chip.key end
	end
	return table.concat(out, ",")
end
local function Chip(key)
	for _, chip in ipairs(main.chips) do
		if chip:IsShown() and chip.key == key then return chip end
	end
end
check(Chips() == "alchemy,blacksmithing,enchanting,engineering,leatherworking,tailoring", "every main profession has a filter even with nobody in it", Chips())
check(Chip("engineering").count.__text == "" and Chip("tailoring").count.__text == "2", "filters show how many crafters they hold", Chip("tailoring").count.__text)
check(not main.clearChips:IsShown(), "no clear button without a filter")
Chip("alchemy").__scripts.OnClick(Chip("alchemy"))
Advance(1)
check(Shape() == "#alchemy Cora", "picking a profession filters the list", Shape())
check(main.clearChips:IsShown(), "a clear button appears with a filter")
Chip("tailoring").__scripts.OnClick(Chip("tailoring"))
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob", "picking a second profession shows both", Shape())
Chip("alchemy").__scripts.OnClick(Chip("alchemy"))
Advance(1)
check(Shape() == "#tailoring Anna Bob", "clicking a picked profession removes it", Shape())
main.clearChips.__scripts.OnClick(main.clearChips)
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob" and not main.clearChips:IsShown(), "clear shows everyone again", Shape())
LI.settings.maxOnly = not LI.settings.maxOnly
LI.UI.Refresh()
Advance(1)
check(Shape() == "" and main.empty:IsShown(), "max skill hides crafters below the cap", Shape())
LI.crafters["Anna Smith-TestRealm"].profs.tailoring.rank = 300
LI.Fire("CraftersChanged")
Advance(1)
check(Shape() == "#tailoring Anna", "a crafter at the cap shows up", Shape())
LI.crafters["Anna Smith-TestRealm"].profs.tailoring.rank = 260
LI.settings.maxOnly = not LI.settings.maxOnly
LI.UI.Refresh()
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob", "unticking shows everyone again", Shape())
local extent = main.list.__view.__extent
check(LI.settings.compact and extent(1, { entry = {} }) == 24, "compact is the default")
main.compactBox:SetChecked(false)
main.compactBox.__scripts.OnClick(main.compactBox)
Advance(1)
check(extent(1, { entry = {} }) == 46 and extent(1, { header = true }) == 34, "normal rows are tall")
main.compactBox:SetChecked(true)
main.compactBox.__scripts.OnClick(main.compactBox)
Advance(1)
check(LI.settings.compact and extent(1, { entry = {} }) == 24 and extent(1, { header = true }) == 34, "compact rows are about half the height, headers stay")
local compactRow = main.list.__rows[2]
check(compactRow.compact and compactRow.pill.__w == 44 and compactRow.books[1].__w == 18, "compact shrinks the pill and profession buttons")
check(compactRow.line.__text == "Skill 150  ·  1 recipe" and compactRow.name:IsShown(), "skill and recipes sit next to the name", compactRow.line.__text)
check(not compactRow.books[1].rank:IsShown(), "compact hides the skill number on the buttons, it's in the text")
main.compactBox:SetChecked(false)
main.compactBox.__scripts.OnClick(main.compactBox)
Advance(1)
check(not main.list.__rows[2].compact and main.list.__rows[2].books[1].rank:IsShown(), "unticking brings the full rows back")

LI.SetRecipes("Dan Cook-TestRealm", { name = "Cooking", rank = 225 }, { { id = 818, name = "Spiced Wolf Meat", item = 2680 } }, "click")
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob", "secondary professions are hidden by default", Shape())
check(not Chip("cooking"), "and have no filter by default")
main.secondaryToggle.__scripts.OnClick(main.secondaryToggle)
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob #cooking Dan", "the secondary checkbox shows them", Shape())
check(Chips() == "alchemy,blacksmithing,enchanting,engineering,leatherworking,tailoring,cooking,first aid,fishing", "and adds their filters", Chips())
Chip("cooking").__scripts.OnClick(Chip("cooking"))
Advance(1)
check(Shape() == "#cooking Dan", "secondary filters work like the others", Shape())
main.secondaryToggle.__scripts.OnClick(main.secondaryToggle)
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob", "unticking secondary drops its filters too", Shape())
LI.settings.profs = {}
LI.Forget("Dan Cook-TestRealm")
if not LI.IsFavorite("Cora Vale-TestRealm") then LI.ToggleFavorite("Cora Vale-TestRealm") end
Advance(1)

local function Fake(key, rank, count, seen)
	return { key = key, status = "offline", seenAt = seen, crafter = { profs = { tailoring = { name = "Tailoring", rank = rank, count = count } } }, groups = { { key = "tailoring", confidence = 2, makes = 0 } } }
end
local order = {}
for _, row in ipairs(LI.Group({ Fake("a", 100, 5, 1), Fake("b", 300, 2, 1), Fake("c", 300, 9, 1), Fake("d", 300, 9, 5) })[1].rows) do
	order[#order + 1] = row.entry.key
end
check(table.concat(order) == "dcba", "rows sort by skill, then recipes, then last seen", table.concat(order))
main.search.__scripts.OnTextChanged(main.search)
main.search:SetText("mooncloth")
main.search.__scripts.OnTextChanged(main.search)
Advance(1)
check(Shape() == "#tailoring Anna", "typing in the search box filters the list; crafters whose recipes rule it out drop away", Shape())
local annaRow = main.list.__rows[2]
local annaBook = annaRow.books and annaRow.books[1]
check(annaBook and annaBook:IsShown() and annaBook.key == "tailoring", "each row shows a button per profession")
check(annaBook and annaBook.match and annaBook.glow:IsShown(), "the profession that matches the search is highlighted")
check(annaBook and annaBook.rank.__text == "260", "the profession button shows the skill level", annaBook and annaBook.rank.__text)
local refs = W.itemRefs or 0
local whispers = #W.tells
annaBook.__scripts.OnClick(annaBook)
local book = LinkedInnBook
check(book and book:IsShown() and #W.tells == whispers and (W.itemRefs or 0) == refs, "clicking a profession button opens the recipe book, not a whisper or the live window")
check(LI.Book.Current().key == "Anna Smith-TestRealm" and LI.Book.Current().prof == "tailoring", "the book shows that crafter's profession")
LI.UI.Refresh()
do
	local openRow, others = nil, 0
	for _, r in ipairs(main.list.__rows) do
		if r.entry and r.entry.key == "Anna Smith-TestRealm" then
			openRow = r
		elseif r.sel and r.sel:IsShown() then
			others = others + 1
		end
	end
	check(openRow and openRow.sel:IsShown() and openRow.selBar:IsShown() and others == 0, "the crafter whose book is open is highlighted in the list")
	check(openRow and openRow.books[1].open and openRow.books[1].glow:IsShown(), "and so is the profession you opened")
	LI.Book.Frame():Hide()
	LI.UI.Refresh()
	local closedRow
	for _, r in ipairs(main.list.__rows) do
		if r.entry and r.entry.key == "Anna Smith-TestRealm" then
			closedRow = r
		end
	end
	check(closedRow and not closedRow.sel:IsShown() and not closedRow.books[1].open, "closing the book clears the highlight")
	LI.Book.Frame():Show()
	LI.UI.Refresh()
end
check(book.search.__text == "mooncloth" and #book.list.__rows == 2 and book.list.__rows[1].data.header and book.list.__rows[2].name.__text == "Mooncloth Bag", "the book opens filtered to what you searched for", #book.list.__rows)
check(book.prof.__text == "Tailoring  260/300" and book.info.__text:find("2 recipes", 1, true), "the book header shows skill and recipe count", book.info.__text)
book.search:SetText("")
book.search.__scripts.OnTextChanged(book.search)
local function BookShape()
	local out = {}
	for _, row in ipairs(book.list.__rows) do
		out[#out + 1] = row.data.header and ("#" .. row.data.name) or row.data.name
	end
	return table.concat(out, ",")
end
check(BookShape() == "#Bags,Mooncloth Bag,#Armor,Brown Linen Pants", "the book groups recipes under categories in the game's order", BookShape())
local bag = book.list.__rows[2]
check(bag.reagents[1]:IsShown() and bag.reagents[1].count.__text == "4" and bag.reagents[3]:IsShown() and bag.reagents[1].icon.__texture == 60000 + 14342, "each recipe shows its reagents with counts", bag.reagents[1].count.__text)
check(book.list.__rows[4].reagents[2].count.__text == "", "a single reagent shows no count")
local lines = LI.Book.ReagentLines(LI.db.recipes[18560])
check(#lines == 3 and lines[1]:find("4 \195\151 Mooncloth", 1, true) and lines[3]:find("Loading", 1, true), "hovering lists reagents with icon, amount and name", lines[1])
book.search:SetText("felcloth")
book.search.__scripts.OnTextChanged(book.search)
check(BookShape() == "#Bags,Mooncloth Bag", "the book search also finds recipes by reagent", BookShape())
book.search:SetText("")
book.search.__scripts.OnTextChanged(book.search)
bag = book.list.__rows[2]
bag.__scripts.OnClick(bag)
check(W.tells[#W.tells] == "Anna Smith" and W.editBox.text == "Hi! Could you make |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r?", "clicking a recipe opens a whisper asking for it", W.editBox.text)
W.shift = true
local tellsNow = #W.tells
bag.__scripts.OnClick(bag)
W.shift = false
check(#W.tells == tellsNow and W.links[#W.links]:find("Mooncloth Bag", 1, true), "shift-clicking a recipe links it in chat")
local pants = book.list.__rows[4]
pants.__scripts.OnClick(pants)
check(W.editBox.text == "Hi! Could you make [Brown Linen Pants]?", "an uncached item still gets asked for by name", W.editBox.text)
check(LI.IsChecking("Anna Smith-TestRealm") and book.state.__text == "Checking..." and not book.live:IsEnabled(), "opening a book quietly checks if they're online", book.state.__text)
local chatLines = #W.chat
Advance(7)
check(book.state.__text == "Offline" and not book.live:IsEnabled(), "no reply greys out Open in game and says Offline", book.state.__text)
check(#W.chat == chatLines, "the quiet check prints nothing in chat")
book.live.__scripts.OnClick(book.live)
check((W.itemRefs or 0) == refs, "a greyed out Open in game does nothing")
W.autoWorks = true
book:Hide()
annaBook.__scripts.OnClick(annaBook)
Advance(3)
W.autoWorks = false
check(book.state.__text == "Online" and book.live:IsEnabled(), "a reply enables Open in game and says Online", book.state.__text)
check(#W.chat == chatLines, "a quiet online result prints nothing either")
local refsNow = W.itemRefs or 0
book.live.__scripts.OnClick(book.live)
check((W.itemRefs or 0) == refsNow + 1, "Open in game opens the live window")
annaBook.__scripts.OnClick(annaBook)
check(book:IsShown(), "opening with a search keeps the book open")
main.search:SetText("")
main.search.__scripts.OnTextChanged(main.search)
Advance(1)
for _, row in ipairs(main.list.__rows) do
	if row.entry and row.entry.key == "Anna Smith-TestRealm" then annaBook = row.books[1] end
end
annaBook.__scripts.OnClick(annaBook)
check(not book:IsShown(), "clicking the same profession again closes the book")
annaBook.__scripts.OnClick(annaBook)
check(book:IsShown() and book.search.__text == "", "and once more opens it, unfiltered")
book:Hide()
W.typing = false
check(annaRow.line.__text and annaRow.line.__text:find("Can make Mooncloth Bag", 1, true), "the row says what the crafter can make", annaRow.line.__text)
main.search:SetText("")
main.search.__scripts.OnTextChanged(main.search)
Advance(1)
SlashCmdList.LINKEDINN("test")
check(main.selectedTab == 3 and main.testPage:IsShown() and not main.findPage:IsShown(), "/li test still opens the test page")
check(_G["LinkedInnFrameTab2"] ~= nil and _G["LinkedInnFrameTab3"] == nil, "only Crafters and Work have tabs")
check(main.testPage.head.__text == "Chat alone is enough", "one clean automatic read gives the good verdict", main.testPage.head.__text)
check(#W.errors == uiErrors, "the window builds without errors", W.errors[uiErrors + 1])

local okBefore, clicksBefore = LI.test.auto.ok, LI.test.click
local saved = Logout()
Boot(saved)
check(LI.crafters["Anna Smith-TestRealm"] and LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes[18560], "crafters and recipes survive a reload")
check(okBefore > 0 and LI.test.auto.ok == okBefore and LI.test.click == clicksBefore, "test results survive a reload", LI.test.auto.ok .. " " .. LI.test.click)
check(LI.guids["Player-1-CCC"] == "Cora Vale-TestRealm", "the GUID index is rebuilt after a reload")
check(LI.IsFavorite("Cora Vale-TestRealm"), "favorites survive a reload")
LI.test.built = nil
LI.test.sync = nil
local older = Logout()
Boot(older)
check(LI.test.built and LI.test.built.tries == 0 and LI.test.sync and LI.test.sync.sent ~= nil, "saved test stats from older builds get their missing counters")
LI.db.profLinks = {}
local again = Logout()
Boot(again)
check(LI.db.profLinks.alchemy and LI.db.profLinks.alchemy.spell == 2259, "profession link numbers are recovered from saved crafters", LI.db.profLinks.alchemy and LI.db.profLinks.alchemy.spell)
W.clock = W.clock + 90 * 86400
local savedOld = Logout()
Boot(savedOld)
check(LI.crafters["Cora Vale-TestRealm"] ~= nil, "favorites are never forgotten for being old")
check(LI.crafters["Anna Smith-TestRealm"] == nil, "other crafters are forgotten after two months")
LI.Forget("Cora Vale-TestRealm")
check(not LI.IsFavorite("Cora Vale-TestRealm"), "forgetting a crafter removes the favorite")

Setup()
W.combat = true
Boot()
W.autoWorks = false
local guids = { "Player-1-AAA", "Player-1-BBB", "Player-1-CCC" }
for i = 1, 3 do
	Say("CHAT_MSG_CHANNEL", TradeLink(guids[i], 3908, 197, "Tailoring"), W.guids[guids[i]].name .. "-TestRealm", guids[i], "Trade - City")
end
Advance(30)
check(LI.test.auto.tries == 0, "nothing is read in combat")
W.combat = false
for i = 1, 6 do
	W.guids["Player-2-" .. i] = { class = "MAGE", name = "Mage" .. i .. " Test", realm = "" }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-" .. i, 3908, 197, "Tailoring"), "Mage" .. i .. " Test-TestRealm", "Player-2-" .. i, "Trade - City")
end
for _ = 1, 120 do
	Advance(1)
	if LI.test.auto.tries >= 5 then break end
end
Advance(10)
check(LI.test.auto.tries == 5 and LI.test.auto.timeout == 5, "reading pauses after five links in a row get no reply", LI.test.auto.tries)
check(LI.Reader.IsBroken(), "the reader reports the pause")
local st, _, sure = LI.Status("Mage6 Test-TestRealm")
check(st == "offline" and sure == true, "a link that gets no reply marks its owner offline", st)
Advance(60)
check(LI.test.auto.tries > 5 and not LI.Reader.IsBroken(), "after a minute it carries on by itself", LI.test.auto.tries)
Advance(200)
LI.UI.Open(LI.UI.TAB.test)
check(LinkedInnFrame.testPage.head.__text == "Links need a click", "the test page says links need a click", LinkedInnFrame.testPage.head.__text)
LinkedInnFrame:Hide()
LI.Reader.Retry()
W.autoWorks = true
W.linkData["trade:Player-2-1:3908:197"] = { linkedName = "Mage1 Test", prof = TAILORING, recipes = TAILOR_RECIPES }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-1", 3908, 197, "Tailoring"), "Mage1 Test-TestRealm", "Player-2-1", "Trade - City")
Advance(12)
check(LI.test.auto.ok == 1, "retrying reads again", LI.test.auto.ok)
LI.UI.Open(LI.UI.TAB.test)
check(LinkedInnFrame.testPage.head.__text == "Chat alone is enough", "a later success changes the verdict")
LinkedInnFrame:Hide()

local loads = 0
_G.ProfessionsFrame_LoadUI = function()
	loads = loads + 1
	ProfessionsFrame = NewMock("Frame", "ProfessionsFrame")
	ProfessionsFrame:Hide()
	Fire("ADDON_LOADED", "Blizzard_Professions")
	return true
end
local alphas = {}
local clickable
W.linkData["trade:Player-2-2:3908:197"] = { linkedName = "Mage2 Test", prof = TAILORING, recipes = TAILOR_RECIPES }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-2", 3908, 197, "Tailoring"), "Mage2 Test-TestRealm", "Player-2-2", "Trade - City")
for _ = 1, 300 do
	Advance(0.1)
	if ProfessionsFrame and ProfessionsFrame:IsShown() then
		alphas[#alphas + 1] = ProfessionsFrame:GetAlpha()
		if ProfessionsFrame:GetScale() > 0.05 or ProfessionsFrame:IsMouseEnabled() then
			clickable = (clickable or 0) + 1
		end
	end
end
check(loads == 1, "the professions window is loaded before the first automatic read", loads)
check(#alphas == 0 or math.max(table.unpack(alphas)) == 0, "the profession window stays invisible during automatic reads", alphas[1])
check(#alphas > 0 and clickable == nil, "while hidden it's shrunk to a speck and ignores the mouse, so it never blocks your clicks", clickable)
check(not ProfessionsFrame:IsShown() or (ProfessionsFrame:GetScale() == 1 and ProfessionsFrame:IsMouseEnabled()), "afterwards its size and mouse are as before")
ProfessionsFrame:Show()
check(ProfessionsFrame:GetAlpha() ~= 0 and ProfessionsFrame:GetScale() == 1 and ProfessionsFrame:IsMouseEnabled(), "opening it yourself shows it normally", ProfessionsFrame:GetScale())
ProfessionsFrame:Hide()
check(LI.test.auto.flashed == 0, "no flash is counted when the window stays hidden", LI.test.auto.flashed)
check(ProfessionsFrame:GetAlpha() == 1 and not ProfessionsFrame:IsShown(), "the window is closed and made visible again afterwards")
check(LI.crafters["Mage2 Test-TestRealm"].profs.tailoring.via == "auto", "the hidden read still saves recipes")
ProfessionsFrame:Show()
check(ProfessionsFrame:GetAlpha() == 1, "opening the window yourself is not hidden")
ProfessionsFrame:Hide()

local tries = LI.test.auto.tries
_G.GetUIPanel = function(key) if key == "left" then return W.openPanel end end
W.openPanel = NewMock("Frame", "CharacterFrame")
W.linkData["trade:Player-2-3:3908:197"] = { linkedName = "Mage3 Test", prof = TAILORING, recipes = TAILOR_RECIPES }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-3", 3908, 197, "Tailoring"), "Mage3 Test-TestRealm", "Player-2-3", "Trade - City")
Advance(30)
check(LI.test.auto.tries == tries, "nothing is read while another window is open")
W.openPanel = nil
Advance(12)
check(LI.test.auto.tries > tries, "reading resumes when the window closes")
Advance(60)

W.autoWorks = false
W.showEmpty = true
local before = W.closed
W.guids["Player-2-7"] = { class = "MAGE", name = "Mage7 Test", realm = "" }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-7", 3908, 197, "Tailoring"), "Mage7 Test-TestRealm", "Player-2-7", "Trade - City")
local origHyper = methods.SetHyperlink
methods.SetHyperlink = function(self, link)
	table.insert(W.hyperlinks, link)
	ProfessionsFrame:Show()
end
Advance(30)
methods.SetHyperlink = origHyper
check(W.closed > before and not ProfessionsFrame:IsShown() and ProfessionsFrame:GetAlpha() == 1, "a hidden window with no reply is closed and restored")
W.showEmpty = false

W.guids["Player-2-8"] = { class = "MAGE", name = "Mage8 Test", realm = "" }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-8", 3908, 197, "Tailoring"), "Mage8 Test-TestRealm", "Player-2-8", "Trade - City")
local escaped
methods.SetHyperlink = function(self, link)
	ProfessionsFrame:Show()
	C_Timer.After(0.5, function()
		ProfessionsFrame:Hide()
		escaped = ProfessionsFrame:GetAlpha()
	end)
end
Advance(12)
methods.SetHyperlink = origHyper
check(escaped == 1, "a hidden window closed some other way is made visible again at once", escaped)


local before = LI.test.links
Fire("CHAT_MSG_CHANNEL", { __secret = true }, { __secret = true }, "", "", "", "", 0, 0, "", 0, 1, { __secret = true })
check(LI.test.links == before, "secret chat values are ignored")

Fire("CHAT_MSG_CHANNEL", "|Htrade:garbage|h[]|h |Htrade:|h[x]|h", "Odd One-TestRealm", "", "", "", "", 0, 0, "Trade - City", 0, 1, "Player-9-ZZZ")
check(not LI.crafters["Odd One-TestRealm"] or true, "broken links don't crash")

LI.ResetTest()
check(LI.test.links == 0 and LI.test.auto.tries == 0 and #LI.db.log == 0, "the test can be reset")

check(#W.errors == 0, "no errors", W.errors[1])
do
	Setup()
	Boot()
	LI.settings.autoRead = false
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-BBB", 3908, 197, "Tailoring"), "Bob Stone-TestRealm", "Player-1-BBB", "Trade - City")
	Advance(20 * 60)
	W.linkData["trade:Player-1-BBB:3908:197"] = nil
	W.autoWorks = true
	local mark = #W.hyperlinks
	check(LI.CheckOnline("Anna Smith-TestRealm") and LI.CheckOnline("Bob Stone-TestRealm"), "two quick clicks are both accepted")
	Advance(1)
	check(W.hyperlinks[mark + 2] == "trade:Player-1-BBB:3908:197", "the second click runs right after the first", W.hyperlinks[mark + 2])
	Advance(2)
	check(LI.Status("Anna Smith-TestRealm") == "online" and LI.Status("Bob Stone-TestRealm") ~= "online", "each click gets its own answer")
	check(LI.crafters["Bob Stone-TestRealm"].profs.tailoring.recipes == nil, "a check never gives one crafter another's recipes")
	W.autoWorks = false
	LI.CheckOnline("Bob Stone-TestRealm")
	W.trade = { linked = true, linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Fire("TRADE_SKILL_LIST_UPDATE")
	Advance(0.05)
	check(LI.IsChecking("Bob Stone-TestRealm") and LI.Status("Bob Stone-TestRealm") ~= "online", "a late update from someone else's profession doesn't count as an answer")
	Advance(0.5)
	check(LI.crafters["Bob Stone-TestRealm"].profs.tailoring.recipes == nil and LI.Status("Bob Stone-TestRealm") ~= "online", "and its recipes are never filed under the person being checked")
	Advance(2)
	local before = #W.hyperlinks
	LI.CheckOnline("Anna Smith-TestRealm")
	Advance(0.1)
	check(#W.hyperlinks == before + 1, "a leftover hidden profession doesn't hold up the next check")
	C_TradeSkillUI.CloseTradeSkill()
	Advance(3)
	Advance(2)
	W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(1)
	check(LI.CheckOnline("Anna Smith-TestRealm") and LI.IsChecking("Anna Smith-TestRealm"), "a check can be queued while your own profession window is open")
	check(ProfessionsFrame:IsShown(), "your own profession opened during the quiet spell still shows its window")
	Advance(21)
	check(not LI.IsChecking("Anna Smith-TestRealm"), "a check never stays stuck on Checking")
	C_TradeSkillUI.CloseTradeSkill()
	Advance(3)
	W.openPanel = {}
	check(LI.CheckOnline("Anna Smith-TestRealm") and LI.Reader.SilentReads(), "with silent reads a game window doesn't block checks")
	Advance(4)
	check(not LI.IsChecking("Anna Smith-TestRealm"), "so the check runs right away")
	Advance(30)
	local framesFor = GetFramesRegisteredForEvent
	GetFramesRegisteredForEvent = nil
	check(LI.CheckOnline("Anna Smith-TestRealm"), "a check is accepted while a game window is open")
	Advance(10)
	check(LI.IsChecking("Anna Smith-TestRealm"), "it waits for the window instead of giving up after a few seconds")
	local waited = false
	for _, e in ipairs(LI.db.log) do
		if e.m:find("has to wait: a game window is open", 1, true) then waited = true end
	end
	check(waited, "the log says why it waits")
	W.openPanel = nil
	W.autoWorks = true
	Advance(4)
	check(not LI.IsChecking("Anna Smith-TestRealm") and LI.Status("Anna Smith-TestRealm") == "online", "once the window closes the check runs and its answer counts")
	GetFramesRegisteredForEvent = framesFor
	W.autoWorks = false
	Advance(30)
	W.openPanel = {}
	local changes = 0
	LI.Listen("StatusChanged", function() changes = changes + 1 end)
	LI.CheckOnline("Bob Stone-TestRealm")
	local before = changes
	Advance(22)
	check(not LI.IsChecking("Bob Stone-TestRealm") and changes > before, "a check that never runs gives up and the window is told to redraw")
	W.openPanel = nil
	local tries = #W.hyperlinks
	Advance(5)
	check(#W.hyperlinks == tries, "a check that gave up isn't sent later")
end

do
	Setup()
	W.guids["Player-1-EEE"] = { class = "PALADIN", name = "Ench Guy", realm = "" }
	W.linkData["trade:Player-1-EEE:3908:197"] = { linkedName = "Ench Guy", prof = TAILORING, recipes = TAILOR_RECIPES }
	Boot()
	W.autoWorks = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Advance(10)
	check(LI.db.profLinks.tailoring and LI.db.profLinks.tailoring.spell == 3908 and LI.db.profLinks.tailoring.line == 197, "the numbers of a seen profession link are remembered")
	check(LI.RecipeForItem(14155) == 18560, "a crafted item maps back to its recipe")
	local built0, auto0 = LI.test.built.tries, LI.test.auto.tries
	Say("CHAT_MSG_CHANNEL", "LFW can make |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r your mats", "Ench Guy-TestRealm", "Player-1-EEE", "Trade - City")
	Advance(10)
	check(W.hyperlinks[#W.hyperlinks] == "trade:Player-1-EEE:3908:197", "linking a craftable item builds that player's profession link", W.hyperlinks[#W.hyperlinks])
	local guy = LI.crafters["Ench Guy-TestRealm"]
	check(guy and guy.profs.tailoring and guy.profs.tailoring.count == 2 and guy.profs.tailoring.recipes[3914], "their full recipe list is read, not just the linked item")
	check(guy and guy.class == "PALADIN" and guy.where == "Trade", "they get their class and where they were seen")
	check(LI.test.built.tries == built0 + 1 and LI.test.built.ok == 1 and LI.test.auto.tries == auto0, "the test tab counts it separately from automatic reads")
	Say("CHAT_MSG_CHANNEL", "selling |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r", "Ench Guy-TestRealm", "Player-1-EEE", "Trade - City")
	Advance(10)
	check(LI.test.built.tries == built0 + 1, "a fresh list isn't read again")
	W.guids["Player-1-GGG"] = { class = "WARRIOR", name = "Wtb Guy", realm = "" }
	Say("CHAT_MSG_CHANNEL", "WTB |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r", "Wtb Guy-TestRealm", "Player-1-GGG", "Trade - City")
	Advance(10)
	check(LI.test.built.timeout == 1 and LI.crafters["Wtb Guy-TestRealm"] == nil and LI.test.auto.streak == 0, "no reply adds nobody and doesn't count against automatic reading")
	local tries = LI.test.built.tries
	Say("CHAT_MSG_CHANNEL", "WTB |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r pst", "Wtb Guy-TestRealm", "Player-1-GGG", "Trade - City")
	Advance(10)
	check(LI.test.built.tries == tries, "someone who didn't answer isn't tried again for a while")
	C_TradeSkillUI.GetProfessionInfoByRecipeID = function(id) if id == 7418 then return { professionName = "Enchanting" } end end
	Say("CHAT_MSG_CHANNEL", "|cffffd000|Henchant:7418|h[Enchant Bracer - Minor Health]|h|r", "Ench Guy-TestRealm", "Player-1-EEE", "Trade - City")
	check(LI.db.log[#LI.db.log].m:find("no enchanting link to copy yet", 1, true), "without a seen link of that profession it says so", LI.db.log[#LI.db.log].m)

	LI.db.profLinks.enchanting = { spell = 7411, line = 333 }
	local ENCH = { professionName = "Enchanting", professionID = 333, skillLevel = 40, maxSkillLevel = 75 }
	W.linkData["trade:Player-1-III:7411:333"] = { linkedName = "De Guy", prof = ENCH, recipes = { { id = 7418, name = "Enchant Bracer - Minor Health" } } }
	W.units = { nameplate4 = { name = "De", surname = "Guy", guid = "Player-1-III" } }
	Fire("UNIT_SPELLCAST_SUCCEEDED", "nameplate4", "cast-1", 13262)
	Advance(10)
	local de = LI.crafters["De Guy-TestRealm"]
	check(de and de.profs.enchanting and de.profs.enchanting.count == 1 and de.where == "Stormwind City", "seeing someone disenchant reads their enchanting", de and de.where)
	local tries1 = LI.test.built.tries
	W.units = { target = { name = "Craft", surname = "Er", guid = "Player-1-KKK" }, mouseover = { name = "Mob", surname = "", npc = true, guid = "Creature-1" } }
	Fire("UNIT_SPELLCAST_SUCCEEDED", "target", "cast-2", 133)
	Fire("UNIT_SPELLCAST_SUCCEEDED", "mouseover", "cast-3", 18560)
	Advance(10)
	check(LI.test.built.tries == tries1, "ordinary spells and NPCs give no clue")
	Fire("UNIT_SPELLCAST_SUCCEEDED", "target", "cast-4", 18560)
	Advance(10)
	check(LI.test.built.tries == tries1 + 1 and W.hyperlinks[#W.hyperlinks] == "trade:Player-1-KKK:3908:197", "seeing someone craft a known recipe reads that profession", W.hyperlinks[#W.hyperlinks])
	W.guids["Player-1-MMM"] = { class = "MAGE", name = "Bag Maker", realm = "" }
	W.linkData["trade:Player-1-MMM:3908:197"] = { linkedName = "Bag Maker", prof = TAILORING, recipes = TAILOR_RECIPES }
	Fire("CHAT_MSG_TRADESKILLS", "Bag Maker creates |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r.", "Bag Maker", "", "", "", "", 0, 0, "", 0, 1, "Player-1-MMM")
	Advance(10)
	local maker = LI.crafters["Bag Maker-TestRealm"]
	check(maker and maker.profs.tailoring and maker.profs.tailoring.recipes and maker.class == "MAGE", "a 'creates' line from the crafting log reads that player's profession", maker and maker.class)
	W.guids["Player-1-NNN"] = { class = "DRUID", name = "Plain Text", realm = "" }
	W.linkData["trade:Player-1-NNN:3908:197"] = { linkedName = "Plain Text", prof = TAILORING, recipes = TAILOR_RECIPES }
	Fire("CHAT_MSG_TRADESKILLS", "Plain Text creates Mooncloth Bag x2.", "Plain Text", "", "", "", "", 0, 0, "", 0, 1, "Player-1-NNN")
	Advance(10)
	check(LI.crafters["Plain Text-TestRealm"] and LI.crafters["Plain Text-TestRealm"].profs.tailoring, "it also works when the item is named without a link")
	local tries2 = LI.test.built.tries
	Fire("CHAT_MSG_TRADESKILLS", "No Id creates Mooncloth Bag.", "No Id", "", "", "", "", 0, 0, "", 0, 1, "")
	Fire("CHAT_MSG_TRADESKILLS", "Brew Master creates Mooncloth Bag.", "Brew Master", "", "", "", "", 0, 0, "", 0, 1, "Player-1-ME")
	Fire("CHAT_MSG_TRADESKILLS", "Some One creates Unknown Thing.", "Some One", "", "", "", "", 0, 0, "", 0, 1, "Player-1-OOO")
	Advance(10)
	check(LI.test.built.tries == tries2 and not LI.crafters["No Id-TestRealm"] and LI.waiting["No Id-TestRealm"] and LI.waiting["No Id-TestRealm"].profs.tailoring and not LI.waiting["Some One-TestRealm"], "without an id they wait off the list; unknown items are skipped")
	check(LinkedInnDB.realms.TestRealm.waiting["No Id-TestRealm"] ~= nil, "the waiting list is saved")
	W.guids["Player-1-QQQ"] = { class = "PRIEST", name = "No Id", realm = "" }
	W.linkData["trade:Player-1-QQQ:3908:197"] = { linkedName = "No Id", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_SAY", "anyone need bags?", "No Id-TestRealm", "Player-1-QQQ")
	Advance(10)
	local noId = LI.crafters["No Id-TestRealm"]
	check(noId and noId.profs.tailoring.count == 2 and noId.profs.tailoring.rank == 260 and noId.class == "PRIEST" and not LI.waiting["No Id-TestRealm"], "once they say anything, their full list and skill are read and they're listed", noId and noId.profs.tailoring.count)
	W.guids["Player-1-RRR"] = { class = "HUNTER", name = "Plate Guy", realm = "" }
	W.linkData["trade:Player-1-RRR:3908:197"] = { linkedName = "Plate Guy", prof = TAILORING, recipes = TAILOR_RECIPES }
	Fire("CHAT_MSG_TRADESKILLS", "Plate Guy creates Mooncloth Bag.", "", "", "", "", "", 0, 0, "", 0, 1, "")
	Advance(10)
	check(not LI.crafters["Plate Guy-TestRealm"], "a crafter not seen yet stays off the list")
	local cvarCount = #W.cvarLog
	W.units = { nameplate3 = { name = "Plate", surname = "Guy", guid = "Player-1-RRR" } }
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate3")
	Advance(10)
	W.units = nil
	local plate = LI.crafters["Plate Guy-TestRealm"]
	check(plate and plate.profs.tailoring.count == 2 and #W.cvarLog == cvarCount, "seeing them on a nameplate later reads them in full, without touching nameplate settings", plate and plate.profs.tailoring.count)
	W.guids["Player-1-PPP"] = { class = "ROGUE", name = "Name Only", realm = "" }
	W.linkData["trade:Player-1-PPP:3908:197"] = { linkedName = "Name Only", prof = TAILORING, recipes = TAILOR_RECIPES }
	W.units = { nameplate7 = { name = "Name", surname = "Only", guid = "Player-1-PPP" } }
	Fire("CHAT_MSG_TRADESKILLS", "Name Only creates Mooncloth Bag.", "", "", "", "", "", 0, 0, "", 0, 1, "")
	Advance(10)
	check(LI.crafters["Name Only-TestRealm"] and LI.crafters["Name Only-TestRealm"].profs.tailoring, "with no sender or id, the name comes from the text and the id from a nameplate")
	W.units = nil
	local c = LI.Crafts()
	check(c.lines == 7 and c.known == 5 and c.unknown == 1 and c.noId == 2 and c.queued == 5 and c.found == 2, "the crafting log is counted for /li status", string.format("%d %d %d %d %d", c.lines, c.known, c.unknown, c.noId, c.queued))

	W.units = {
		nameplate1 = { name = "Scan", surname = "One", guid = "Player-2-AAA" },
		nameplate2 = { name = "Scan", surname = "Two", guid = "Player-2-BBB" },
		nameplate3 = { name = "Enemy", surname = "Guy", guid = "Player-2-CCC", enemy = true },
		nameplate4 = { name = "Mob", surname = "", guid = "Creature-0", npc = true },
	}
	LI.db.profLinks.alchemy = { spell = 2259, line = 171 }
	W.linkData["trade:Player-2-AAA:2259:171"] = { linkedName = "Scan One", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	W.linkData["trade:Player-2-AAA:3908:197"] = { linkedName = "Scan One", prof = TAILORING, recipes = TAILOR_RECIPES }
	W.linkData["trade:Player-2-AAA:7411:333"] = { linkedName = "Scan One", prof = ENCH, recipes = { { id = 7418, name = "Enchant Bracer - Minor Health" } } }
	W.cvars.nameplateShowFriendlyPlayers = "1"
	local cvars = #W.cvarLog
	local chat0 = #W.chat
	Advance(30)
	local before = LI.DiscoverQueue()
	for i = 1, 4 do
		Fire("NAME_PLATE_UNIT_ADDED", "nameplate" .. i)
	end
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate1")
	check(LI.DiscoverQueue() == before + 2, "friendly players on nameplates are lined up once; enemies and NPCs aren't", LI.DiscoverQueue())
	Advance(40)
	local one = LI.crafters["Scan One-TestRealm"]
	check(one and one.profs.alchemy and one.profs.enchanting and one.profs.enchanting.count == 1, "a player you see gets their professions read in the background")
	local askedTailoring = false
	for _, h in ipairs(W.hyperlinks) do
		if h == "trade:Player-2-AAA:3908:197" then askedTailoring = true end
	end
	check(not askedTailoring and not one.profs.tailoring, "after two professions are found, nothing more is asked")
	check(not LI.crafters["Scan Two-TestRealm"] and not LI.crafters["Enemy Guy-TestRealm"], "players with no answer aren't added")
	check(#W.chat == chat0 and #W.cvarLog == cvars, "it runs quietly: nothing in chat, nameplate settings untouched")
	local tries = #W.hyperlinks
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate2")
	Advance(20)
	check(#W.hyperlinks == tries, "someone checked recently isn't checked again for a week")
	for i = 1, 12 do
		LI.Reader.Want("Busy" .. i .. "-TestRealm", "Tailoring", "trade:Player-9-B" .. i .. ":3908:197")
	end
	W.units = { nameplate5 = { name = "Busy", surname = "City", guid = "Player-2-BC1" } }
	W.linkData["trade:Player-2-BC1:2259:171"] = { linkedName = "Busy City", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate5")
	W.units = nil
	Advance(30)
	check(LI.Reader.QueueSize() > 0 and LI.crafters["Busy City-TestRealm"] and LI.crafters["Busy City-TestRealm"].profs.alchemy, "in a busy city, players you see still get checked between chat reads", LI.Reader.QueueSize())
	LI.tried["Scan One-TestRealm"] = nil
	check(LI.Discover("Scan One-TestRealm", "Player-2-AAA", LI.PRIO.seen) == false, "someone whose two professions are known is never lined up again")
	W.units = nil
	W.guild = { { name = "Guild Mate-TestRealm", online = true, guid = "Player-2-GM1" }, { name = "Gone Mate-TestRealm", online = false, guid = "Player-2-GM2" } }
	W.groupSize = 1
	W.units = { party1 = { name = "Group", surname = "Pal", guid = "Player-2-GP1" } }
	W.linkData["trade:Player-2-GP1:2259:171"] = { linkedName = "Group Pal", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	W.linkData["trade:Player-2-GM1:2259:171"] = { linkedName = "Guild Mate", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	local queued = LI.DiscoverQueue()
	Fire("GUILD_ROSTER_UPDATE")
	Fire("GROUP_ROSTER_UPDATE")
	check(LI.DiscoverQueue() == queued + 2, "online guild members and your group are lined up; offline ones aren't", LI.DiscoverQueue())
	for _ = 1, 30 do
		Advance(1)
		if LI.crafters["Group Pal-TestRealm"] then break end
	end
	check(LI.crafters["Group Pal-TestRealm"] and LI.crafters["Group Pal-TestRealm"].profs.alchemy, "your group comes first")
	Advance(30)
	check(LI.crafters["Guild Mate-TestRealm"] and LI.crafters["Guild Mate-TestRealm"].profs.alchemy, "then your guild")
	W.guild = {}
	W.groupSize = nil
	W.units = nil
	W.autoWorks = false
end

do
	Setup()
	W.profs = { { name = "Alchemy", rank = 150, max = 225, offset = 10, line = 171 }, { name = "Mining", rank = 100, max = 150, offset = 20, line = 186 } }
	W.spellbook = { [11] = 2259, [21] = 2575 }
	W.playerGUID = "Player-1-ME"
	W.linkData["trade:Player-1-ME:2259:171"] = { linkedName = "Brew Master", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	W.autoWorks = true
	Boot()
	check(LI.db.profLinks.alchemy and LI.db.profLinks.alchemy.spell == 2259 and LI.db.profLinks.alchemy.line == 171, "your own profession link numbers come from your spellbook")
	check(not LI.db.profLinks.mining, "gathering skills are left out")
	local hyper0 = #W.hyperlinks
	Advance(10)
	check(#W.hyperlinks == hyper0, "nothing is read in the first seconds after login")
	Advance(10)
	check(W.hyperlinks[hyper0 + 1] == "trade:Player-1-ME:2259:171" and #W.hyperlinks == hyper0 + 1, "your own profession is read quietly after login", W.hyperlinks[hyper0 + 1])
	local mine = LI.crafters[LI.playerKey].profs.alchemy
	check(mine.recipes and mine.recipes[2330] and mine.via == "own", "without opening any window, your recipes are known", mine.via)
	check(LI.test.click == 0 and LI.test.auto.tries == 0 and LI.test.own == 0, "it doesn't count as a click or an automatic read")
	check(LI.Work.CanMake({ recipe = 2330 }), "so the Work tab knows what you can make")
	Advance(30)
	local ver = LI.Sync.Version()
	W.linkData["trade:Player-1-ME:2259:171"] = { linkedName = "Brew Master", prof = ALCHEMY, recipes = { ALCHEMY_RECIPES[1], { id = 2331, name = "Minor Mana Potion", item = 2455 } } }
	Fire("NEW_RECIPE_LEARNED", 2331)
	Advance(10)
	check(LI.crafters[LI.playerKey].profs.alchemy.recipes[2331], "learning a recipe re-reads that profession")
	check(LI.Sync.Version() ~= ver, "and your shared list gets a new version")
	W.autoWorks = false
	W.playerGUID = nil
	W.profs = nil
	W.spellbook = nil
end

local function Sent(kind, chatType)
	local out = {}
	for _, m in ipairs(W.sent) do
		if m.msg:sub(1, #kind) == kind and (not chatType or m.chatType == chatType) then out[#out + 1] = m end
	end
	return out
end
local function Addon(msg, sender, chatType)
	Fire("CHAT_MSG_ADDON", "LinkedInn", msg, chatType or "CHANNEL", sender, "", 0, 5, "LinkedInnSync", 0)
end

do
	Setup()
	Boot()
	local Work = LI.Work
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	W.autoWorks = true
	Advance(10)
	W.autoWorks = false
	W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(1)
	C_TradeSkillUI.CloseTradeSkill()
	Advance(20)
	check(LI.Sync.IsJoined(), "the hidden channel is joined")
	W.sent = {}

	local function Last(kind)
		for i = #W.sent, 1, -1 do
			if W.sent[i].msg:sub(1, #kind) == kind then return W.sent[i] end
		end
	end

	local none, err = Work.Post({ qty = 1 })
	check(not none and err == "Pick an item first.", "posting needs an item", err)
	local req = Work.Post({ recipe = 18560, qty = 2, mats = "some", price = 150000, note = "pst | after 8", duration = 3600 })
	check(req and req.id == "1" and req.item == 14155 and req.note == "pst after 8", "a request is posted", req and req.note)
	Advance(2)
	local r1 = Last("R1|")
	check(r1 and r1.chatType == "CHANNEL" and r1.msg:find("^R1|1|" .. LI.Sync.B36(14155) .. "|" .. LI.Sync.B36(18560) .. "|2|s|" .. LI.Sync.B36(150000) .. "|"), "it goes out on the hidden channel", r1 and r1.msg)
	check(r1 and r1.msg:find("|pst after 8|$"), "with the note, then what you bring", r1 and r1.msg)
	local over = Work.Post({ recipe = 18560, qty = 1, have = { [14342] = 99, [14256] = 2, [8343] = 2 } })
	check(over and over.have[14342] == 4 and over.mats == "all", "bringing more than needed is capped and counts as all mats", over and over.have[14342])
	Work.Cancel(over.id)
	for i = 2, 5 do
		Work.Post({ recipe = 3914, qty = 1, mats = "none", price = 0 })
	end
	local sixth, why = Work.Post({ recipe = 3914 })
	check(not sixth and why:find("5 open requests", 1, true), "at most five open requests", why)
	for i = 3, 6 do Work.Cancel(tostring(i)) end
	Advance(12)
	check(#Work.Mine() == 1 and Last("X1|").msg == "X1|6", "cancelling sends a cancel", Last("X1|") and Last("X1|").msg)

	local function Req(id, recipe, item, qty, mats, price, ttl, note)
		return string.format("R1|%s|%s|%s|%d|%s|%s|%s|%s", id, LI.Sync.B36(item), LI.Sync.B36(recipe), qty, mats, LI.Sync.B36(price), LI.Sync.B36(ttl), note or "")
	end
	local toasts = 0
	local glow
	LI.Listen("WorkGlow", function(on) glow = on end)
	Addon(Req("7", 2330, 118, 5, "a", 20000, 3600, "need pots"), "Other Guy-TestRealm")
	Advance(0.2)
	local forYou = Work.Received(true)
	check(#forYou == 1 and forYou[1].recipe == 2330 and forYou[1].qty == 5 and forYou[1].note == "need pots", "a request you can make arrives")
	check(Work.UnseenCount() == 1 and glow == true, "it counts as new and the minimap glows")
	local t = LinkedInnToast
	check(t and t:IsShown() and t.head.__text == "Someone needs something you can make" and t.title.__text:find("Minor Healing Potion", 1, true), "a toast pops up", t and t.title.__text)
	Addon(Req("8", 18560, 14155, 1, "n", 0, 3600, ""), "Other Guy-TestRealm")
	Advance(0.2)
	check(#Work.Received(true) == 1 and #Work.Received(false) == 1 and not Work.Get("Other Guy-TestRealm:8"), "requests you can't make aren't kept at all")
	check(Work.UnseenCount() == 1, "and give no notice")
	Addon(Req("7", 2330, 118, 5, "a", 20000, 3600, "need pots"), "Other Guy-TestRealm")
	check(Work.UnseenCount() == 1, "a resent request isn't new again")

	local s2 = Work.Settings()
	s2.minPrice = 50000
	Addon(Req("9", 2330, 118, 1, "a", 10000, 3600, ""), "Cheap Skate-TestRealm")
	check(Work.UnseenCount() == 1, "the minimum price filter holds back cheaper requests")
	s2.minPrice = 0
	s2.allMats = true
	Addon(Req("1", 2330, 118, 1, "n", 90000, 3600, ""), "No Mats-TestRealm")
	check(Work.UnseenCount() == 1, "the all-mats filter holds back requests without mats")
	s2.allMats = false
	s2.profs = { tailoring = true }
	Addon(Req("1", 2330, 118, 1, "a", 90000, 3600, ""), "Prof Filter-TestRealm")
	check(Work.UnseenCount() == 1, "the profession filter holds back other professions")
	s2.profs = {}
	s2.notify = false
	Advance(10)
	Addon(Req("2", 2330, 118, 1, "a", 90000, 3600, ""), "Quiet One-TestRealm")
	Advance(0.2)
	check(Work.UnseenCount() == 2 and not (LinkedInnToast:IsShown() and LinkedInnToast.title.__text:find("Quiet", 1, true)), "with notices off there's no toast, but it still counts")
	s2.notify = true

	local key = "Other Guy-TestRealm:7"
	check(Work.Offer(key) and not Work.Offer(key), "you can offer once")
	Advance(2)
	local o1 = Last("O1|")
	check(o1 and o1.msg == "O1|7" and o1.chatType == "WHISPER" and o1.target == "Other Guy", "the offer is a hidden whisper to the requester", o1 and o1.target)
	Addon("O1|1", "Crafty Pal-TestRealm", "WHISPER")
	local mineReq = Work.Mine()[1]
	check(mineReq.offers["Crafty Pal-TestRealm"], "offers on your request are recorded")
	local sawOffer = false
	for _ = 1, 30 do
		if LinkedInnToast:IsShown() and LinkedInnToast.head.__text == "Someone can make it for you" then sawOffer = true end
		Advance(1)
	end
	check(sawOffer, "an offer pops a toast")
	Addon("O1|99", "Crafty Pal-TestRealm", "WHISPER")
	check(true, "offers on unknown requests are ignored")
	Addon(Req("c1", 2330, 118, 1, "n", 0, 3600, ""), "Other Guy-TestRealm")
	check(Work.Get("Other Guy-TestRealm:c1"), "another request arrives")
	Addon("X1|c1", "Other Guy-TestRealm")
	check(not Work.Get("Other Guy-TestRealm:c1"), "a cancel from the requester removes it")
	Addon("X1|7", "Somebody Else-TestRealm")
	check(Work.Get("Other Guy-TestRealm:7"), "nobody can cancel someone else's request")

	Addon("R1|bad!|1|1|1|a|0|10|x", "Bad Guy-TestRealm")
	Addon(Req("3", 2330, 118, 500, "a", 0, 3600, ""), "Bad Guy-TestRealm")
	Addon(Req("4", 2330, 118, 1, "a", 0, 999999, ""), "Bad Guy-TestRealm")
	Addon(Req("5", 2330, 118, 1, "z", 0, 3600, ""), "Bad Guy-TestRealm")
	check(not Work.Get("Bad Guy-TestRealm:bad!") and not Work.Get("Bad Guy-TestRealm:3") and not Work.Get("Bad Guy-TestRealm:4") and not Work.Get("Bad Guy-TestRealm:5"), "malformed requests are ignored")
	for i = 1, 8 do
		Addon(Req("s" .. i, 2330, 118, 1, "a", 0, 3600, ""), "Spam Mer-TestRealm")
	end
	local spam = 0
	for _, r in ipairs(Work.Received(false)) do
		if r.owner == "Spam Mer-TestRealm" then spam = spam + 1 end
	end
	check(spam == 5, "at most five requests per person", spam)
	Work.Hide("Spam Mer-TestRealm:s1")
	check(not Work.Get("Spam Mer-TestRealm:s1") or Work.Get("Spam Mer-TestRealm:s1").hidden, "hidden requests stay hidden")

	Addon(Req("6", 2330, 118, 1, "a", 0, 60, ""), "Short Lived-TestRealm")
	check(Work.Get("Short Lived-TestRealm:6"), "a short request arrives")
	Advance(61)
	Work.Received(false)
	check(not Work.Get("Short Lived-TestRealm:6"), "it disappears when it expires")
	local sends = #W.sent
	Advance(5 * 60)
	check(#W.sent > sends and Last("R1|").msg:find("^R1|1|"), "your open requests are resent every few minutes")
	Advance(13 * 60)
	Work.Received(false)
	check(not Work.Get("Other Guy-TestRealm:7"), "requests from someone gone quiet for 12 minutes are dropped")

	Addon(Req("7", 2330, 118, 5, "a", 20000, 3600, "need pots"), "Other Guy-TestRealm")
	Addon(Req("8", 18560, 14155, 1, "n", 0, 3600, ""), "Other Guy-TestRealm")
	Advance(0.5)
	LI.UI.Open(LI.UI.TAB.work)
	local main = LinkedInnFrame
	local page = main.workPage
	check(page:IsShown() and not main.findPage:IsShown() and not main.search:IsShown(), "the Work tab shows its own page")
	check(_G["LinkedInnFrameTab2"].__text == "Work", "opening the page clears the new count", _G["LinkedInnFrameTab2"].__text)
	check(LI.WorkUI.View() == "foryou" and #page.list.__rows == 1, "For you lists what you can make", #page.list.__rows)
	local row = page.list.__rows[1]
	check(row.accent:IsShown() and row.offer:IsShown() and row.name.__text:find("Minor Healing Potion", 1, true) and row.name.__text:find("5", 1, true), "the row shows the item, amount and an offer button", row.name.__text)
	check(row.line.__text:find("Other Guy", 1, true) and row.line.__text:find("Brings all mats", 1, true) and row.line.__text:find("need pots", 1, true), "who, mats and note are shown", row.line.__text)
	check(row.price.__text == "2g", "the price is shown", row.price.__text)
	row.offer.__scripts.OnClick(row.offer)
	Advance(0.2)
	row = page.list.__rows[1]
	check(not row.offer:IsShown() and row.state.__text:find("Offer sent", 1, true), "after offering the row says so")
	row.__scripts.OnClick(row, "LeftButton")
	check(W.tells[#W.tells] == "Other Guy" and W.editBox.text:find("I can make", 1, true), "clicking a request whispers the requester", W.editBox.text)
	W.typing = false
	check(#page.views == 2, "the tab has two views, For you and My requests")
	page.views[2].__scripts.OnClick(page.views[2])
	check(#page.list.__rows == 1 and page.list.__rows[1].state.__text:find("1 offer", 1, true), "My requests shows offers", page.list.__rows[1].state.__text)
	check(page.list.__rows[1].line.__text:find("1 crafter knows it", 1, true), "and how many crafters know it", page.list.__rows[1].line.__text)
	local mineRow = page.list.__rows[1]
	check(page.list.__view.__extent(1, { mine = true, req = mineRow.req }) == 78 and page.list.__view.__extent(1, { req = {} }) == 50, "rows with offers are taller to fit them")
	local chip = mineRow.chips[1]
	check(mineRow.offersLabel:IsShown() and chip and chip:IsShown() and chip.text.__text == "Crafty Pal", "each offer shows as a named pill on the request", chip and chip.text.__text)
	chip.__scripts.OnClick(chip, "LeftButton")
	check(W.tells[#W.tells] == "Crafty Pal" and W.editBox.text:find("Thanks for offering", 1, true), "clicking an offer whispers that person", W.editBox.text)
	W.typing = false
	chip.__scripts.OnClick(chip, "RightButton")
	local entries = {}
	for _, e in ipairs(W.lastMenu.entries) do entries[#entries + 1] = e.text end
	local menuText = table.concat(entries, ",")
	check(menuText:find("Invite to group", 1, true) and menuText:find("Remove offer", 1, true), "right-clicking an offer can invite or remove it", menuText)
	local remove
	for _, e in ipairs(W.lastMenu.entries) do if e.text == "Remove offer" then remove = e end end
	remove.a()
	Advance(0.2)
	check(not next(Work.Mine()[1].offers) and not page.list.__rows[1].offersLabel:IsShown(), "a removed offer disappears")
	page.list.__rows[1].__scripts.OnClick(page.list.__rows[1], "RightButton")
	entries = {}
	for _, e in ipairs(W.lastMenu.entries) do entries[#entries + 1] = e.text end
	menuText = table.concat(entries, ",")
	check(menuText:find("Cancel request", 1, true), "right-clicking your request can cancel it", menuText)

	local hdr = main.workHeader
	check(hdr:IsShown() and hdr.notify:GetChecked() and hdr.sound:GetChecked() and hdr.glow:GetChecked() and not hdr.allMats:GetChecked(), "notification settings sit above the list")
	check(hdr.price.__text == "" and hdr.profs.__text == "All my professions", "no minimum price and all professions to start", hdr.profs.__text)
	check(hdr.howLabel.__text == "Alert me by" and hdr.whatLabel.__text == "Only alert for", "the two rows say what they're for")
	hdr.allMats:SetChecked(true)
	hdr.allMats.__scripts.OnClick(hdr.allMats)
	check(Work.Settings().allMats == true, "ticking a box changes the setting")
	hdr.allMats:SetChecked(false)
	hdr.allMats.__scripts.OnClick(hdr.allMats)
	hdr.price:SetText("5")
	hdr.price.__scripts.OnTextChanged(hdr.price, true)
	check(Work.Settings().minPrice == 50000, "typing a number sets the minimum price in gold", Work.Settings().minPrice)
	hdr.price:SetText("")
	hdr.price.__scripts.OnTextChanged(hdr.price, true)
	check(Work.Settings().minPrice == 0, "clearing it means any price")
	hdr.profs.__scripts.OnClick(hdr.profs)
	check(W.lastMenu.entries[1] and W.lastMenu.entries[1].text == "Alchemy", "the profession dropdown lists your professions")
	W.lastMenu.entries[1].b()
	LI.WorkUI.Refresh()
	check(hdr.profs.__text == "0 professions" or hdr.profs.__text == "All my professions", "toggling your only profession resets to all", hdr.profs.__text)
	LI.UI.Open(LI.UI.TAB.find)
	check(not hdr:IsShown() and main.search:IsShown(), "the Crafters tab has its own controls there")
	LI.UI.Open(LI.UI.TAB.work)

	page.post.__scripts.OnClick(page.post)
	local dlg = LinkedInnRequest
	check(dlg and dlg:IsShown() and not dlg.post:IsEnabled(), "Post a request opens the panel, Post waits for an item")
	dlg.search:SetText("moon")
	dlg.search.__scripts.OnTextChanged(dlg.search)
	check(dlg.results[1]:IsShown() and dlg.results[1].name.__text == "Mooncloth Bag", "typing finds known recipes", dlg.results[1].name.__text)
	dlg.results[1].__scripts.OnClick(dlg.results[1])
	check(dlg.pick:IsShown() and dlg.pick.name.__text == "Mooncloth Bag" and dlg.post:IsEnabled(), "picking an item shows it and enables Post")
	check(dlg.info.__text:find("1 crafter on your list knows it", 1, true), "the panel says how many crafters know it", dlg.info.__text)
	check(dlg.body:IsShown() and dlg.rows[1]:IsShown() and dlg.rows[3]:IsShown() and not dlg.rows[4]:IsShown(), "the item's reagents are listed")
	check(dlg.rows[1].total.__text == "/ 4" and dlg.rows[1].name.__text == "Mooncloth", "each shows how many are needed", dlg.rows[1].total.__text)
	dlg.amount:Set(3)
	check(dlg.rows[1].total.__text == "/ 12" and dlg.rows[2].total.__text == "/ 6", "the amounts follow the quantity", dlg.rows[1].total.__text)
	check(dlg.info.__text:find("Needs all mats", 1, true), "with nothing brought, crafters see Needs all mats", dlg.info.__text)
	dlg.allLink.__scripts.OnClick(dlg.allLink)
	check(dlg.rows[1].spin:Get() == 12 and dlg.rows[3].spin:Get() == 6 and dlg.info.__text:find("Brings all mats", 1, true), "All fills in everything", dlg.info.__text)
	dlg.noneLink.__scripts.OnClick(dlg.noneLink)
	check(dlg.rows[1].spin:Get() == 0, "None clears it")
	dlg.rows[1].spin:Set(12)
	dlg.rows[2].spin:Set(99)
	check(dlg.rows[2].spin:Get() == 6, "you can't bring more than needed")
	dlg.rows[2].spin:Set(1)
	check(dlg.info.__text:find("Brings some mats", 1, true), "some of them gives Brings some mats", dlg.info.__text)
	dlg.gold:SetText("15")
	dlg.silver:SetText("50")
	dlg.note:SetText("thanks")
	dlg.post.__scripts.OnClick(dlg.post)
	local posted
	for _, m in ipairs(Work.Mine()) do
		if m.note == "thanks" then posted = m end
	end
	check(posted and posted.qty == 3 and posted.mats == "some" and posted.price == 155000 and posted.recipe == 18560, "Post creates the request from the panel", posted and posted.mats)
	check(posted and posted.have[14342] == 12 and posted.have[14256] == 1 and not posted.have[8343], "it records exactly what you bring")
	Advance(3)
	local sent = Last("R1|")
	check(sent and sent.msg:find("|" .. LI.Sync.B36(14256) .. ":1", 1, true) and sent.msg:find(LI.Sync.B36(14342) .. ":c", 1, true), "what you bring travels with the request", sent and sent.msg)
	local back = Work.Decode("Me Again-TestRealm", { "R1", "9", LI.Sync.B36(14155), LI.Sync.B36(18560), "3", "s", "0", "100", "", LI.Sync.B36(14342) .. ":c," .. LI.Sync.B36(14256) .. ":1" })
	check(back and back.have[14342] == 12 and back.have[14256] == 1, "and is read back on the other side")
	check(not dlg:IsShown() and LI.WorkUI.View() == "mine", "the panel closes and shows My requests")
	local sawPosted = false
	for _ = 1, 30 do
		if LinkedInnToast:IsShown() and LinkedInnToast.head.__text == "Request posted" then sawPosted = true end
		Advance(1)
	end
	check(sawPosted, "a toast confirms it")

	LI.Book.Open("Anna Smith-TestRealm", "tailoring", "")
	local bookRow = LinkedInnBook.list.__rows[2]
	bookRow.__scripts.OnClick(bookRow, "RightButton")
	local post
	for _, e in ipairs(W.lastMenu.entries) do
		if e.text == "Post a request for it" then post = e end
	end
	check(post ~= nil, "a recipe in a book can be requested")
	post.a()
	check(LinkedInnRequest:IsShown() and LinkedInnRequest.recipe == bookRow.data.id and not LinkedInnBook:IsShown(), "it opens the panel with that recipe picked")
	LinkedInnRequest:Hide()
	check(#W.errors == 0, "the Work tab runs without errors", W.errors[1])
end


local errorsBefore = #W.errors
Setup()
W.spellNames = { [18560] = "Mooncloth Bag", [3914] = "Brown Linen Pants" }
W.profs = { { name = "Tailoring", rank = 260, max = 300 }, { name = "Mining", rank = 100, max = 150 } }
Boot()
local Sync = LI.Sync
local enc = Sync.Encode({ tailoring = { rank = 260, max = 300, link = "trade:Player-1-ME:3908:197", recipes = { [3914] = true, [18560] = true } }, ["first aid"] = { rank = 75, max = 150 } })
local dec = Sync.Decode(enc)
check(dec and #dec == 2 and dec[1].key == "first aid" and dec[1].ids == nil and dec[2].key == "tailoring" and dec[2].ids[1] == 3914 and dec[2].ids[2] == 18560 and dec[2].link == "trade:Player-1-ME:3908:197" and dec[2].rank == 260, "a profession list survives encoding", enc)
check(Sync.Decode("tailoring~1~1~~zz.-1") == nil and Sync.Decode("tai|loring~1~1~~1") == nil and Sync.Decode("mining~1~1~~1") == nil, "broken or gathering lists are rejected")
check(W.prefix == "LinkedInn", "the addon message prefix is registered")
check(LI.crafters[LI.playerKey].profs.tailoring.rank == 260 and not LI.crafters[LI.playerKey].profs.mining, "your crafting professions are read at login, gathering ones skipped")
Advance(3)
check(Sync.IsJoined() and W.hidden == 10, "it joins the hidden channel within seconds and keeps it out of every chat window", W.hidden)
local hellos = Sent("H1", "CHANNEL")
check(#hellos == 1 and hellos[1].target == "5" and hellos[1].msg:find("|J$"), "a hello goes to the hidden channel right after joining, asking others to say hi", #hellos)
Advance(17)
check(#Sent("H1", "CHANNEL") == 2 and Sent("H1", "CHANNEL")[2].msg:find("|J$"), "a second one follows for anyone who missed the first", #Sent("H1", "CHANNEL"))
Advance(5)
local hello = hellos[1] and hellos[1].msg or ""
check(hello:find("tailoring~", 1, true) and not hello:find("mining", 1, true) and hello:find("|MAGE|", 1, true), "the hello lists crafting professions and class", hello)
Addon(hello, "Brew Master-TestRealm")
check(LI.test.sync.echo == true, "hearing your own hello proves the channel works")
local beforeRepeat = #Sent("H1")
Advance(13 * 60 + 200)
check(#Sent("H1") == beforeRepeat + 1, "hellos repeat every 12 to 15 minutes", #Sent("H1"))

W.trade = { linked = false, prof = TAILORING, recipes = TAILOR_RECIPES }
Fire("TRADE_SKILL_SHOW")
Advance(1)
C_TradeSkillUI.CloseTradeSkill()
local beforeLearn = #Sent("H1")
Advance(12)
check(#Sent("H1") == beforeLearn + 1, "learning recipes sends a hello soon", #Sent("H1"))
local newHello = Sent("H1")[#Sent("H1")].msg
check(newHello:find("tailoring~78~8c~2", 1, true), "the new hello counts your recipes", newHello)
local ver = newHello:match("^H1|([^|]+)|")

Addon("Q1|" .. ver, "Other Person-TestRealm", "WHISPER")
Addon("Q1|" .. ver, "Third Guy-TestRealm", "WHISPER")
check(#Sent("D1") == 0, "answers wait a moment to gather requests")
Advance(3)
local data, toThird = {}, false
for _, m in ipairs(W.sent) do
	if m.msg:find("^D1|") and m.chatType == "WHISPER" then
		if m.target == "Other Person" then data[#data + 1] = m end
		if m.target == "Third Guy" then toThird = true end
	end
end
check(#data >= 1 and toThird and #Sent("D1", "CHANNEL") == 0 and LI.test.sync.answered == 1, "two requests within a second are answered together, by whisper, within seconds", #data)
local chunks = {}
for _, m in ipairs(data) do chunks[#chunks + 1] = m.msg end
Addon("Q1|" .. ver, "Fourth Gal-TestRealm", "WHISPER")
Advance(8)
check(LI.test.sync.answered == 2, "a later request is answered seconds later, not a minute", LI.test.sync.answered)
for _, name in ipairs({ "Ask One", "Ask Two", "Ask Three" }) do
	Addon("Q1|" .. ver, name .. "-TestRealm", "WHISPER")
end
Advance(10)
check(LI.test.sync.answered == 3 and #Sent("D1", "CHANNEL") >= 1, "three or more at once get one broadcast on the channel instead", #Sent("D1", "CHANNEL"))

local sentBefore = #W.sent
W.combat = true
Addon("Q1|" .. ver, "Fifth One-TestRealm", "WHISPER")
Advance(90)
local inCombat = #W.sent
W.combat = false
Advance(5)
check(inCombat == sentBefore and #W.sent > inCombat, "nothing is sent in combat, it waits", inCombat - sentBefore)

Setup()
W.name, W.surname = "Other", "Person"
W.spellNames = { [18560] = "Mooncloth Bag", [3914] = "Brown Linen Pants" }
W.items = { [14155] = 1, [4343] = 4 }
W.recipeItems = { [18560] = 14155, [3914] = 4343 }
W.trade = nil
Boot()
Advance(50)
W.sent = {}
Addon(newHello, "Brew Master-TestRealm")
local brew = LI.crafters["Brew Master-TestRealm"]
check(brew and brew.profs.tailoring and brew.profs.tailoring.rank == 260 and brew.profs.tailoring.recipes == nil, "a hello adds the crafter with their skill right away")
check(LI.Status("Brew Master-TestRealm") == "online", "a hello marks them online")
check(LI.test.sync.heard == 1, "the test counts Linked Inn users")
Advance(2)
local asks = Sent("Q1", "WHISPER")
check(#asks == 1 and asks[1].target == "Brew Master" and asks[1].msg == "Q1|" .. ver, "it asks for the full list by whisper, without the realm", asks[1] and asks[1].target)
Addon(newHello, "Brew Master-TestRealm")
Advance(2)
check(#Sent("Q1") == 1, "it doesn't ask twice")
for i = 1, 5 do
	LI.Sync.Send("W1|filler" .. i, "WHISPER", "Some One")
end
W.combat = true
LI.Sync.Send("W1|first", "WHISPER", "Some One")
LI.Sync.Ping("Ping Target")
local kinds = LI.Sync.QueuedKinds()
check(kinds[1] == "ping" and kinds[#kinds] == "work", "requests and hellos jump ahead of bulk messages", table.concat(kinds, ","))
W.combat = false
Advance(10)
for i = #chunks, 1, -1 do
	Addon(chunks[i], "Brew Master-TestRealm")
end
brew = LI.crafters["Brew Master-TestRealm"]
local tail = brew.profs.tailoring
check(tail.recipes and tail.recipes[18560] and tail.recipes[3914] and tail.via == "shared" and tail.count == 2, "the shared list arrives even with chunks out of order")
check(tail.link ~= nil, "the shared profession can be opened")
check(LI.db.recipes[18560].n == "Mooncloth Bag" and LI.db.recipes[18560].k == "bag", "unknown recipes get their names and types locally", LI.db.recipes[18560].n)
local found = LI.Search("mooncloth")
check(#found == 1 and found[1].key == "Brew Master-TestRealm" and found[1].makes == 1, "shared recipes are searchable")
check(LI.test.sync.lists == 1, "the test counts lists received")
local onlyIds = true
for _, c in pairs(LI.crafters) do
	for _, prof in pairs(c.profs) do
		for id, v in pairs(prof.recipes or {}) do
			if type(id) ~= "number" or v ~= true then onlyIds = false end
		end
	end
end
check(onlyIds and type(LI.db.recipes[18560]) == "table", "crafters store only recipe ids; names and icons live once in a shared dictionary")
Addon(newHello, "Brew Master-TestRealm")
Advance(130)
check(#Sent("Q1") == 1, "a hello with a version you have asks nothing")
for i = #chunks, 1, -1 do
	Addon(chunks[i], "Brew Master-TestRealm")
end
check(LI.test.sync.lists == 1, "a list you already have is not applied again", LI.test.sync.lists)
brew.profs.tailoring.recipes = nil
Addon(newHello, "Brew Master-TestRealm")
Advance(2)
check(#Sent("Q1") == 2, "a hello asks again when recipes it names are missing, even at the same version", #Sent("Q1"))
for i = #chunks, 1, -1 do
	Addon(chunks[i], "Brew Master-TestRealm")
end
check(brew.profs.tailoring.recipes and brew.profs.tailoring.recipes[18560], "and the list comes back")
local tiny = "tailoring~1~1~~" .. string.rep("1.", 13) .. "1"
check(#tiny == 42 and Sync.Decode(tiny) ~= nil, "test list is valid", #tiny)
for i = 1, 42 do
	Addon(string.format("D1|abc|%s|%s|%s", Sync.B36(i), Sync.B36(42), tiny:sub(i, i)), "Chunky Monk-TestRealm")
end
check(not (LI.crafters["Chunky Monk-TestRealm"] and LI.crafters["Chunky Monk-TestRealm"].profs.tailoring), "lists split into too many pieces are refused")
local long = "tailoring~1~1~~" .. string.rep("1.", 105) .. "1"
check(#long > 200 and #long < 240 and Sync.Decode(long) ~= nil, "long test list is valid", #long)
Addon("D1|abc|1|1|" .. long, "Long John-TestRealm")
check(not (LI.crafters["Long John-TestRealm"] and LI.crafters["Long John-TestRealm"].profs.tailoring), "oversized pieces are refused")

Addon("H1|zzzz|ROGUE|tailoring~5~a~-;mining~1~1~-", "Mallory Bad-TestRealm")
check(LI.crafters["Mallory Bad-TestRealm"].profs.mining == nil, "gathering skills in a hello are ignored")
Addon("D1|zzzz|1|1|tailoring~~~~zz.-5", "Mallory Bad-TestRealm")
check(LI.crafters["Mallory Bad-TestRealm"].profs.tailoring.recipes == nil, "a broken list is ignored")
Addon("D1|zzzz|1|zz|abc", "Mallory Bad-TestRealm")
Addon("D1|zzzz|1|1|" .. string.rep("a", 230), "Mallory Bad-TestRealm")
check(LI.crafters["Brew Master-TestRealm"].profs.tailoring.via == "shared", "nobody can change someone else's list")
for i = 1, 80 do
	Addon(string.format("H1|%s|ROGUE|tailoring~%s~a~-", Sync.B36(1000 + i), Sync.B36(i)), "Flood Er-TestRealm")
end
check(LI.crafters["Flood Er-TestRealm"].profs.tailoring.rank == 60, "a flood of messages is cut off", LI.crafters["Flood Er-TestRealm"].profs.tailoring.rank)
Advance(61)
Addon("H1|zzzz|ROGUE|tailoring~1z~a~-", "Flood Er-TestRealm")
check(LI.crafters["Flood Er-TestRealm"].profs.tailoring.rank == 71, "the cut-off lifts after a minute")

LI.UI.Open(LI.UI.TAB.test)
local sv = LinkedInnFrame.testPage.syncValues
check(sv[1].__text == "joined, waiting for an echo" and sv[3].__text == "3" and sv[4].__text == "2", "the test tab shows sharing", sv[1].__text .. " / " .. sv[3].__text)
check(#W.errors == errorsBefore, "sharing runs without errors", W.errors[errorsBefore + 1])

do
	Setup()
	W.profs = { { name = "Tailoring", rank = 260, max = 300 } }
	Boot()
	Advance(50)
	W.sent = {}
	local function SentOn(kind)
		local routes = {}
		for _, m in ipairs(W.sent) do
			if m.msg:sub(1, #kind) == kind then routes[#routes + 1] = m.chatType .. (m.target and ("@" .. m.target) or "") end
		end
		table.sort(routes)
		return table.concat(routes, ",")
	end
	Addon("H1|abc|ROGUE|tailoring~5~a~-", "New Friend-TestRealm")
	Advance(8)
	check(SentOn("H1") == "CHANNEL@5", "hearing a new Linked Inn user answers with your hello right away", SentOn("H1"))
	local logged = false
	for _, e in ipairs(LI.db.log) do
		if e.m:find("Heard New Friend", 1, true) then logged = true end
	end
	check(logged, "a new user is logged")
	Addon("H1|abc|ROGUE|tailoring~5~a~-", "New Friend-TestRealm")
	Addon("H1|abd|MAGE|tailoring~5~a~-", "Second Friend-TestRealm")
	Advance(8)
	check(SentOn("H1") == "CHANNEL@5", "but only once, and not more than every 20 seconds", SentOn("H1"))
	W.sent = {}
	Advance(15)
	W.groupSize = 1
	W.units = { party1 = { name = "Pal", surname = "Friend", guid = "Player-1-PAL" } }
	Fire("GROUP_ROSTER_UPDATE")
	Advance(8)
	check(SentOn("H1") == "CHANNEL@5,PARTY", "grouping with someone sends your hello on the channel and to the party", SentOn("H1"))
	W.sent = {}
	Addon("P1|123", "Ping Guy-TestRealm", "PARTY")
	Addon("P1|124", "Ping Gal-TestRealm", "WHISPER")
	Advance(4)
	check(SentOn("P2") == "PARTY,WHISPER@Ping Gal", "a ping is answered the way it came", SentOn("P2"))
	local lines = #W.chat
	Addon("P2|" .. math.floor(W.clock * 10), "Ping Guy-TestRealm", "CHANNEL")
	check(#W.chat == lines, "someone else's pong isn't printed when you didn't ping", W.chat[#W.chat])
	LI.Sync.Ping()
	Addon("P2|" .. math.floor(W.clock * 10), "Ping Guy-TestRealm", "PARTY")
	check(W.chat[#W.chat]:find("Pong from Ping Guy via PARTY", 1, true), "a pong is printed with its route", W.chat[#W.chat])
	W.sent = {}
	SlashCmdList.LINKEDINN("ping")
	Advance(4)
	check(SentOn("P1") == "CHANNEL@5,PARTY", "/li ping asks on every route", SentOn("P1"))
	W.sent = {}
	SlashCmdList.LINKEDINN("ping Pal Friend")
	Advance(3)
	check(SentOn("P1") == "WHISPER@Pal Friend", "/li ping Name whispers that person", SentOn("P1"))
	W.sendResult = 3
	W.sent = {}
	SlashCmdList.LINKEDINN("ping")
	Advance(4)
	check(LI.test.sync.throttled == 1 and (LI.test.sync.failed or 0) == 0 and SentOn("P1") == "CHANNEL@5,CHANNEL@5,PARTY", "a send the game throttles is tried again a moment later, not lost", SentOn("P1"))
	W.sendResult = 9
	SlashCmdList.LINKEDINN("ping")
	Advance(4)
	check(LI.test.sync.failed == 1 and LI.test.sync.lastError == "code 9 on CHANNEL", "a send the game refuses is counted with its code", LI.test.sync.lastError)
	local chat0 = #W.chat
	SlashCmdList.LINKEDINN("status")
	local report = table.concat({ table.unpack(W.chat, chat0 + 1) }, "\n")
	check(report:find("Channel: joined", 1, true) and report:find("Sent:", 1, true) and report:find("PARTY", 1, true) and report:find("failed 1", 1, true) and report:find("New Friend", 1, true), "/li status prints a full report", report)
	W.groupSize = nil
	W.units = nil

	W.friends = { { name = "Buddy Pal", connected = true }, { name = "Away Guy", connected = false }, { name = "Brew Master", connected = true } }
	W.sent = {}
	Advance(15 * 60)
	check(SentOn("H1"):find("WHISPER@Buddy Pal", 1, true) and not SentOn("H1"):find("Away Guy", 1, true), "your hello is also whispered to online friends", SentOn("H1"))
	W.trade = { linked = false, prof = TAILORING, recipes = TAILOR_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(1)
	C_TradeSkillUI.CloseTradeSkill()
	Advance(20)
	W.sent = {}
	Addon("Q1|" .. LI.Sync.Version(), "Buddy Pal-TestRealm", "WHISPER")
	Advance(70)
	local whispered = SentOn("D1")
	check(whispered:find("WHISPER@Buddy Pal", 1, true) and not whispered:find("CHANNEL@5", 1, true), "someone who asks gets your list by whisper, without filling the channel", whispered)
	W.friends = nil
end

do
	Setup()
	W.profs = { { name = "Tailoring", rank = 260, max = 300 } }
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(50)
	local Sync = LI.Sync
	local function Find(prefix, chatType, target)
		for _, m in ipairs(W.sent) do
			if m.msg:sub(1, #prefix) == prefix and m.chatType == chatType and (not target or m.target == target) then
				return m
			end
		end
	end
	local function CountOf(prefix, chatType)
		local n = 0
		for _, m in ipairs(W.sent) do
			if m.msg:sub(1, #prefix) == prefix and m.chatType == chatType then
				n = n + 1
			end
		end
		return n
	end
	check(LI.FullName("Far Away-OtherRealm") == "Far Away-TestRealm" and LI.realmOf["Far Away-TestRealm"] == "OtherRealm", "a name from another backend realm is kept as one person", LI.FullName("Far Away"))
	check(LI.WhisperTarget("Far Away-TestRealm") == "Far Away", "and is whispered by name and surname alone", LI.WhisperTarget("Far Away-TestRealm"))
	check((Sync.Hello() or ""):find("|TestRealm|1$"), "your hello says your realm and server", Sync.Hello())
	W.sent = {}
	Addon("H1|abc|ROGUE|tailoring~5~a~-|OtherRealm|2", "Far Away-OtherRealm", "WHISPER")
	Advance(6)
	check(LI.crafters["Far Away-TestRealm"] and not LI.crafters["Far Away-OtherRealm"], "a user on another realm is listed once")
	check(Find("H1", "WHISPER", "Far Away"), "a whispered hello from another realm is answered by whisper")
	check(Sync.Links().OtherRealm == "Far Away-TestRealm", "and links you to that realm")
	Advance(6)
	check((Sync.Hello() or ""):find("|OtherRealm$"), "your hello then says which realms you link to", Sync.Hello())
	W.sent = {}
	Addon("H1|abd|MAGE|tailoring~5~a~-|TestRealm|1", "Near By-TestRealm", "CHANNEL")
	Advance(6)
	Sync.Send("X1|abc", "CHANNEL")
	Advance(8)
	check(not Find("B1|", "WHISPER"), "nothing is passed to the other realm by addon whisper, which never arrives there; the Battle.net bridge does that")
	Addon("H1|abf|MAGE|tailoring~5~a~-|TestRealm|1|OtherRealm", "Aaa Bridge-TestRealm", "CHANNEL")
	Advance(6)
	W.sent = {}
	Sync.Send("X1|zz", "CHANNEL")
	Advance(8)
	local chat0 = #W.chat
	SlashCmdList.LINKEDINN("status")
	local report = table.concat({ table.unpack(W.chat, chat0 + 1) }, "\n")
	check(report:find("Realm: TestRealm", 1, true) and report:find("OtherRealm via Far Away", 1, true) and report:find("Aaa Bridge relays", 1, true) and report:find("Far Away on OtherRealm (", 1, true), "/li status shows realms and who relays", report)
	Advance(120)
	W.sent = {}
	Addon("B1|Third Guy-OtherRealm|H1|abe|PRIEST|alchemy~5~a~-|OtherRealm|2", "Far Away-OtherRealm", "WHISPER")
	Advance(6)
	check(LI.crafters["Third Guy-TestRealm"], "a relayed hello lists that user")
	check(Find("B1|Third Guy-OtherRealm|H1|abe", "CHANNEL"), "and is passed on to everyone on your realm")
	check(Find("Q1|abe", "WHISPER", "Third Guy"), "their list is asked from them directly")
	Addon("B1|Third Guy-OtherRealm|H1|abe|PRIEST|alchemy~5~a~-|OtherRealm|2", "Far Away-OtherRealm", "WHISPER")
	Advance(4)
	check(CountOf("B1|Third Guy", "CHANNEL") == 1, "a relay that comes twice is passed on once", CountOf("B1|Third Guy", "CHANNEL"))
	Addon("B1|Brew Master-TestRealm|H1|zzz|PRIEST|alchemy~5~a~-|TestRealm|1", "Far Away-OtherRealm", "WHISPER")
	check(not LI.crafters[LI.playerKey].profs.alchemy, "a relay claiming to be you is ignored")
	W.sent = {}
	W.units = { nameplate1 = { name = "Stranger", surname = "Danger", guid = "Player-3-XYZ" }, nameplate2 = { name = "Other", surname = "One", guid = "Player-3-QQQ" }, nameplate3 = { name = "Local", surname = "Guy", guid = "Player-1-LLL" }, nameplate4 = { name = "Linked", surname = "Realm", guid = "Player-2-KKK" } }
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate3")
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate1")
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate2")
	Advance(4)
	check(not Find("H1", "WHISPER", "Stranger Danger") and not Find("H1", "WHISPER", "Other One") and not Find("H1", "WHISPER", "Local Guy"), "players seen from the other realm get no quiet whispers; those never arrive")
	Advance(50)
	W.sent = {}
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate4")
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate1")
	Advance(4)
	check(not Find("H1", "WHISPER", "Linked Realm") and not Find("H1", "WHISPER", "Stranger Danger"), "not for a realm you already link to, nor twice a day")
	W.units = nil
	Sync.Ping("Far Away")
	Advance(3)
	local gone = "No player named 'Far Away' is currently playing."
	check(Sync.HideNotFound(nil, "CHAT_MSG_SYSTEM", gone), "the game's 'no player named' line is hidden for our own quiet whispers")
	Fire("CHAT_MSG_SYSTEM", gone)
	check(Sync.HideNotFound(nil, "CHAT_MSG_SYSTEM", gone), "it stays hidden in every chat window, whichever sees it first")
	check(Sync.Links().OtherRealm == "Third Guy-TestRealm", "a link that can't be whispered is dropped for another one", Sync.Links().OtherRealm)
	check(not Sync.HideNotFound(nil, "CHAT_MSG_SYSTEM", "No player named 'Someone Else' is currently playing."), "other 'no player named' lines are left alone")
	W.playerGUID = nil
end

do
	Setup()
	Boot()
	Advance(5)
	local function Make(key, rank, seenAgo)
		local c = LI.Crafter(key, true)
		c.profs.tailoring = { name = "Tailoring", rank = rank, max = 300, count = 10, recipes = { [3914] = true } }
		c.seen = time() - seenAgo
	end
	Make("High Skill-TestRealm", 290, 40 * 60)
	Make("Low Skill-TestRealm", 150, 50 * 60)
	local function Order()
		local names = {}
		for _, group in ipairs(LI.Group(LI.Search("", {}))) do
			for _, row in ipairs(group.rows) do
				names[#names + 1] = row.entry.key:match("^(%S+)")
			end
		end
		return table.concat(names, ",")
	end
	check(Order() == "High,Low", "unconfirmed crafters sort by skill", Order())
	LI.MarkOffline("High Skill-TestRealm")
	check(Order() == "Low,High", "someone confirmed offline drops below crafters who may still be on", Order())
	LI.NoteHeard("Low Skill-TestRealm")
	Advance(2)
	LI.MarkOffline("Low Skill-TestRealm")
	check(LI.Status("Low Skill-TestRealm") == "offline", "a newer offline result beats having heard them earlier", LI.Status("Low Skill-TestRealm"))
	Advance(2)
	LI.NoteHeard("Low Skill-TestRealm")
	check(LI.Status("Low Skill-TestRealm") == "online", "and hearing them again brings them back online", LI.Status("Low Skill-TestRealm"))
end

do
	Setup()
	Boot()
	Advance(5)
	local c = LI.Crafter("Unread One-TestRealm", true)
	c.profs.enchanting = { name = "Enchanting", rank = 100 }
	LI.Fire("CraftersChanged")
	LI.UI.Open(LI.UI.TAB.find)
	local main = LinkedInnFrame
	check(main.emptyHead.__text == "The inn is quiet" and main.emptyText.__text:find("1 crafter is waiting to be read", 1, true), "with only unread crafters, the list says they're being read, not that a filter hides them", main.emptyHead.__text)
	check(main.count.__text:find("0 crafters remembered", 1, true), "unread crafters aren't counted", main.count.__text)
	local ench = 0
	for _, chip in ipairs(LI.ProfessionChips()) do
		if chip.key == "enchanting" then ench = chip.count end
	end
	check(ench == 0, "nor counted on the profession buttons", ench)
	main:Hide()
	W.guids["Player-1-MPL"] = { class = "MAGE", name = "Miss Play", realm = "" }
	W.linkData["trade:Player-1-MPL:3908:197"] = { linkedName = "Miss Play", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-MPL", 3908, 197, "Tailoring"), "Miss Play-TestRealm", "Player-1-MPL", "Trade - City")
	for i = 1, 40 do
		LI.Reader.Want("Crafter" .. i .. "-TestRealm", "Tailoring", "trade:Player-9-C" .. i .. ":3908:197", { built = true })
	end
	local mark = #W.hyperlinks
	W.autoWorks = true
	for _ = 1, 50 do
		Advance(0.5)
		if #W.hyperlinks > mark then break end
	end
	Advance(3)
	W.autoWorks = false
	check(W.hyperlinks[mark + 1] == "trade:Player-1-MPL:3908:197", "a profession linked in chat is read before a flood of crafting-log guesses", W.hyperlinks[mark + 1])
	check(LI.Search("miss")[1] and LI.Search("miss")[1].key == "Miss Play-TestRealm", "and shows up in the list right away")
	LI.db.settings.profs = { enchanting = true }
	Logout()
	Boot(SaveVars())
	check(next(LI.settings.profs) == nil, "a profession filter doesn't stick around after a reload")
	Advance(5)
	LI.db.profLinks.leatherworking = { spell = 2108, line = 165 }
	local LW = { professionName = "Leatherworking", professionID = 165, skillLevel = 60, maxSkillLevel = 75 }
	W.guids["Player-1-LWG"] = { class = "DRUID", name = "Leather Guy", realm = "" }
	W.linkData["trade:Player-1-LWG:2108:165"] = { linkedName = "Leather Guy", prof = LW, recipes = { { id = 2149, name = "Handstitched Leather Boots", item = 2302 } } }
	Fire("CHAT_MSG_TRADESKILLS", "Leather Guy creates Medium Leather.", "", "", "", "", "", 0, 0, "", 0, 1, "")
	check(LI.waiting["Leather Guy-TestRealm"] and LI.waiting["Leather Guy-TestRealm"].profs.any, "someone crafting an item no read book has yet still waits to be checked")
	W.autoWorks = true
	Say("CHAT_MSG_SAY", "hi", "Leather Guy-TestRealm", "Player-1-LWG")
	for _ = 1, 40 do
		Advance(0.5)
		if LI.crafters["Leather Guy-TestRealm"] then break end
	end
	Advance(3)
	local lw = LI.crafters["Leather Guy-TestRealm"]
	check(lw and lw.profs.leatherworking and lw.profs.leatherworking.recipes, "once their id turns up, every profession is tried, so the first leatherworker is found too")
	W.autoWorks = false
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	W.guids["Player-2-OTH"] = { class = "MAGE", name = "Other Realm", realm = "" }
	W.linkData["trade:Player-2-OTH:3908:197"] = { linkedName = "Other Realm", prof = TAILORING, recipes = TAILOR_RECIPES }
	W.autoWorks = true
	local mark = #W.hyperlinks
	Say("CHAT_MSG_PARTY", TradeLink("Player-2-OTH", 3908, 197, "Tailoring"), "Other Realm-TestRealm", "Player-2-OTH")
	Advance(5)
	check(#W.hyperlinks == mark and LI.db.log[#LI.db.log].m:find("on the other realm", 1, true), "someone on the other hidden realm isn't read, and the log says why", LI.db.log[#LI.db.log].m)
	Say("CHAT_MSG_PARTY", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA")
	Advance(5)
	check(W.hyperlinks[#W.hyperlinks] == "trade:Player-1-AAA:3908:197" and LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes, "someone on your realm is read right away")
	W.units = { nameplate1 = { name = "Other", surname = "Plate", guid = "Player-2-OPL" } }
	local queued = LI.DiscoverQueue()
	Fire("NAME_PLATE_UNIT_ADDED", "nameplate1")
	check(LI.DiscoverQueue() == queued, "nor is anyone from the other realm lined up from nameplates")
	W.units = nil
	W.autoWorks = false
	W.playerGUID = nil
end

do
	Setup()
	Boot()
	Advance(5)
	local sounds = 0
	local blizz = CreateFrame("Frame")
	blizz:RegisterEvent("TRADE_SKILL_SHOW")
	blizz:SetScript("OnEvent", function() sounds = sounds + 1 end)
	W.autoWorks = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-CCC", 2259, 171, "Alchemy"), "Cora Vale-TestRealm", "Player-1-CCC", "Trade - City")
	Advance(15)
	W.autoWorks = false
	check(LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes and LI.crafters["Cora Vale-TestRealm"].profs.alchemy.recipes, "reads still work")
	check(sounds == 0, "and Blizzard's profession window never opens for them, so it makes no sound", sounds)
	Fire("TRADE_SKILL_SHOW")
	check(sounds == 1, "opening a profession yourself still opens the window", sounds)
	check(not LI.Reader.QuietState(), "quiet reading stays on while it works")
	blizz:UnregisterEvent("TRADE_SKILL_SHOW")
end


do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	ProfessionsFrame:RegisterEvent("TRADE_SKILL_SHOW")
	ProfessionsFrame:SetScript("OnEvent", function(self) self:Show() end)
	local showUI = ShowUIPanel
	ShowUIPanel = function(f) f:Show() end
	W.autoWorks = true
	W.replyDelay = 1
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Advance(0.6)
	local listens = false
	for _, f in ipairs({ GetFramesRegisteredForEvent("TRADE_SKILL_SHOW") }) do
		if f == ProfessionsFrame then listens = true end
	end
	local closed = W.closed
	W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(0.1)
	check(ProfessionsFrame:IsShown() and ProfessionsFrame:GetScale() == 1 and ProfessionsFrame:GetAlpha() == 1 and ProfessionsFrame:IsMouseEnabled(), "opening your own profession during a background read shows the window")
	check(not listens, "the window was muted while the read ran")
	check(W.closed == closed, "and it is not closed again", W.closed - closed)
	local back = false
	for _, f in ipairs({ GetFramesRegisteredForEvent("TRADE_SKILL_SHOW") }) do
		if f == ProfessionsFrame then back = true end
	end
	check(back, "the profession window hears profession events again", listens)
	Advance(6)
	C_TradeSkillUI.CloseTradeSkill()
	Advance(5)
	check(LI.crafters["Anna Smith-TestRealm"] and LI.crafters["Anna Smith-TestRealm"].profs.tailoring and LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes, "the paused read finishes after you close it")
	W.autoWorks = false
	W.replyDelay = nil
	ShowUIPanel = showUI
	ProfessionsFrame:UnregisterEvent("TRADE_SKILL_SHOW")
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	ProfessionsFrame:RegisterEvent("TRADE_SKILL_SHOW")
	ProfessionsFrame:SetScript("OnEvent", function(self) self:Show() end)
	W.autoWorks = true
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = {} }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Advance(25)
	W.autoWorks = false
	local listens = false
	for _, f in ipairs({ GetFramesRegisteredForEvent("TRADE_SKILL_SHOW") }) do
		if f == ProfessionsFrame then listens = true end
	end
	check(listens, "a read that answers with no recipes never leaves the profession window deaf")
	check(LI.Reader.Idle(true), "and it doesn't stay stuck")
	ProfessionsFrame:UnregisterEvent("TRADE_SKILL_SHOW")
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	W.autoWorks = true
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Advance(6)
	W.autoWorks = false
	check(LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes, "a background read just finished")
	local closed = W.closed
	W.trade = { linked = true, linkedName = "Brew Master", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	ProfessionsFrame:Show()
	Advance(4)
	check(ProfessionsFrame:IsShown() and ProfessionsFrame:GetAlpha() == 1 and ProfessionsFrame:GetScale() == 1, "your own profession, shown as linked under your own name, isn't mistaken for a late reply")
	check(W.closed == closed, "and it is never closed for you", W.closed - closed)
	C_TradeSkillUI.CloseTradeSkill()
	Advance(1)
	W.trade = { linked = true, linkedName = "Cora Vale", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	ProfessionsFrame:Show()
	Advance(2)
	check(not ProfessionsFrame:IsShown(), "a late reply from someone else is still closed")
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	W.autoWorks = true
	for i, who in ipairs({ "AAA", "BBB", "CCC" }) do
		W.linkData["trade:Player-1-" .. who .. ":3908:197"] = { linkedName = W.guids["Player-1-" .. who].name, prof = TAILORING, recipes = TAILOR_RECIPES }
		Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-" .. who, 3908, 197, "Tailoring"), W.guids["Player-1-" .. who].name .. "-TestRealm", "Player-1-" .. who, "Trade - City")
	end
	for _ = 1, 40 do
		Advance(0.1)
		if LI.crafters["Cora Vale-TestRealm"].profs.tailoring.recipes then break end
	end
	Advance(0.1)
	local closed, asked = W.closed, #W.hyperlinks
	W.trade = { linked = true, linkedName = "Cora Vale", prof = TAILORING, recipes = TAILOR_RECIPES }
	ProfessionsFrame:Show()
	Advance(0.1)
	check(ProfessionsFrame:GetAlpha() == 1 and ProfessionsFrame:GetScale() == 1 and ProfessionsFrame:IsMouseEnabled(), "a profession window you open right after a background read is never hidden")
	Advance(8)
	check(ProfessionsFrame:IsShown() and W.closed == closed, "and it stays open", W.closed - closed)
	check(#W.hyperlinks <= asked + 1, "background reads wait while it's open", #W.hyperlinks - asked)
	ProfessionsFrame:Hide()
	local hidden = #W.hyperlinks
	Advance(1)
	check(#W.hyperlinks == hidden, "and for a moment after you close it")
	Advance(8)
	check(#W.hyperlinks > hidden, "then reading carries on", #W.hyperlinks - hidden)
	W.autoWorks = false
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	W.autoWorks = true
	W.replyDelay = 1
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	W.linkData["trade:Player-1-BBB:3908:197"] = { linkedName = "Bob Stone", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-BBB", 3908, 197, "Tailoring"), "Bob Stone-TestRealm", "Player-1-BBB", "Trade - City")
	for _ = 1, 40 do
		Advance(0.1)
		if #W.hyperlinks > 0 then break end
	end
	Advance(1.05)
	check(W.trade and W.trade.linked, "a hidden read has someone's profession open")
	local closed, asked = W.closed, #W.hyperlinks
	GetMouseFoci = function() return { WorldFrame } end
	Fire("GLOBAL_MOUSE_DOWN", "RightButton")
	check(W.closed == closed and W.trade and W.trade.linked, "turning the camera doesn't interrupt a read")
	GetMouseFoci = function() return { UIParent } end
	Fire("GLOBAL_MOUSE_DOWN", "LeftButton")
	GetMouseFoci = nil
	check(W.closed == closed + 1 and not W.trade, "pressing the mouse on the interface closes the hidden read before your click lands", W.closed - closed)
	W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	ProfessionsFrame:Show()
	Advance(4)
	check(ProfessionsFrame:IsShown() and W.trade and W.trade.linked == false and ProfessionsFrame:GetAlpha() == 1, "so your own profession opens and stays open")
	check(#W.hyperlinks == asked, "and nothing is read while it's open", #W.hyperlinks - asked)
	C_TradeSkillUI.CloseTradeSkill()
	Advance(12)
	check(LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes and LI.crafters["Bob Stone-TestRealm"].profs.tailoring.recipes, "the reads it stepped aside for happen afterwards")
	local before = #W.hyperlinks
	Fire("GLOBAL_MOUSE_DOWN", "LeftButton")
	check(#W.hyperlinks == before, "a click with nothing being read changes nothing")
	W.autoWorks = false
	W.replyDelay = nil
end


do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	W.autoWorks = true
	W.replyDelay = 1
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	for _ = 1, 40 do
		Advance(0.1)
		if #W.hyperlinks > 0 then break end
	end
	Advance(0.2)
	W.autoWorks = false
	Fire("GLOBAL_MOUSE_DOWN", "LeftButton")
	Advance(10)
	W.autoWorks = true
	W.replyDelay = nil
	Advance(10)
	check(LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes, "a background read cancelled by your click is tried again later")
	W.autoWorks = false
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	ProfessionsFrame:RegisterEvent("TRADE_SKILL_SHOW")
	ProfessionsFrame:SetScript("OnEvent", function(self) self:Show() end)
	W.autoWorks = true
	W.replyDelay = 1
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	for _ = 1, 40 do
		Advance(0.1)
		if #W.hyperlinks > 0 then break end
	end
	Advance(0.2)
	GetMouseFoci = function() return { UIParent } end
	Fire("GLOBAL_MOUSE_DOWN", "LeftButton")
	GetMouseFoci = nil
	local flashed = false
	for _ = 1, 30 do
		Advance(0.1)
		if ProfessionsFrame:IsShown() then flashed = true end
	end
	local muted = false
	for _, e in ipairs(LI.db.log) do
		if e.m:find("while the window was muted", 1, true) then muted = true end
	end
	check(not flashed and muted, "a reply that arrives after you clicked away never flashes the window", tostring(muted))
	check(not W.trade, "and it is closed unseen")
	check(not W.UIHears(), "the window stays muted for a few seconds after a read")
	ProfessionsFrame:Show()
	check(W.UIHears(), "your hotkey or the micro button unmutes it at once")
	ProfessionsFrame:Hide()
	Advance(20)
	W.autoWorks = false
	W.replyDelay = nil
	W.linkData["trade:Player-1-BBB:3908:197"] = { linkedName = "Bob Stone", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-BBB", 3908, 197, "Tailoring"), "Bob Stone-TestRealm", "Player-1-BBB", "Trade - City")
	for _ = 1, 40 do
		Advance(0.1)
		if not W.UIHears() then break end
	end
	Advance(3)
	check(not W.UIHears(), "a read that got no answer keeps the window muted for late replies")
	SetItemRef("trade:Player-1-CCC:2259:171", "[Alchemy]", "LeftButton")
	check(W.UIHears(), "clicking a profession link unmutes it at once")
	Advance(20)
	check(W.UIHears(), "and with nothing being read it stays unmuted")
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	local stackNow = ""
	debugstack = function() return stackNow end
	ProfessionsFrame:RegisterEvent("TRADE_SKILL_SHOW")
	ProfessionsFrame:SetScript("OnEvent", function(self)
		stackNow = "[Blizzard_Game/Mainline/EventImplementation.lua]:476: in function 'HandleTradeSkillShow'"
		self:Show()
		stackNow = ""
	end)
	local drawn = {}
	ProfessionsFrame:HookScript("OnShow", function(self)
		LI.After(0, function()
			if self:IsShown() then
				drawn[#drawn + 1] = self:GetAlpha() > 0.05 and self:GetScale() > 0.05
			end
		end)
	end)
	W.autoWorks = true
	W.replyDelay = 12
	W.linkData["trade:Player-1-SLW:2259:171"] = { linkedName = "Slow Poke", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	LI.Reader.Want("Slow Poke-TestRealm", "Alchemy", "trade:Player-1-SLW:2259:171", { built = true })
	for _ = 1, 150 do
		Advance(0.1)
	end
	local seen = false
	for _, d in ipairs(drawn) do
		if d then seen = true end
	end
	check(#drawn > 0 and not seen, "a reply that comes after the window is unmuted again is hidden before it's ever drawn", #drawn)
	check(not ProfessionsFrame:IsShown() and not W.trade, "and closed again")
	check(ProfessionsFrame:GetAlpha() == 1 and ProfessionsFrame:GetScale() == 1, "with the window restored for next time")
	W.autoWorks, W.replyDelay = false, nil
	W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(0.1)
	check(ProfessionsFrame:IsShown() and ProfessionsFrame:GetAlpha() == 1, "casting your own profession still shows it")
	C_TradeSkillUI.CloseTradeSkill()
	ProfessionsFrame:Hide()
	W.trade = { linked = true, linkedName = "Brew Master", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(0.1)
	check(ProfessionsFrame:IsShown() and ProfessionsFrame:GetAlpha() == 1, "so does your own profession shown under your name")
	C_TradeSkillUI.CloseTradeSkill()
	ProfessionsFrame:Hide()
	Advance(10)
	W.clickWorks = true
	W.linkData["trade:Player-1-CLK:2259:171"] = { linkedName = "Click Me", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	SetItemRef("trade:Player-1-CLK:2259:171", "[Alchemy]", "LeftButton")
	Advance(1)
	check(ProfessionsFrame:IsShown() and ProfessionsFrame:GetAlpha() == 1, "a profession link you click still opens for you")
	W.clickWorks = false
	C_TradeSkillUI.CloseTradeSkill()
	ProfessionsFrame:Hide()
	debugstack = nil
end

do
	Setup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	W.autoWorks = true
	W.replyDelay = 1
	W.linkData["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna Smith-TestRealm", "Player-1-AAA", "Trade - City")
	for _ = 1, 40 do
		Advance(0.1)
		if #W.hyperlinks > 0 then break end
	end
	Advance(1.05)
	local closed = W.closed
	ProfessionsFrame:Show()
	Advance(0.1)
	check(W.closed == closed + 1 and not ProfessionsFrame:IsShown(), "a window opened by a key onto someone else's hidden read is closed, not left showing their book")
	Advance(4)
	W.autoWorks = false
	W.replyDelay = nil
end


do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local function Make(key, rank, li)
		local c = LI.Crafter(key, true)
		c.profs.tailoring = { name = "Tailoring", rank = rank, max = 300, count = 3, recipes = { [3914] = true } }
		c.li = li
	end
	Make("Low Skill-TestRealm", 40)
	Make("Mid Skill-TestRealm", 160, true)
	Make("Top Skill-TestRealm", 298)
	local function Count(opts)
		return #LI.Search("", opts)
	end
	LI.db.profLinks.engineering = { spell = 4038, line = 202 }
	check(LI.BuildLink("Player-1-XYZ", "engineering") == "trade:Player-1-XYZ:4036:202", "reads always use the Apprentice rank, so lower-ranked crafters answer too", LI.BuildLink("Player-1-XYZ", "engineering"))
	check(Count({ minSkill = 150 }) == 2 and Count({ minSkill = 225 }) == 1 and Count({}) == 3, "the skill filter hides crafters below a level and keeps a 298 under Artisan+")
	LI.UI.Open(LI.UI.TAB.find)
	local main = LinkedInnFrame
	check(main.skillPill.text.__text == "Skill: Any" and main.gear and main.secondaryToggle, "the header has a skill pill, a secondary toggle and a gear", main.skillPill.text.__text)
	LI.settings.minSkill = 150
	LI.UI.Refresh()
	check(main.skillPill.text.__text == "Skill: Expert+" and main.count.__text:find("^2 shown"), "the pill names the chosen level and the list follows", main.skillPill.text.__text)
	LI.settings.minSkill = 0
	LI.UI.Refresh()
	local badge
	for _, r in ipairs(main.list.__rows) do
		if r.entry and r.entry.key == "Mid Skill-TestRealm" then badge = r.badge:IsShown() end
		if r.entry and r.entry.key == "Low Skill-TestRealm" and r.badge:IsShown() then badge = "wrong" end
	end
	check(badge == true, "crafters who use Linked Inn get a small badge, others don't", tostring(badge))
	check(main.liToggle and LI.settings.liOnly ~= true, "there is a Linked Inn users toggle, off by default")
	main.liToggle.__scripts.OnClick(main.liToggle)
	check(LI.settings.liOnly == true and main.count.__text:find("^1 shown"), "it shows only crafters who use Linked Inn", main.count.__text)
	check(#LI.Search("", { liOnly = true, minSkill = 225 }) == 0 and #LI.Search("", { liOnly = true }) == 1, "and works together with the other filters")
	main.liToggle.__scripts.OnClick(main.liToggle)
	check(LI.settings.liOnly == false and main.count.__text:find("^3 shown"), "clicking again shows everyone", main.count.__text)
	LI.settings.liOnly = true
	local saved = Logout()
	Boot(saved)
	check(LI.settings.liOnly == false, "it resets at login so nobody gets stuck with a short list")
	Advance(5)
	LI.UI.Open(LI.UI.TAB.find)
	main = LinkedInnFrame

	main.gear.__scripts.OnClick(main.gear)
	local panel = LinkedInnSettings
	check(panel and panel:IsShown() and panel.city:GetChecked() == true and panel.read:GetChecked() == true and panel.minimap:GetChecked() == true, "the gear opens settings showing the current choices")
	check(panel.count.__text:find("3 crafters remembered", 1, true), "settings show how many crafters are remembered", panel.count.__text)
	check(panel.scroll and panel.page:GetParent() == panel.scroll and panel.last == panel.minimap, "the settings page scrolls, so more options fit later")
	check(panel.hide and panel.hide:GetChecked() == false, "the hide links option starts off")
	panel.city:SetChecked(false)
	panel.city.__scripts.OnClick(panel.city)
	check(LI.settings.cityScan == false, "city scans are on by default and can be switched off")
	panel.city:SetChecked(true)
	panel.city.__scripts.OnClick(panel.city)
	W.resting = true
	W.cvars.nameplateShowFriendlyPlayers = "0"
	W.units = { nameplate1 = { name = "City", surname = "Walker", guid = "Player-1-CW1" } }
	W.plates = { "nameplate1" }
	local queued = LI.DiscoverQueue()
	Advance(30)
	check(LI.DiscoverQueue() > queued or LI.tried["City Walker-TestRealm"], "in a city, a scan notes the players around you", LI.DiscoverQueue())
	check(W.cvars.nameplateShowFriendlyPlayers == "0" and W.cvarLog[#W.cvarLog] == "nameplateShowFriendlyPlayers=0", "and puts nameplates back off right after")
	local scans = #W.cvarLog
	Advance(60)
	check(#W.cvarLog == scans, "not again before the chosen interval")
	W.resting = false
	Advance(400)
	check(#W.cvarLog == scans, "and not outside cities")
	W.units, W.plates = nil, nil
	LI.crafters["Low Skill-TestRealm"].seen = time() - 20 * 86400
	LI.settings.forgetDays = 14
	LI.PruneNow()
	check(not LI.crafters["Low Skill-TestRealm"] and LI.crafters["Top Skill-TestRealm"], "a shorter keep time forgets crafters not seen since")
	panel.wipe.__scripts.OnClick(panel.wipe)
	check(W.popup == "LINKEDINN_FORGET_ALL", "forget everyone asks first")
	StaticPopupDialogs.LINKEDINN_FORGET_ALL.OnAccept()
	local left = 0
	for key in pairs(LI.crafters) do
		if key ~= LI.playerKey then left = left + 1 end
	end
	check(left == 0, "and then clears the list", left)
	panel.minimap:SetChecked(false)
	panel.minimap.__scripts.OnClick(panel.minimap)
	check(LI.settings.showMinimap == false and not LinkedInnMinimapButton:IsShown(), "the minimap button can be hidden")
	main:Hide()
	W.playerGUID = nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local function Hidden(event, msg, sender)
		for _, fn in ipairs(W.chatFilters[event] or {}) do
			if fn(nil, event, msg, sender) then
				return true
			end
		end
		return false
	end
	local link = "WTS " .. TradeLink("Player-1-HID", 3908, 197, "Tailoring") .. " pst"
	check(W.chatFilters.CHAT_MSG_CHANNEL and W.chatFilters.CHAT_MSG_SAY and W.chatFilters.CHAT_MSG_YELL, "a chat filter is set up for public chat")
	check(LI.settings.hideLinks == false and not Hidden("CHAT_MSG_CHANNEL", link, "Spam Mer-TestRealm"), "profession links show in chat by default")
	LI.settings.hideLinks = true
	check(Hidden("CHAT_MSG_CHANNEL", link, "Spam Mer-TestRealm") and Hidden("CHAT_MSG_SAY", link, "Spam Mer-TestRealm") and Hidden("CHAT_MSG_YELL", link, "Spam Mer-TestRealm"), "with the setting on, lines with a profession link are hidden in trade, say and yell")
	check(not Hidden("CHAT_MSG_CHANNEL", "WTS [Linen Cloth] cheap", "Spam Mer-TestRealm") and not Hidden("CHAT_MSG_CHANNEL", "|Hitem:2589|h[Linen Cloth]|h", "Spam Mer-TestRealm"), "other lines and item links still show")
	check(not W.chatFilters.CHAT_MSG_WHISPER and not W.chatFilters.CHAT_MSG_GUILD and not W.chatFilters.CHAT_MSG_PARTY, "whispers, guild and group chat are never hidden")
	check(not Hidden("CHAT_MSG_CHANNEL", link, LI.playerKey), "your own links still show")
	check(not Hidden("CHAT_MSG_CHANNEL", { __secret = true }, { __secret = true }), "secret chat lines are left alone")
	local before, queued = LI.test.links, LI.Reader.QueueSize()
	Say("CHAT_MSG_CHANNEL", link, "Spam Mer-TestRealm", "Player-1-HID", "Trade - City")
	local c = LI.crafters["Spam Mer-TestRealm"]
	check(LI.test.links == before + 1 and c and c.profs.tailoring, "a hidden link is still captured", LI.test.links - before)
	check(LI.Reader.QueueSize() > queued or LI.Reader.Busy and LI.Reader.Busy(), "and still read", LI.Reader.QueueSize())
	LI.settings.hideLinks = false
	check(not Hidden("CHAT_MSG_CHANNEL", link, "Spam Mer-TestRealm"), "turning it off shows them again right away")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local PANTS = { { id = 3914, name = "Brown Linen Pants", item = 4343 } }
	local POTION = { { id = 2330, name = "Minor Healing Potion", item = 118 } }
	LI.SetRecipes("Low One-TestRealm", { name = "Tailoring", rank = 40, max = 75 }, PANTS, "auto")
	LI.SetRecipes("Two Profs-TestRealm", { name = "Tailoring", rank = 40, max = 75 }, PANTS, "auto")
	LI.SetRecipes("Two Profs-TestRealm", { name = "Alchemy", rank = 200, max = 225 }, POTION, "auto")
	LI.SetRecipes("Fav Low-TestRealm", { name = "Tailoring", rank = 30, max = 75 }, PANTS, "auto")
	LI.SetRecipes("Top One-TestRealm", { name = "Tailoring", rank = 298, max = 300 }, PANTS, "auto")
	LI.NoteProfession("Not Read-TestRealm", { name = "Alchemy", link = "trade:Player-1-NR:2259:171" })
	LI.favorites["Fav Low-TestRealm"] = true
	check(LI.settings.keepSkill == 0 and LI.crafters["Low One-TestRealm"], "everyone is kept by default")
	check(LI.CountBelow(150) == 2, "counting below a skill skips favorites, high crafters and unread ones", LI.CountBelow(150))

	LI.UI.Open(LI.UI.TAB.find)
	LinkedInnFrame.gear.__scripts.OnClick(LinkedInnFrame.gear)
	local panel = LinkedInnSettings
	check(panel.keep and panel.keepLabel.__text == "Don't keep skill below", "settings have a skill threshold")
	W.popup = nil
	StaticPopupDialogs.LINKEDINN_FORGET_BELOW.OnCancel()
	check(LI.settings.keepSkill == 0 and LI.crafters["Low One-TestRealm"], "saying no keeps everything")
	StaticPopupDialogs.LINKEDINN_FORGET_BELOW.OnAccept(nil, 150)
	check(LI.settings.keepSkill == 150, "saying yes saves the threshold")
	check(not LI.crafters["Low One-TestRealm"], "a crafter with only a low profession is forgotten")
	local two = LI.crafters["Two Profs-TestRealm"]
	check(two and two.profs.alchemy and not two.profs.tailoring, "someone with a high and a low profession keeps the high one")
	check(LI.crafters["Fav Low-TestRealm"] and LI.crafters["Top One-TestRealm"] and LI.crafters["Not Read-TestRealm"], "favorites, high crafters and unread ones stay")

	LI.SetRecipes("New Low-TestRealm", { name = "Tailoring", rank = 20, max = 75 }, PANTS, "auto")
	check(not LI.crafters["New Low-TestRealm"], "a new low read is skipped")
	LI.SetRecipes("New High-TestRealm", { name = "Tailoring", rank = 160, max = 225 }, PANTS, "auto")
	check(LI.crafters["New High-TestRealm"], "a new read at the threshold or above is kept")
	LI.SetRecipes(LI.playerKey, { name = "Tailoring", rank = 5, max = 75 }, PANTS, "own")
	check(LI.crafters[LI.playerKey] and LI.crafters[LI.playerKey].profs.tailoring, "your own low profession is never dropped")

	local queued = LI.Reader.QueueSize()
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-NL", 3908, 197, "Tailoring"), "New Low-TestRealm", "Player-1-NL", "Trade - City")
	check(LI.Reader.QueueSize() == queued and not LI.crafters["New Low-TestRealm"], "a skipped crafter linking again isn't read again for a while", LI.Reader.QueueSize() - queued)
	LI.settings.keepSkill = 0
	check(not LI.IsLow("New Low-TestRealm", "tailoring"), "lowering the threshold wants them again right away")
	LI.settings.keepSkill = 150
	LI.low["New Low-TestRealm|tailoring"].t = time() - 8 * 86400
	check(not LI.IsLow("New Low-TestRealm", "tailoring"), "after a week they get another chance, in case they leveled")
	LI.settings.keepSkill = 0
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	W.autoWorks, W.noFrame = true, true
	W.linkData = W.linkData or {}
	local empty = "trade:Player-1-PD:2259:171"
	W.linkData[empty] = { linkedName = "Papa Do", prof = ALCHEMY, recipes = {} }
	LI.Reader.Want("Papa Do-TestRealm", "Alchemy", empty, { built = true })
	Advance(5)
	check(W.trade == nil, "an empty reply to a silent read is closed, so it can't pop up later")
	W.noFrame = nil
	W.replyDelay = 4
	local late = "trade:Player-1-LT:2259:171"
	W.linkData[late] = { linkedName = "Late Guy", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	LI.Reader.Want("Late Guy-TestRealm", "Alchemy", late, { built = true })
	Advance(10)
	local logged = false
	for _, e in ipairs(LI.db.log) do
		if e.m:find("late reply", 1, true) then logged = true end
	end
	check(W.trade == nil and logged, "a reply that comes after the timeout is closed too", tostring(logged))
	W.autoWorks, W.replyDelay = false, nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	check(LI.db.triedRound == 4, "checks spoiled by the window bug are cleared once")
	LI.tried["Guild Mate-TestRealm"] = time() - 2 * 86400
	LI.tried["Passer By-TestRealm"] = time() - 2 * 86400
	check(LI.Discover("Guild Mate-TestRealm", "Player-1-GMATE", LI.PRIO.guild), "guild and group members are checked again after half a day")
	check(not LI.Discover("Passer By-TestRealm", "Player-1-PASSB", LI.PRIO.chat), "people you just walk past still wait a week")
	LI.tried["Fresh Mate-TestRealm"] = time() - 3600
	check(not LI.Discover("Fresh Mate-TestRealm", "Player-1-FMATE", LI.PRIO.group), "but not right after a check")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	for i = 1, 320 do
		LI.waiting["Crafter " .. i .. "-TestRealm"] = { profs = { alchemy = true }, at = time() - 1000 + i }
	end
	LI.waiting["Old Timer-TestRealm"] = { profs = { alchemy = true }, at = time() - 20 * 86400 }
	check(LI.WaitingCount() == 320, "people not seen again within two weeks leave the waiting list", LI.WaitingCount())
	LI.OnCrafted("New Person creates Minor Healing Potion.")
	check(LI.WaitingCount() <= 320 and not LI.waiting["Crafter 1-TestRealm"] and LI.waiting["New Person-TestRealm"], "a full waiting list drops the oldest for someone new", LI.WaitingCount())
	local saved = Logout()
	Boot(saved)
	Advance(1)
	check(LI.WaitingCount() == 300, "the waiting list is cut to 300 at login", LI.WaitingCount())
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.guild = { { name = "Guild Low-TestRealm", online = false } }
	Boot()
	Advance(5)
	Fire("GUILD_ROSTER_UPDATE")
	local old = time() - 20 * 86400
	local function Make(name, rank, recipes)
		local key = name .. "-TestRealm"
		local c = LI.Crafter(key, true)
		c.seen = old
		local set = { [3914] = true }
		for _, id in ipairs(recipes or {}) do
			set[id] = true
		end
		c.profs.tailoring = { name = "Tailoring", rank = rank, max = 300, count = 1, recipes = set }
		return c
	end
	for r = 11, 60 do
		Make("Tailor " .. r, r)
	end
	Make("Tailor 1", 1).profs.alchemy = { name = "Alchemy", rank = 200, recipes = { [2330] = true } }
	Make("Rare Pattern", 2, { 18560 })
	Make("Fav Low", 3)
	LI.favorites["Fav Low-TestRealm"] = true
	Make("Guild Low", 4)
	Make("Seen Today", 5).seen = time()
	for r = 6, 9 do
		Make("Shared " .. r, r, { 3915 })
	end
	Make("Tailor 10", 10)
	check(LI.settings.housekeeping == "off" and LI.Housekeep() == 0, "housekeeping is off by default and does nothing")
	check(LI.Housekeep("light", true) == 0 and LI.Housekeep("balanced", true) == 0, "light and balanced leave a profession with fewer than 100 or 75 crafters alone")
	local removed, crafters = LI.Housekeep("strict", true)
	check(removed == 5 and crafters == 5 and LI.crafters["Tailor 10-TestRealm"], "a preview counts without removing anything", removed)
	StaticPopupDialogs.LINKEDINN_HOUSEKEEPING.OnAccept(nil, "strict")
	check(LI.settings.housekeeping == "strict", "accepting saves the mode")
	check(not LI.crafters["Tailor 10-TestRealm"] and not LI.crafters["Shared 6-TestRealm"] and not LI.crafters["Seen Today-TestRealm"], "below the best 50, crafters who add nothing are put away right away on strict")
	check(LI.crafters["Tailor 1-TestRealm"] and LI.crafters["Tailor 1-TestRealm"].profs.alchemy and not LI.crafters["Tailor 1-TestRealm"].profs.tailoring, "only the weak profession goes; a good alchemist stays")
	check(LI.crafters["Rare Pattern-TestRealm"], "someone with a recipe few others know is kept")
	check(LI.crafters["Fav Low-TestRealm"] and LI.crafters["Guild Low-TestRealm"], "favorites and guildmates are kept")
	local holders = 0
	for r = 6, 9 do
		if LI.crafters["Shared " .. r .. "-TestRealm"] then holders = holders + 1 end
	end
	check(holders == 2, "a recipe never drops below a few people who know it", holders)
	check(LI.crafters["Tailor 11-TestRealm"] and LI.crafters["Tailor 60-TestRealm"], "the best 50 are always kept")
	check(LI.db.housekept and LI.db.housekept.removed == 5, "the last run is remembered for the settings panel")
	check(LI.Housekeep() == 0, "running again finds nothing more")
	for r = 61, 90 do
		Make("Tailor " .. r, r)
	end
	Make("Fresh Low", 1).seen = time() - 3600
	LI.Housekeep("balanced")
	check(LI.crafters["Fresh Low-TestRealm"], "balanced gives someone seen recently a short grace")
	Make("Badge Low", 1).li = true
	LI.Housekeep("strict")
	check(not LI.crafters["Fresh Low-TestRealm"], "strict doesn't wait")
	check(LI.crafters["Badge Low-TestRealm"], "Linked Inn users are always kept")
	LI.UI.Open(LI.UI.TAB.find)
	LinkedInnFrame.gear.__scripts.OnClick(LinkedInnFrame.gear)
	local panel = LinkedInnSettings
	check(#panel.segments == 4 and panel.segments[1].text.__text == "Off" and panel.segments[4].text.__text == "Strict", "housekeeping is four buttons: Off, Light, Balanced, Strict")
	check(panel.houseDesc.__text:find("^Strict: the best 50"), "the line under them describes the current mode", panel.houseDesc.__text)
	panel.segments[2].__scripts.OnEnter(panel.segments[2])
	check(panel.houseDesc.__text:find("^Light: the best 100"), "hovering a mode shows what it does before clicking", panel.houseDesc.__text)
	panel.segments[2].__scripts.OnLeave(panel.segments[2])
	check(panel.houseDesc.__text:find("^Strict"), "and moving away shows the current one again")
	panel.segments[1].__scripts.OnClick(panel.segments[1])
	check(LI.settings.housekeeping == "off", "clicking a lighter mode switches straight away")
	for r = 91, 140 do
		Make("Tailor " .. r, r)
	end
	W.popup = nil
	panel.segments[4].__scripts.OnClick(panel.segments[4])
	check(W.popup == "LINKEDINN_HOUSEKEEPING" and LI.settings.housekeeping == "off", "clicking a stricter mode asks first when it would put anyone away")
	LI.settings.housekeeping = "off"
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.guild = { { name = "Guild Pal-TestRealm", online = true, guid = "Player-1-GPAL" }, { name = "Far Mate-TestRealm", online = true, guid = "Player-2-FARM" } }
	Boot()
	Advance(5)
	Fire("GUILD_ROSTER_UPDATE")
	local PANTS = { { id = 3914, name = "Brown Linen Pants", item = 4343 } }
	LI.SetRecipes("Guild Pal-TestRealm", { name = "Tailoring", rank = 200, max = 225 }, PANTS, "auto")
	LI.SetRecipes("Out Sider-TestRealm", { name = "Tailoring", rank = 120, max = 150 }, PANTS, "auto")
	LI.crafters["Out Sider-TestRealm"].seen = time() - 100 * 86400
	LI.favorites["Out Sider-TestRealm"] = true
	LI.SetRecipes("Old Stranger-TestRealm", { name = "Tailoring", rank = 90, max = 150 }, PANTS, "auto")
	LI.crafters["Old Stranger-TestRealm"].seen = time() - 100 * 86400
	check(LI.settings.guildOnly == false and LI.Allowed("Out Sider-TestRealm"), "guild only is off by default")
	local summary
	for _, e in ipairs(LI.db.log) do
		if e.m:find("^Guild: ") then summary = e.m end
	end
	check(summary and summary:find("2 online", 1, true) and summary:find("1 other realm", 1, true), "the log says what happens to online guildmates", summary)

	LI.UI.Open(LI.UI.TAB.find)
	local main = LinkedInnFrame
	main.gear.__scripts.OnClick(main.gear)
	local panel = LinkedInnSettings
	panel.guild:SetChecked(true)
	panel.guild.__scripts.OnClick(panel.guild)
	check(LI.settings.guildOnly == true, "guild only can be switched on in settings")
	check(#LI.Search("", { guildOnly = true }) == 1 and main.count.__text:find("Guild and friends", 1, true), "the list shows only guildmates and says so", main.count.__text)
	check(main.count.__text:find("1 on the other realm", 1, true) and panel.farSide.__text:find("1 online guildmate is on the other realm", 1, true), "guildmates the game can't read are explained", panel.farSide.__text)
	check(LI.crafters["Out Sider-TestRealm"] and LI.crafters["Old Stranger-TestRealm"], "nobody is deleted when it's switched on")
	W.friends = { { name = "Best Friend", connected = true, guid = "Player-1-BFRI" } }
	LI.SetRecipes("Best Friend-TestRealm", { name = "Alchemy", rank = 100, max = 150 }, { { id = 2330, name = "Minor Healing Potion", item = 118 } }, "auto")
	Fire("FRIENDLIST_UPDATE")
	check(LI.Allowed("Best Friend-TestRealm") and #LI.Search("", { guildOnly = true }) == 2, "friends count too, not just the guild")
	LI.UI.Refresh()
	local tags = {}
	for _, r in ipairs(main.list.__rows) do
		if r.entry then tags[r.entry.key] = r.line.__text end
	end
	check(tags["Guild Pal-TestRealm"] and tags["Guild Pal-TestRealm"]:find("Guild", 1, true) and tags["Best Friend-TestRealm"] and tags["Best Friend-TestRealm"]:find("Friend", 1, true) and not tags["Best Friend-TestRealm"]:find("Guild", 1, true), "rows show who's in your guild and who's a friend", tostring(tags["Best Friend-TestRealm"]))

	local queued = LI.Reader.QueueSize()
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-STR", 2259, 171, "Alchemy"), "Total Stranger-TestRealm", "Player-1-STR", "Trade - City")
	check(not LI.crafters["Total Stranger-TestRealm"] and LI.Reader.QueueSize() == queued, "links from outside the guild are not added or read")
	LI.Reader.Want("Total Stranger-TestRealm", "Alchemy", "trade:Player-1-STR:2259:171")
	check(LI.Reader.QueueSize() == queued, "reads of outsiders are refused")
	check(not LI.Discover("Walk Past-TestRealm", "Player-1-WALK", LI.PRIO.group), "outsiders are not scanned")
	LI.OnCrafted("Craft Person creates Brown Linen Pants.")
	check(not LI.waiting["Craft Person-TestRealm"] and not LI.crafters["Craft Person-TestRealm"], "the crafting log ignores outsiders")
	Say("CHAT_MSG_GUILD", TradeLink("Player-1-GPAL", 3908, 197, "Tailoring"), "Guild Pal-TestRealm", "Player-1-GPAL")
	check(LI.Reader.QueueSize() >= queued, "guildmates still work")

	Addon("H1|abcd|MAGE|alchemy~1e~2s~5", "Net Stranger-TestRealm")
	check(not LI.crafters["Net Stranger-TestRealm"], "Linked Inn users outside the guild are ignored")
	W.sent = {}
	LI.Sync.Send("W1|test", "CHANNEL")
	LI.Sync.Send("W1|psst", "WHISPER", "Net Stranger")
	Advance(5)
	local routes, stranger = {}, false
	for _, m in ipairs(W.sent) do
		routes[m.chatType] = true
		if m.chatType == "WHISPER" and m.target ~= "Best Friend" then stranger = true end
	end
	check(routes.GUILD and not routes.CHANNEL and not stranger, "messages only go to the guild and friends", tostring(routes.CHANNEL))
	LI.SetRecipes(LI.playerKey, { name = "Tailoring", rank = 100, max = 150 }, PANTS, "own")
	LI.Work.OnRequest("Net Stranger-TestRealm", { "R1", "9", LI.Sync.B36(4343), LI.Sync.B36(3914), "1", "n", "0", "5a", "" })
	local function SeesOutsider()
		for _, req in ipairs(LI.Work.Received()) do
			if req.owner == "Net Stranger-TestRealm" then return true end
		end
		return false
	end
	check(not SeesOutsider(), "work requests from outside the guild are hidden")
	LI.settings.guildOnly = false
	check(SeesOutsider(), "and come back when guild only is off")
	LI.settings.guildOnly = true

	LI.PruneNow()
	LI.settings.housekeeping = "strict"
	LI.Housekeep()
	LI.settings.housekeeping = "off"
	check(LI.crafters["Old Stranger-TestRealm"], "no pruning or housekeeping while guild only is on")
	local saved = Logout()
	Boot(saved)
	Advance(5)
	check(LI.settings.guildOnly == true and LI.crafters["Old Stranger-TestRealm"], "it stays on after a reload and still keeps everyone")

	LI.settings.guildOnly = false
	W.friends = nil
	check(LI.Allowed("Total Stranger-TestRealm") and #LI.Search("", {}) >= 3, "switching it off brings everyone back")
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-STR", 2259, 171, "Alchemy"), "Total Stranger-TestRealm", "Player-1-STR", "Trade - City")
	check(LI.crafters["Total Stranger-TestRealm"], "and everything works as normal again")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.defaultLinks = true
	Boot()
	Advance(5)
	W.autoWorks = true
	W.linkData = W.linkData or {}
	local guid = "Player-1-TAIL"
	local function Link(prof)
		return LI.BuildLink(guid, prof)
	end
	W.linkData[Link("alchemy")] = { linkedName = "Late Tailor", prof = ALCHEMY, recipes = {} }
	W.linkData[Link("blacksmithing")] = { linkedName = "Late Tailor", prof = { professionName = "Blacksmithing", professionID = 164, skillLevel = 1, maxSkillLevel = 75 }, recipes = {} }
	W.linkData[Link("tailoring")] = { linkedName = "Late Tailor", prof = TAILORING, recipes = TAILOR_RECIPES }
	LI.Reader.Scan({ { key = "Late Tailor-TestRealm", guid = guid, profs = { "alchemy", "blacksmithing", "tailoring" } } }, true)
	Advance(20)
	local c = LI.crafters["Late Tailor-TestRealm"]
	check(c and c.profs.tailoring and c.profs.tailoring.recipes, "empty answers for professions they don't have don't end the scan early")
	local line
	for _, e in ipairs(LI.db.log) do
		if e.m:find("Checked Late Tailor", 1, true) then line = e.m end
	end
	check(line and line:find("1 profession", 1, true), "the log counts only real professions", line)
	W.autoWorks, W.defaultLinks = false, nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Fire("PLAYER_ENTERING_WORLD")
	Advance(3)
	W.trade = { linked = true, linkedName = "Cander Ironshire", prof = TAILORING, recipes = {} }
	Fire("TRADE_SKILL_SHOW")
	if ProfessionsFrame then ProfessionsFrame:Show() end
	Advance(2)
	check(W.trade == nil, "a reply to a read from before a reload is closed, not shown")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.discover = true
	W.defaultLinks = true
	W.guild = { { name = "Guild One-TestRealm", online = true, guid = "Player-1-GONE" }, { name = "Guild Two-TestRealm", online = true, guid = "Player-1-GTWO" } }
	Boot()
	Advance(5)
	local function Checked(name)
		for _, e in ipairs(LI.db.log) do
			if e.m:find("Checked " .. name, 1, true) then return true end
		end
		return false
	end
	Advance(30)
	LI.Reader.Scan({ { key = "Out Sider-TestRealm", guid = "Player-1-OUTS", profs = { "alchemy", "blacksmithing", "enchanting", "tailoring" } } }, true)
	Advance(0.1)
	LI.settings.guildOnly = true
	Fire("GUILD_ROSTER_UPDATE")
	Advance(40)
	check(not LI.Reader.Scanning() and Checked("Guild One") and Checked("Guild Two"), "a scan cut short by guild only doesn't block the guild checks", tostring(LI.Reader.Scanning()))
	LI.settings.guildOnly = false

	for i = 1, 12 do
		LI.Reader.Want("Busy " .. i .. "-TestRealm", "Alchemy", "trade:Player-1-BS" .. i .. ":2259:171", { built = true })
	end
	LI.tried["Guild Three-TestRealm"] = nil
	W.guild[3] = { name = "Guild Three-TestRealm", online = true, guid = "Player-1-GTHR" }
	Fire("GUILD_ROSTER_UPDATE")
	Advance(12)
	check(Checked("Guild Three") and LI.Reader.QueueSize() > 0, "guild members are checked before a busy queue of other reads", LI.Reader.QueueSize())
	W.discover, W.defaultLinks = nil, nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.guild = { { name = "Far Crafter-TestRealm", online = true, guid = "Player-2-FARC" } }
	Boot()
	Advance(40)
	W.sent = {}
	Addon("H1|abcd|MAGE|tailoring~1e~2s~5", "Far Crafter-TestRealm", "GUILD")
	Advance(3)
	local q2, whispered
	for _, m in ipairs(W.sent) do
		if m.msg:find("^Q2|abcd|Far Crafter$") and m.chatType == "GUILD" then q2 = true end
		if m.msg:find("^Q1|") then whispered = true end
	end
	check(q2 and not whispered, "a Linked Inn user heard in the guild is asked for their list through the guild")

	LI.SetRecipes(LI.playerKey, { name = "Tailoring", rank = 100, max = 150 }, { { id = 3914, name = "Brown Linen Pants", item = 4343 } }, "own")
	LI.Fire("OwnRecipesChanged")
	Advance(70)
	W.sent = {}
	Addon("Q2|zz|Someone Else", "Far Crafter-TestRealm", "GUILD")
	Advance(8)
	local data = false
	for _, m in ipairs(W.sent) do
		if m.msg:find("^D1|") and m.chatType == "GUILD" then data = true end
	end
	check(not data, "a guild request for someone else isn't answered")
	Addon("Q2|zz|" .. LI.ShortName(LI.playerKey), "Far Crafter-TestRealm", "GUILD")
	Advance(8)
	for _, m in ipairs(W.sent) do
		if m.msg:find("^D1|") and m.chatType == "GUILD" then data = true end
	end
	check(data, "a guild request for you is answered with your list through the guild")
	W.groupSize = 2
	W.sent = {}
	Addon("H1|abce|MAGE|alchemy~1e~2s~5", "Party Pal-TestRealm", "PARTY")
	Advance(3)
	local partyAsk = false
	for _, m in ipairs(W.sent) do
		if m.msg:find("^Q2|abce|Party Pal$") and m.chatType == "PARTY" then partyAsk = true end
	end
	check(partyAsk, "the same works through your party")
	W.groupSize = nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local POT = { { id = 2330, name = "Minor Healing Potion", item = 118 } }
	LI.SetRecipes("More Recipes-TestRealm", { name = "Alchemy", rank = 150, max = 225 }, POT, "auto")
	LI.SetRecipes("Seen Lately-TestRealm", { name = "Alchemy", rank = 150, max = 225 }, POT, "auto")
	LI.crafters["More Recipes-TestRealm"].profs.alchemy.count = 32
	LI.crafters["Seen Lately-TestRealm"].profs.alchemy.count = 31
	LI.crafters["More Recipes-TestRealm"].seen = time() - 6 * 3600
	LI.crafters["Seen Lately-TestRealm"].seen = time() - 3 * 3600
	local rows
	for _, g in ipairs(LI.Group(LI.Search("", {}))) do
		if g.key == "alchemy" then rows = g.rows end
	end
	check(rows and rows[1].entry.key == "Seen Lately-TestRealm", "at the same skill, the one seen more recently comes first", rows and rows[1].entry.key)
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	LI.SetRecipes(LI.playerKey, { name = "Tailoring", rank = 100, max = 150 }, { { id = 3914, name = "Brown Linen Pants", item = 4343 } }, "own")
	LI.Fire("OwnRecipesChanged")
	W.sent = {}
	Advance(60)
	local first
	for _, m in ipairs(W.sent) do
		if m.msg:find("^H1|") and m.chatType == "CHANNEL" and not first then first = m.msg end
	end
	check(first and first:find("|J$"), "the first hello after logging in asks others to say hi back", first)
	Addon("H1|abcd|MAGE|alchemy~1e~2s~5|TestRealm|1", "Fresh Login-TestRealm")
	Advance(30)
	W.sent = {}
	Addon("H1|abcd|MAGE|alchemy~1e~2s~5|TestRealm|1||J", "Fresh Login-TestRealm")
	Advance(8)
	local reply
	for _, m in ipairs(W.sent) do
		if m.msg:find("^H1|") and m.chatType == "CHANNEL" then reply = m.msg end
	end
	check(reply and not reply:find("|J$"), "someone who just logged in gets a hello back within seconds, without the flag", reply)
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(3)
	W.sent = {}
	for i = 1, 10 do
		Addon(string.format("H1|v%d|MAGE|alchemy~1e~2s~5|TestRealm|1", i), "Speedy " .. string.char(64 + i) .. "-TestRealm")
	end
	Advance(4)
	check(#Sent("Q1", "WHISPER") == 10, "ten Linked Inn users heard at once are all asked for their lists within seconds", #Sent("Q1", "WHISPER"))
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.channels = {}
	Boot()
	Advance(10)
	check(not LI.Sync.IsJoined(), "the hidden channel waits while General hasn't taken /1 yet, so it never steals it")
	W.channels[1] = 1
	Advance(3)
	check(LI.Sync.IsJoined(), "it joins once /1 is taken")
	Setup()
	W.playerGUID = "Player-1-ME"
	W.channels = {}
	Boot()
	Advance(35)
	check(LI.Sync.IsJoined(), "someone who left every server channel still joins after half a minute")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.faction = "Alliance"
	W.bnet = {
		{ id = 101, name = "Far Friend", realm = "TestRealm2", faction = "Alliance", project = 18 },
		{ id = 102, name = "Near Friend", realm = "TestRealm", faction = "Alliance", project = 18 },
		{ id = 103, name = "Enemy Friend", realm = "TestRealm2", faction = "Horde", project = 18 },
		{ id = 104, name = "Retail Friend", realm = "Area52", faction = "Alliance", project = 1 },
		{ id = 105, name = "Other Ruleset", realm = "TestRealmPvE", faction = "Alliance", project = 18 },
		{ id = 106, name = "Nosurname", realm = "TestRealm2", faction = "Alliance", project = 18 },
	}
	Boot()
	Advance(3)
	local Bridge, Sync = LI.Bridge, LI.Sync
	local list = Bridge.Friends()
	local names = {}
	for _, f in ipairs(list) do names[#names + 1] = LI.ShortName(f.key) .. (f.sameHalf and "=" or "~") end
	check(table.concat(names, ",") == "Far Friend~,Near Friend=", "Battle.net friends in Forever on your faction and ruleset are found, and it knows who's on the other half", table.concat(names, ","))

	LI.SetRecipes(LI.playerKey, { name = "Tailoring", rank = 100, max = 150 }, { { id = 3914, name = "Brown Linen Pants", item = 4343 } }, "own")
	LI.Fire("OwnRecipesChanged")
	local payload = Sync.Encode({ alchemy = { rank = 100, max = 150, recipes = { [2330] = true } } })
	Addon("H1|abc1|PRIEST|alchemy~2s~46~1|TestRealm|1", "Chan Pal-TestRealm")
	Addon("D1|abc1|1|1|" .. payload, "Chan Pal-TestRealm", "WHISPER")
	check(LI.crafters["Chan Pal-TestRealm"].profs.alchemy.recipes and Sync.Cached("Chan Pal-TestRealm"), "a list heard on the channel is kept as received")
	W.bnetSent = {}
	Advance(25)
	local to = {}
	for _, m in ipairs(W.bnetSent) do
		local who, hops = m.msg:match("^C1|([^|]+)|(%d)|")
		if who then to[m.id .. ":" .. who .. ":" .. hops] = true end
	end
	check(to["101:" .. LI.ShortName(LI.playerKey) .. ":1"] and to["101:Chan Pal:2"], "your card and the cards of users you hear go to your Battle.net friends in Forever")
	local wrong = false
	for _, m in ipairs(W.bnetSent) do
		if m.id ~= 101 and m.id ~= 102 then wrong = true end
	end
	check(not wrong, "not to friends on the other faction, another ruleset or another game")
	W.bnetSent = {}
	Advance(25)
	check(#W.bnetSent == 0, "the same cards aren't sent again for half an hour")

	local far = Sync.Encode({ tailoring = { rank = 200, max = 225, recipes = { [3914] = true, [18560] = true } } })
	local card = { origin = "Distant Crafter-TestRealm", ver = "zz9", payload = far, class = "MAGE", faction = "A" }
	W.sent = {}
	for _, line in ipairs(Bridge.Lines(card, 1, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 101)
	end
	local distant = LI.crafters["Distant Crafter-TestRealm"]
	check(distant and distant.li and distant.profs.tailoring and distant.profs.tailoring.recipes[18560], "a card from a Battle.net friend lists that user with all their recipes")
	check(LI.Status("Distant Crafter-TestRealm") == "online", "and shows them as around")
	Advance(10)
	local passed
	for _, m in ipairs(W.sent) do
		if m.chatType == "CHANNEL" and m.msg:find("^C1|Distant Crafter|2|") then passed = true end
	end
	check(passed, "it is passed on to everyone on your channel after a short wait")

	local second = { origin = "Second Distant-TestRealm", ver = "zz8", payload = far, class = "PRIEST", faction = "A" }
	W.sent = {}
	for _, line in ipairs(Bridge.Lines(second, 1, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 101)
	end
	for _, line in ipairs(Bridge.Lines(second, 2)) do
		Addon(line, "Other Bridge-TestRealm")
	end
	Advance(10)
	local again = false
	for _, m in ipairs(W.sent) do
		if m.msg:find("^C1|Second Distant|") then again = true end
	end
	check(LI.crafters["Second Distant-TestRealm"] and not again, "if another bridge already put it on the channel, it isn't repeated")

	local enemy = { origin = "Horde Guy-TestRealm", ver = "zz7", payload = far, class = "MAGE", faction = "H" }
	for _, line in ipairs(Bridge.Lines(enemy, 1, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 101)
	end
	local tooFar = { origin = "Too Far-TestRealm", ver = "zz6", payload = far, class = "MAGE", faction = "A" }
	for _, line in ipairs(Bridge.Lines(tooFar, 4, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 101)
	end
	local fromEnemy = { origin = "Via Enemy-TestRealm", ver = "zz5", payload = far, class = "MAGE", faction = "A" }
	for _, line in ipairs(Bridge.Lines(fromEnemy, 1, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 103)
	end
	local fake = { origin = LI.playerKey, ver = "zz4", payload = far, class = "MAGE", faction = "A" }
	for _, line in ipairs(Bridge.Lines(fake, 1, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 101)
	end
	check(not LI.crafters["Horde Guy-TestRealm"] and not LI.crafters["Too Far-TestRealm"] and not LI.crafters["Via Enemy-TestRealm"] and not LI.crafters[LI.playerKey].profs.tailoring.recipes[18560], "cards of the other faction, too many hops, through an enemy friend or claiming to be you are ignored")
	for _, line in ipairs(Bridge.Lines({ origin = "Chan Pal-TestRealm", ver = "abc1", payload = far, class = "PRIEST", faction = "A" }, 2, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 101)
	end
	W.sent = {}
	for _, line in ipairs(Bridge.Lines({ origin = "Chan Pal-TestRealm", ver = "abc1", payload = far, class = "PRIEST", faction = "A" }, 2, 1500)) do
		Fire("BN_CHAT_MSG_ADDON", "LinkedInn", line, "WHISPER", 102)
	end
	Advance(10)
	local repeated = false
	for _, m in ipairs(W.sent) do
		if m.msg:find("^C1|Chan Pal|") then repeated = true end
	end
	check(not LI.crafters["Chan Pal-TestRealm"].profs.tailoring and not repeated, "a card you already have neither overwrites your list nor gets repeated on your channel")

	W.units = { party1 = { name = "Party", surname = "Pal", guid = "Player-2-PRTY" } }
	W.groupSize = 1
	W.sent = {}
	Fire("GROUP_ROSTER_UPDATE")
	Advance(5)
	local grouped = false
	for _, m in ipairs(W.sent) do
		if m.chatType == "PARTY" and m.msg:find("^C1|") then grouped = true end
	end
	check(grouped, "being grouped with someone from the other half bridges too")
	check(Bridge.Status():find("2 Battle.net friends in Forever (1 on the other half)", 1, true), "/li status shows the bridge", Bridge.Status())
	LI.settings.guildOnly = true
	check(Bridge.Share() == 0, "Guild and friends only turns the bridge off")
	LI.settings.guildOnly = false
	W.units, W.groupSize, W.bnet, W.faction = nil, nil, nil, nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.joinDelay = 2
	W.channels = { [1] = 1 }
	W.profs = { { name = "Tailoring", rank = 100, max = 150 } }
	Boot()
	W.sent = {}
	Advance(8)
	check(LI.Sync.IsJoined() and #Sent("H1", "CHANNEL") >= 1, "when the game confirms the channel a moment later, the first hello still goes out within seconds", #Sent("H1", "CHANNEL"))
	W.joinDelay = nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	W.sent = {}
	Addon("P2|123", "Quiet User-TestRealm", "CHANNEL")
	Advance(2)
	local asked = false
	for _, m in ipairs(W.sent) do
		if m.msg:find("^Q1|") and m.chatType == "WHISPER" and m.target == "Quiet User" then asked = true end
	end
	check(asked, "any message from a Linked Inn user whose list you don't have asks for it right away")
	local payload = LI.Sync.Encode({ alchemy = { rank = 100, max = 150, recipes = { [2330] = true } } })
	Addon("D1|abcd|1|1|" .. payload, "Quiet User-TestRealm", "WHISPER")
	check(LI.crafters["Quiet User-TestRealm"] and LI.crafters["Quiet User-TestRealm"].profs.alchemy.recipes, "and their answer fills them in")
	W.sent = {}
	Advance(200)
	Addon("P2|124", "Quiet User-TestRealm", "CHANNEL")
	Advance(2)
	check(#Sent("Q1") == 0, "someone whose list you have isn't asked again")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	W.profs = { { name = "Tailoring", rank = 100, max = 150 } }
	Boot()
	Advance(5)
	LI.UI.Open(LI.UI.TAB.find)
	local dot = LinkedInnFrame.health
	local level, rows = LI.Health.Compute()
	local text = {}
	for _, r in ipairs(rows) do text[#text + 1] = r.title .. ": " .. r.text end
	check(dot and level == "ok" and table.concat(text, "; "):find("Hidden channel: joined", 1, true), "the status light is green with a joined channel", table.concat(text, "; "))
	local errors = #W.errors
	dot.__scripts.OnEnter(dot)
	check(#W.errors == errors, "hovering it shows the explanation without errors", W.errors[#W.errors])
	W.sendResult = 9
	LI.Sync.Ping()
	Advance(4)
	check(LI.Health.Compute() == "warn", "a refused send makes it yellow")
	Setup()
	W.playerGUID = "Player-1-ME"
	W.noJoin = true
	Boot()
	Advance(30)
	check(LI.Health.Compute() == "ok", "joining takes a moment before it worries")
	Advance(40)
	check(LI.Health.Compute() == "bad", "a channel still not joined after a minute makes it red")
	W.noJoin = nil
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(2)
	LI.UI.Open(LI.UI.TAB.find)
	Advance(1)
	local guide = LinkedInnGuide
	check(guide and guide:IsShown() and guide.head.__text == "Welcome to Linked Inn", "the guide opens the first time the window does")
	guide.next.__scripts.OnClick(guide.next)
	check(guide.head.__text == "Helping it fill up" and guide.body.__text:find("Shift+V", 1, true), "Next shows how to help it fill up")
	guide.next.__scripts.OnClick(guide.next)
	check(guide.next:GetText() == "Get started", "the last page ends with Get started", guide.next:GetText())
	guide.next.__scripts.OnClick(guide.next)
	check(not guide:IsShown() and LI.db.guideSeen, "and closes it for good")
	LinkedInnFrame:Hide()
	LI.UI.Open(LI.UI.TAB.find)
	Advance(1)
	check(not guide:IsShown(), "it doesn't come back on its own")
	LinkedInnFrame.guideButton.__scripts.OnClick(LinkedInnFrame.guideButton)
	check(guide:IsShown() and guide.head.__text == "Welcome to Linked Inn", "the ? next to the status light opens it again")
	guide:Hide()
	SlashCmdList.LINKEDINN("guide")
	check(guide:IsShown(), "so does /li guide")
	guide:Hide()
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(2)
	LI.UI.Open(LI.UI.TAB.find)
	local main = LinkedInnFrame
	local hit = main.premiumHit
	for _ = 1, 6 do
		hit.__scripts.OnClick(hit)
		Advance(1)
	end
	check(not LI.db.premium and not main.premiumCheck:IsShown(), "slow clicks on the mug do nothing")
	local chat0 = #W.chat
	for _ = 1, 7 do
		hit.__scripts.OnClick(hit)
		Advance(0.2)
	end
	check(LI.db.premium and main.premiumCheck:IsShown(), "seven quick clicks on the mug unlock Linked Inn Premium")
	check(W.chat[chat0 + 1] and W.chat[chat0 + 1]:find("smugly", 1, true), "with an appropriately smug message", W.chat[chat0 + 1])
	main.premiumCheck.__scripts.OnClick(main.premiumCheck)
	check(#W.chat == chat0 + 2, "clicking the checkmark gets a quip")
	local saved = Logout()
	Boot(saved)
	Advance(2)
	LI.UI.Open(LI.UI.TAB.find)
	check(LinkedInnFrame.premiumCheck:IsShown(), "Premium survives a reload")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(2)
	LI.SetRecipes("Anna Book-TestRealm", { name = "Tailoring", rank = 100, max = 150 }, { { id = 3914, name = "Brown Linen Pants", item = 4343 } }, "auto")
	LI.UI.Open(LI.UI.TAB.find)
	LI.Book.Open("Anna Book-TestRealm", "tailoring", "")
	local book = LinkedInnBook
	check(book:IsShown(), "a recipe book opens beside the window")
	LinkedInnFrame.gear.__scripts.OnClick(LinkedInnFrame.gear)
	check(LinkedInnSettings:IsShown() and not book:IsShown(), "opening settings closes the book, so they never overlap")
	LI.Book.Open("Anna Book-TestRealm", "tailoring", "")
	check(book:IsShown() and not LinkedInnSettings:IsShown(), "and the other way round")
	LI.UI.Open(LI.UI.TAB.work)
	check(not book:IsShown(), "switching to Work closes the recipe book")
end

do
	Setup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local payload = LI.Sync.Encode({ cooking = { rank = 200, max = 225, recipes = { [2550] = true } } })
	Addon("H1|cook1|MAGE|cooking~5k~69~1|TestRealm|1", "Cook Only-TestRealm")
	Addon("D1|cook1|1|1|" .. payload, "Cook Only-TestRealm", "WHISPER")
	Addon("P2|1", "No Profs-TestRealm", "CHANNEL")
	local chat0 = #W.chat
	SlashCmdList.LINKEDINN("status")
	local report = table.concat({ table.unpack(W.chat, chat0 + 1) }, "\n")
	check(report:find("No Profs (nothing shared)", 1, true) and report:find("Cook Only (Cooking only", 1, true), "/li status says what each Linked Inn user heard has shared", report)
end

do
	Setup()
	Boot()
	Advance(1)
	math.randomseed(11)
	local words = { "Iron", "Silk", "Fire", "Frost", "Moon", "Dark", "Bright", "Heavy" }
	local profs = { "tailoring", "blacksmithing", "alchemy" }
	for id = 800001, 800300 do
		LI.db.recipes[id] = { n = words[math.random(#words)] .. " " .. words[math.random(#words)] .. " " .. id, p = profs[math.random(#profs)], k = "other" }
	end
	LI.db.recipes[800999] = { n = "Iron Orphan", k = "other" }
	for i = 1, 60 do
		local c = LI.Crafter("Rand" .. i .. "-TestRealm", true)
		c.seen = time()
		for _, pk in ipairs(profs) do
			if math.random() < 0.5 then
				local set, n = {}, 0
				for id = 800001, 800300 do
					if LI.db.recipes[id].p == pk and math.random() < 0.3 then set[id] = true n = n + 1 end
				end
				if i == 7 and pk == "tailoring" then set[800999] = true n = n + 1 end
				c.profs[pk] = { name = pk, rank = math.random(1, 300), recipes = set, count = n }
			end
		end
	end
	local orphanHolder = LI.Crafter("RandHolder-TestRealm", true)
	orphanHolder.seen = time()
	orphanHolder.profs.tailoring = { name = "tailoring", rank = 10, recipes = { [800999] = true, [800001] = true, [800002] = true }, count = 3 }
	local ok, checked = true, 0
	for _, q in ipairs({ "iron", "moon fire", "dark", "800150", "orphan", "zzz" }) do
		local expect = {}
		for key, c in pairs(LI.crafters) do
			if key:find("^Rand") then
				for _, p in pairs(c.profs) do
					for id in pairs(p.recipes or {}) do
						if LI.db.recipes[id] and LI.db.recipes[id].n:lower():find(q, 1, true) then expect[key] = true end
					end
				end
			end
		end
		local got = {}
		for _, r in ipairs(LI.Search(q, { profs = {} })) do got[r.key] = true end
		for k in pairs(expect) do
			checked = checked + 1
			if not got[k] then ok = false end
		end
		for k in pairs(got) do if k:find("^Rand") and not expect[k] then ok = false end end
	end
	check(ok and checked > 50, "the faster recipe search finds exactly the same crafters as checking every recipe", checked)
end

print(string.format("\n%d passed, %d failed, %d errors", pass, fail, #W.errors))
FAILURES = fail + #W.errors
