local function RetailSetup()
	Setup()
	W.retail = true
	W.name, W.surname = "Brew", nil
	W.playerGUID = "Player-1-ME"
	W.guids["Player-1-AAA"] = { class = "PRIEST", name = "Anna", realm = "" }
	W.guids["Player-1-BBB"] = { class = "WARRIOR", name = "Bob", realm = "" }
	W.guids["Player-1-CCC"] = { class = "ROGUE", name = "Cora", realm = "" }
	W.linkData = {
		["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna", prof = TAILORING, recipes = TAILOR_RECIPES },
		["trade:Player-1-CCC:2259:171"] = { linkedName = "Cora", prof = ALCHEMY, recipes = ALCHEMY_RECIPES },
	}
end

local function Addon(text, sender, chatType)
	Fire("CHAT_MSG_ADDON", "LinkedInn", text, chatType or "CHANNEL", sender)
end

RetailSetup()
W.defaultLinks = true
Boot()
check(LI.RETAIL == true and LI.INTERFACE == 120100, "the retail client is recognised", LI.INTERFACE)
check(table.concat(LI.PRIMARY, ",") == "alchemy,blacksmithing,enchanting,engineering,inscription,jewelcrafting,leatherworking,tailoring", "all eight crafting professions are primary", table.concat(LI.PRIMARY, ","))
check(table.concat(LI.SECONDARY, ",") == "cooking", "cooking is the only secondary profession")
local links = LI.db.profLinks
check(links.inscription and links.inscription.line == 773 and links.jewelcrafting and links.jewelcrafting.line == 755 and not links["first aid"], "a fresh install can read inscription and jewelcrafting, and has no first aid")
check(LI.playerKey == "Brew-TestRealm", "player names have no surname", LI.playerKey)
W.defaultLinks = nil

do
	RetailSetup()
	W.lineNames = { [171] = "Alchimie", [197] = "Schneiderei", [2871] = "Alchimie von Khaz Algar" }
	Boot()
	check(LI.ProfKey("Alchimie") == "alchemy" and LI.ProfKey("Schneiderei") == "tailoring", "localized profession names map to the same keys")
	check(LI.ProfKey("Alchimie von Khaz Algar") == "alchemy", "an expansion's profession name maps to its profession")
	check(LI.ProfKeyForLine(2906) == "alchemy" and LI.ProfKeyForLine(2871) == "alchemy" and LI.ProfKeyForLine(171) == "alchemy", "expansion skill lines map to their profession")
	W.lineInfo = { [3001] = { parentProfessionID = 197 } }
	check(LI.ProfKeyForLine(3001) == "tailoring", "a future expansion's skill line is mapped through its parent")
	check(LI.ProfKeyForLine(99999) == nil, "an unknown skill line maps to nothing")
	Say("CHAT_MSG_CHANNEL", "wts " .. TradeLink("Player-1-CCC", 2259, 2871, "Alchimie von Khaz Algar"), "Cora-TestRealm", "Player-1-CCC", "Handel - Stadt")
	local cora = LI.crafters["Cora-TestRealm"]
	check(cora and cora.profs.alchemy and not cora.profs["alchimie von khaz algar"], "a link named after an expansion is filed under its profession")
	check(cora and cora.profs.alchemy.name == "Alchimie", "and shown with the game's own name for it", cora and cora.profs.alchemy.name)
end

do
	RetailSetup()
	Boot()
	Advance(5)
	W.autoWorks = true
	W.linkData["trade:Player-1-AAA:3908:197"].child = nil
	local child = { professionName = "Khaz Algar Tailoring", expansionName = "The War Within", skillLevel = 87, maxSkillLevel = 100 }
	local base = { professionName = "Tailoring", professionID = 197, skillLevel = 0, maxSkillLevel = 0 }
	local hyper = methods.SetHyperlink
	methods.SetHyperlink = function(self, link)
		hyper(self, link)
		C_Timer.After(0.25, function()
			if W.trade and W.trade.linkedName == "Anna" then
				W.trade.prof, W.trade.child = base, child
			end
		end)
	end
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna-TestRealm", "Player-1-AAA", "Trade - City")
	Advance(6)
	methods.SetHyperlink = hyper
	local anna = LI.crafters["Anna-TestRealm"]
	local p = anna and anna.profs.tailoring
	check(p and p.recipes and p.count == 2, "a retail profession read saves the learned recipes", p and p.count)
	check(p and p.rank == 87 and p.max == 100 and p.tier == "The War Within", "the skill shown is the newest expansion's", p and tostring(p.rank) .. "/" .. tostring(p.max) .. " " .. tostring(p.tier))
	W.autoWorks = false
