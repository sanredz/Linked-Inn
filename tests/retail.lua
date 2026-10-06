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