end

do
	RetailSetup()
	Boot()
	Advance(5)
	W.autoWorks = true
	W.guids["Player-77-FAR"] = { class = "MAGE", name = "Faraway", realm = "Other Realm" }
	W.linkData["trade:Player-77-FAR:2259:171"] = { linkedName = "Faraway", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-77-FAR", 2259, 171, "Alchemy"), "Faraway-OtherRealm", "Player-77-FAR", "Trade - City")
	Advance(8)
	local far = LI.crafters["Faraway-OtherRealm"]
	check(far and far.profs.alchemy and far.profs.alchemy.recipes, "a crafter from another realm is read, not skipped")
	check(LI.db.servers["77"] and LI.db.servers["77"].ok == 1, "the realm is remembered as readable")
	check(not LI.OtherServer("Player-77-XYZ"), "and stays readable")
	W.autoWorks = false
	for i = 1, 8 do
		LI.NoteServerRead("Player-55-N" .. i, false)
	end
	check(LI.OtherServer("Player-55-NEW"), "a realm that never answers is skipped after eight misses")
	check(not LI.OtherServer("Player-1-ANY"), "your own realm is never skipped")
	LI.db.servers["55"].at = time() - 90000
	check(not LI.OtherServer("Player-55-NEW"), "and it gets another chance the next day")
	LI.NoteServerRead("Player-55-N9", true)
	for i = 1, 20 do
		LI.NoteServerRead("Player-55-M" .. i, false)
	end
	check(not LI.OtherServer("Player-55-NEW"), "once a realm has answered it is never written off")
end

do
	RetailSetup()
	Boot()
	Advance(5)
	TRADESKILL_LOG_THIRDPERSON = "%s stellt %s her."
	W.guids["Player-1-DDD"] = { class = "MAGE", name = "Dora", realm = "" }
	W.linkData["trade:Player-1-DDD:3908:197"] = { linkedName = "Dora", prof = TAILORING, recipes = TAILOR_RECIPES }
	LI.db.recipes[18560] = { n = "Mooncloth Bag", p = "tailoring", item = 14155, r = "14342:4", k = "bag" }
	LI.db.profLinks.tailoring = { spell = 3908, line = 197 }
	W.autoWorks = true
	Fire("CHAT_MSG_TRADESKILLS", "Dora stellt |cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r her.", "", "", "", "", "", 0, 0, "", 0, 1, "Player-1-DDD")
	Advance(10)
	local dora = LI.crafters["Dora-TestRealm"]
	check(dora and dora.profs.tailoring and dora.profs.tailoring.recipes, "a crafting log line in another language still finds the crafter")
	TRADESKILL_LOG_THIRDPERSON = nil
	W.autoWorks = false
end

do
	RetailSetup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local sent0 = #W.sent
	for i = 1, 30 do
		LI.Sync.Send("X1|" .. i, "GUILD")
	end
	local start = W.clock
	for _ = 1, 400 do
		Advance(0.1)
	end
	local worst, sentAll = 0, 0
	for i = sent0 + 1, #W.sent do
		local a = W.sent[i]
		sentAll = sentAll + 1
		local inWindow = 0
		for j = i, #W.sent do
			local b = W.sent[j]
			if b.at - a.at <= 5 then inWindow = inWindow + 1 end
		end
		worst = math.max(worst, inWindow)
	end
	check(sentAll == 30, "every queued message is sent eventually", sentAll)
	check(worst <= 10 + 5, "never more than the game's allowance: a burst of ten, then one a second", worst)
	check(W.sent[#W.sent].at - start < 30, "without needless delay", W.sent[#W.sent].at - start)
	local whispers0 = #W.sent
	for i = 1, 5 do
		LI.Sync.Send("X1|w" .. i, "WHISPER", "Someone")
	end
	Advance(2)
	local whispered = 0
	for i = whispers0 + 1, #W.sent do
		if W.sent[i].chatType == "WHISPER" then whispered = whispered + 1 end
	end
	check(whispered == 5, "whispers aren't held back by that limit", whispered)
end

do
	RetailSetup()
	W.bnet = { { id = 1, name = "Pal Friend", realm = "Somewhere", project = 18 }, { id = 2, name = "Retail Pal", realm = "Somewhere", project = 1 } }
	Boot()
	Advance(30)
	check(#LI.Bridge.Friends() == 0 and #W.bnetSent == 0, "the Forever realm bridge stays off in retail")
end

_G.ProfessionsFrame_LoadUI = function()
	ProfessionsFrame = NewMock("Frame", "ProfessionsFrame")
	ProfessionsFrame:Hide()
	Fire("ADDON_LOADED", "Blizzard_Professions")
	return true
end

do
	RetailSetup()
	Boot()
	Advance(5)
	ProfessionsFrame_LoadUI()
	local stackNow = ""
	debugstack = function() return stackNow end
	ProfessionsFrame:RegisterEvent("TRADE_SKILL_SHOW")
	ProfessionsFrame:SetScript("OnEvent", function(self)
		stackNow = "[Blizzard_Game/Mainline/EventImplementation.lua]:472: in function 'HandleTradeSkillShow'"
		self:Show()
		stackNow = ""
	end)
	W.autoWorks = true
	W.replyDelay = 12
	W.linkData["trade:Player-1-SLW:2259:171"] = { linkedName = "Slow", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	LI.Reader.Want("Slow-TestRealm", "Alchemy", "trade:Player-1-SLW:2259:171", { built = true })
	local visible = false
	ProfessionsFrame:HookScript("OnShow", function(self)
		LI.After(0, function()
			if self:IsShown() and self:GetAlpha() > 0.05 then visible = true end
		end)
	end)
	for _ = 1, 150 do
		Advance(0.1)
	end
	check(not visible and not ProfessionsFrame:IsShown(), "a late reply never shows the profession window in retail either")
	W.autoWorks, W.replyDelay = false, nil
	W.trade = { linked = false, prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	Fire("TRADE_SKILL_SHOW")
	Advance(0.1)
	check(ProfessionsFrame:IsShown() and ProfessionsFrame:GetAlpha() == 1, "opening your own profession from the book still shows it")
	debugstack = nil
	ProfessionsFrame:Hide()
	ProfessionsFrame = nil
end

do
	RetailSetup()
	Boot()
	Advance(1)
	math.randomseed(7)
	local okAll = true
	for round = 1, 40 do
		local set, ids = {}, {}
		for _ = 1, math.random(0, 400) do
			local id = math.random(1, 1300000)
			if not set[id] then
				set[id] = true
				ids[#ids + 1] = id
			end
		end
		local packed = LI.PackRecipes("tailoring", set)
		local p = { recipes = packed }
		local back = LI.RecipeList(p, "tailoring")
		local seen = {}
		for _, id in ipairs(back) do seen[id] = true end
		for _, id in ipairs(ids) do
			if not seen[id] or not LI.KnowsRecipe(p, "tailoring", id) then okAll = false end
		end
		if #back ~= #ids then okAll = false end
		if LI.KnowsRecipe(p, "tailoring", 1300001 + round) then okAll = false end
	end
	check(okAll, "recipes stored compactly come back exactly, and nothing else does")
	local big = {}
	for i = 1, 1000 do big[2000000 + i] = true end
	local packedBig = LI.PackRecipes("alchemy", big)
	check(#packedBig <= 170, "a thousand recipes take under two hundred characters", #packedBig)
	local again = LI.PackRecipes("alchemy", big)
	check(again == packedBig, "packing the same recipes twice gives the same string")
end

do
	RetailSetup()
	Boot()
	Advance(5)
	W.autoWorks = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-AAA", 3908, 197, "Tailoring"), "Anna-TestRealm", "Player-1-AAA", "Trade - City")
	Advance(6)
	W.autoWorks = false
	local p = LI.crafters["Anna-TestRealm"].profs.tailoring
	check(type(p.recipes) == "string" and p.count == 2, "retail keeps recipes as a compact string", type(p.recipes))
	check(LI.KnowsRecipe(p, "tailoring", 18560) and LI.KnowsRecipe(p, "tailoring", 3914) and not LI.KnowsRecipe(p, "tailoring", 3915), "and knows exactly the learned ones")
	local results = LI.Search("mooncloth", { profs = {} })
	check(#results == 1 and results[1].key == "Anna-TestRealm" and results[1].recipe == 18560, "searching an item finds the crafter", #results)
	local none = LI.Search("brown linen shirt", { profs = {} })
	check(#none == 0, "an unlearned recipe finds nobody", #none)
	local book = LI.Book.Recipes("Anna-TestRealm", "tailoring", "")
	check(#book == 2, "the recipe book lists the learned recipes", #book)
	local enc = LI.Sync.Encode({ tailoring = p })
	local dec = LI.Sync.Decode(enc)
	check(dec and dec[1].ids and #dec[1].ids == 2, "sharing sends the same recipes", enc)
	local saved = Logout()
	check(not saved:find("%[18560%]=true"), "saved data holds the compact string, not a list of recipes")
	Boot(saved)
	Advance(1)
	local p2 = LI.crafters["Anna-TestRealm"].profs.tailoring
	check(LI.KnowsRecipe(p2, "tailoring", 18560) and #LI.Search("mooncloth", { profs = {} }) == 1, "and it all still works after a reload")
end

do
	RetailSetup()
	Boot()
	Advance(5)
	local big = {}
	for i = 1, 3000 do
		big[i] = { id = 400000 + i, name = "Recipe " .. i, item = 900000 + i, learned = i % 5 == 0 }
	end
	W.guids["Player-1-BIG"] = { class = "PALADIN", name = "Bigs", realm = "" }
	W.linkData["trade:Player-1-BIG:2018:164"] = { linkedName = "Bigs", prof = { professionName = "Blacksmithing", professionID = 164, skillLevel = 0, maxSkillLevel = 0 }, recipes = big }
	local frames, calls = 0, 0
	local getInfo = C_TradeSkillUI.GetRecipeInfo
	C_TradeSkillUI.GetRecipeInfo = function(id)
		calls = calls + 1
		return getInfo(id)
	end
	local maxPerStep = 0
	local after = C_Timer.After
	C_Timer.After = function(sec, fn)
		after(sec, function()
			local before = calls
			fn()
			maxPerStep = math.max(maxPerStep, calls - before)
		end)
	end
	W.autoWorks = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-BIG", 2018, 164, "Blacksmithing"), "Bigs-TestRealm", "Player-1-BIG", "Trade - City")
	Advance(6)
	W.autoWorks = false
	C_Timer.After = after
	C_TradeSkillUI.GetRecipeInfo = getInfo
	local bigs = LI.crafters["Bigs-TestRealm"]
	check(bigs and bigs.profs.blacksmithing and bigs.profs.blacksmithing.count == 600, "a profession with thousands of recipes is read completely", bigs and bigs.profs.blacksmithing and bigs.profs.blacksmithing.count)
	check(maxPerStep <= 260, "but a few hundred at a time, so the game never stutters", maxPerStep)
	check(not W.trade, "and the hidden window closes once it's done")
	W.linkData["trade:Player-1-SWP:2018:164"] = { linkedName = "Swapper", prof = { professionName = "Blacksmithing", professionID = 164, skillLevel = 0, maxSkillLevel = 0 }, recipes = big }
	W.guids["Player-1-SWP"] = { class = "PALADIN", name = "Swapper", realm = "" }
	local realAfter = C_Timer.After
	C_Timer.After = function(sec, fn)
		realAfter(sec > 0 and sec or 0.01, fn)
	end
	calls = 0
	C_TradeSkillUI.GetRecipeInfo = function(id)
		calls = calls + 1
		return getInfo(id)
	end
	W.autoWorks = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-SWP", 2018, 164, "Blacksmithing"), "Swapper-TestRealm", "Player-1-SWP", "Trade - City")
	for _ = 1, 30 do
		Advance(0.05)
		if W.trade and W.trade.linkedName == "Swapper" and calls > 0 then break end
	end
	local swapped = false
	for _ = 1, 20 do
		Advance(0.02)
		if W.trade and W.trade.linkedName == "Swapper" and not swapped then
			W.trade = { linked = true, linkedName = "Someone Else", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
			swapped = true
		end
	end
	Advance(10)
	W.autoWorks = false
	C_Timer.After = realAfter
	C_TradeSkillUI.GetRecipeInfo = getInfo
	check(swapped, "the test really interrupts a read halfway")
	local swp = LI.crafters["Swapper-TestRealm"]
	local partial = swp and swp.profs.blacksmithing and swp.profs.blacksmithing.recipes and swp.profs.blacksmithing.count ~= 600
	check(not (swp and swp.profs.alchemy) and not partial, "a read interrupted by another profession opening never saves a mixed or partial list", swp and swp.profs.blacksmithing and swp.profs.blacksmithing.count)
end

do
	RetailSetup()
	Boot()
	Advance(5)
	W.autoWorks = true
	LI.tried["Cora-TestRealm"] = time()
	W.dataChanging = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-CCC", 2259, 171, "Alchemy"), "Cora-TestRealm", "Player-1-CCC", "Trade - City")
	Advance(3)
	W.dataChanging = false
	Advance(8)
	W.autoWorks = false
	local cora = LI.crafters["Cora-TestRealm"]
	check(cora and cora.profs.alchemy and cora.profs.alchemy.recipes, "a profession that takes a few seconds to load is still read before the window closes")
	check(not W.trade, "and the hidden window still closes afterwards")
end

do
	RetailSetup()
	Boot()
	Advance(5)
	W.categories = {
		[1000] = { categoryID = 1000, name = "Khaz Algar Tailoring", uiOrder = 1, skillLineCurrentLevel = 87, skillLineMaxLevel = 100 },
		[1001] = { categoryID = 1001, name = "Classic Tailoring", uiOrder = 9, skillLineCurrentLevel = 300, skillLineMaxLevel = 300 },
		[101] = { categoryID = 101, name = "Cloth", uiOrder = 2, parentCategoryID = 1000 },
		[102] = { categoryID = 102, name = "Bags", uiOrder = 1, parentCategoryID = 1001 },
	}
	W.guids["Player-1-TIR"] = { class = "MAGE", name = "Tiers", realm = "" }
	W.linkData["trade:Player-1-TIR:3908:197"] = { linkedName = "Tiers", prof = { professionName = "Tailoring", professionID = 197, skillLevel = 0, maxSkillLevel = 0 }, recipes = {
		{ id = 600001, name = "Weavercloth Bolt", item = 600101, cat = 101 },
		{ id = 600002, name = "Mooncloth Bag", item = 600102, cat = 102 },
		{ id = 600003, name = "Unknown Thing", item = 600103, cat = 101, learned = false },
	} }
	W.autoWorks = true
	Say("CHAT_MSG_CHANNEL", TradeLink("Player-1-TIR", 3908, 197, "Tailoring"), "Tiers-TestRealm", "Player-1-TIR", "Trade - City")
	Advance(8)
	W.autoWorks = false
	local p = LI.crafters["Tiers-TestRealm"].profs.tailoring
	check(p.tiers and #p.tiers == 2 and p.tiers[1].n == "Khaz Algar Tailoring" and p.tiers[1].c == 87 and p.tiers[2].n == "Classic Tailoring" and p.tiers[2].c == 300, "skill is recorded for every expansion the crafter knows recipes in", p.tiers and #p.tiers)
	check(p.rank == 87 and p.max == 100 and p.tier == "Khaz Algar Tailoring", "with the newest expansion shown as their skill", tostring(p.rank) .. " " .. tostring(p.tier))
	local book = LI.Book.Recipes("Tiers-TestRealm", "tailoring", "")
	check(#book == 2 and book[1].catName == "Khaz Algar Tailoring: Cloth" and book[2].catName == "Classic Tailoring: Bags", "the recipe book is grouped by expansion, newest first", book[1] and book[1].catName)
	local c = LI.Crafter("Old Hand-TestRealm", true)
	c.profs.tailoring = { name = "Tailoring", rank = 300, max = 300, recipes = LI.PackRecipes("tailoring", { [600002] = true }), count = 1 }
	local maxed = {}
	for _, r in ipairs(LI.Search("", { profs = {}, maxOnly = true })) do maxed[#maxed + 1] = r.key end
	table.sort(maxed)
	check(table.concat(maxed, ",") == "Old Hand-TestRealm", "max skill means at the cap of their own expansion", table.concat(maxed, ","))
	c.profs.tailoring.rank = 100
	local none = LI.Search("", { profs = {}, maxOnly = true })
	check(#none == 0, "and someone below their cap isn't counted", #none)
	W.categories = nil
end

do
	RetailSetup()
	W.playerGUID = "Player-1-ME"
	Boot()
	Advance(5)
	local ids, names = {}, {}
	for i = 1, 1500 do
		ids[i] = { id = 500000 + i * 3 }
		names[500000 + i * 3] = "Shared Recipe " .. i
	end
	W.spellNames = names
	local p = { rank = 90, max = 100, recipes = {} }
	for _, r in ipairs(ids) do p.recipes[r.id] = true end
	local payload = LI.Sync.Encode({ tailoring = p })
	local nameCalls, worst = 0, 0
	local getName = C_Spell.GetSpellName
	C_Spell.GetSpellName = function(id)
		nameCalls = nameCalls + 1
		return getName(id)
	end
	local after = C_Timer.After
	C_Timer.After = function(sec, fn)
		after(sec, function()
			local before = nameCalls
			fn()
			worst = math.max(worst, nameCalls - before)
		end)
	end
	local chunks = math.ceil(#payload / 200)
	local B36 = LI.Sync.B36
	for i = 1, chunks do
		Fire("CHAT_MSG_ADDON", "LinkedInn", string.format("D1|abc|%s|%s|%s", B36(i), B36(chunks), payload:sub((i - 1) * 200 + 1, i * 200)), "WHISPER", "Sharer-TestRealm")
	end
	local sharer = LI.crafters["Sharer-TestRealm"]
	check(sharer and sharer.profs.tailoring and sharer.profs.tailoring.count == 1500, "a shared list of 1500 recipes is saved at once", sharer and sharer.profs.tailoring and sharer.profs.tailoring.count)
	check(nameCalls == 0, "without looking up a single recipe in the same frame", nameCalls)
	Advance(5)
	C_Timer.After = after
	C_Spell.GetSpellName = getName
	check(LI.db.recipes[500003] and LI.db.recipes[500003].n == "Shared Recipe 1" and LI.db.recipes[504500].n == "Shared Recipe 1500", "the recipe names fill in over the next moments")
	check(worst <= 70, "a few dozen lookups at a time", worst)
	check(#LI.Search("shared recipe 77", { profs = {} }) == 1, "and searching finds them")
end

do
	RetailSetup()
	W.connected = { "Zuljin", "Area 52", "Dunemaul" }
	W.realm = "Dunemaul"
	Boot()
	Advance(1)
	local c = LI.Crafter("Shared Smith-Zuljin", true)
	c.profs.blacksmithing = { name = "Blacksmithing", rank = 50, max = 100, recipes = LI.PackRecipes("blacksmithing", { [700001] = true }), count = 1 }
	local saved = Logout()
	W.realm = "Zuljin"
	Boot(saved)
	Advance(1)
	check(LI.realm == "Area52" and LI.crafters["Shared Smith-Zuljin"], "alts on connected realms share one list")
	W.connected = {}
	local c2 = LI.Crafter("Lonely Smith-Zuljin", true)
	saved = Logout()
	Boot(saved)
	Advance(1)
	LI.Crafter("Early Bird-Zuljin", true).profs.alchemy = { name = "Alchemy", rank = 10 }
	check(LI.realm == "Zuljin", "if the connected realm list isn't ready, the realm's own list is used")
	saved = Logout()
	W.connected = { "Zuljin", "Area 52", "Dunemaul" }
	Boot(saved)
	Advance(1)
	check(LI.realm == "Area52" and LI.crafters["Early Bird-Zuljin"] and LI.crafters["Shared Smith-Zuljin"], "and it's merged into the shared list next time, losing nothing")
	check(LI.db.realms.Zuljin == nil, "without leaving a stray copy behind")
	W.connected, W.realm = nil, nil
end

do
	RetailSetup()
	Boot()
	Advance(1)
	LI.UI.Open()
	check(LinkedInnFrame.secondaryToggle.text.__text == "Cooking", "the secondary button simply says Cooking", LinkedInnFrame.secondaryToggle.text.__text)
	LinkedInnFrame:Hide()
end

print(string.format("\n%d passed, %d failed, %d errors", pass, fail, #W.errors))
FAILURES = fail + #W.errors
