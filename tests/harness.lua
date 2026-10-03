ADDON_NAME = "LinkedInn"

local FILES, TOC_VERSION = {}, nil
for line in (TOC_SOURCE .. "\n"):gmatch("(.-)\r?\n") do
	if line:match("^## Version:") then
		TOC_VERSION = line:match("^## Version:%s*(.-)%s*$")
	elseif line:match("%.lua$") and not line:match("^#") then
		FILES[#FILES + 1] = line
	end
end

local pass, fail = 0, 0
local function check(cond, name, extra)
	if cond then
		pass = pass + 1
	else
		fail = fail + 1
		print("FAIL: " .. name .. (extra and ("  [" .. tostring(extra) .. "]") or ""))
	end
end

unpack = table.unpack
math.atan2 = math.atan2 or function(y, x) return math.atan(y, x) end

local W

local Mock = {}
local function NewMock(kind, name)
	return setmetatable({ __scripts = {}, __shown = true, __kind = kind, __name = name }, Mock)
end

local methods = {}
Mock.__index = function(t, k)
	if methods[k] then return methods[k] end
	if type(k) == "string" and k:match("^[A-Z]") then
		local child = NewMock("auto", k)
		rawset(t, k, child)
		return child
	end
	return nil
end
Mock.__call = function() return nil end

function methods:SetScript(k, fn) self.__scripts[k] = fn end
function methods:GetScript(k) return self.__scripts[k] end
function methods:RegisterEvent(ev)
	W.events[ev] = W.events[ev] or {}
	table.insert(W.events[ev], self)
end
function methods:Show()
	if not self.__shown then
		self.__shown = true
		if self.__scripts.OnShow then self.__scripts.OnShow(self) end
	end
end
function methods:Hide()
	if self.__shown then
		self.__shown = false
		if self.__scripts.OnHide then self.__scripts.OnHide(self) end
	end
end
function methods:SetShown(v) if v then self:Show() else self:Hide() end end
function methods:IsShown() return self.__shown end
function methods:SetText(t) self.__text = t end
function methods:GetText() return self.__text end
function methods:SetChecked(v) self.__checked = v end
function methods:GetChecked() return self.__checked end
function methods:SetID(i) self.__id = i end
function methods:GetID() return self.__id or 0 end
function methods:GetWidth() return 140 end
function methods:GetCenter() return 100, 100 end
function methods:GetEffectiveScale() return 1 end
function methods:GetFrameLevel() return 1 end
function methods:CreateTexture() return NewMock("Texture") end
function methods:CreateFontString() return NewMock("FontString") end
function methods:CreateMaskTexture() return NewMock("MaskTexture") end
function methods:GetParent() return self.__parent end
function methods:SetTexture(t) self.__texture = t end
function methods:SetDataProvider(dp)
	local view = self.__view
	self.__rows = {}
	for _, elem in ipairs(dp.list) do
		local row = NewMock("row")
		view.__init(row, elem)
		self.__rows[#self.__rows + 1] = row
	end
	self.__count = #dp.list
end
function methods:SetElementInitializer(_, fn) self.__init = fn end
function methods:HookScript(k, fn)
	local old = self.__scripts[k]
	self.__scripts[k] = function(...)
		if old then old(...) end
		fn(...)
	end
end
function methods:SetAlpha(a) self.__alpha = a end
function methods:GetAlpha() return self.__alpha or 1 end
function methods:SetHyperlink(link)
	table.insert(W.hyperlinks, link)
	if W.autoWorks then
		local data = W.linkData[link]
		C_Timer.After(1, function()
			if data then
				W.trade = { linked = true, linkedName = data.linkedName, prof = data.prof, recipes = data.recipes }
				W.Fire("TRADE_SKILL_SHOW")
				if ProfessionsFrame then ProfessionsFrame:Show() end
				W.Fire("TRADE_SKILL_LIST_UPDATE")
			elseif W.showEmpty and ProfessionsFrame then
				ProfessionsFrame:Show()
			end
		end)
	end
end

local function Fire(event, ...)
	for _, frame in ipairs(W.events[event] or {}) do
		local fn = frame.__scripts.OnEvent
		if fn then fn(frame, event, ...) end
	end
end

local function Advance(seconds)
	local target = W.clock + seconds
	while true do
		table.sort(W.timers, function(a, b) return a.at < b.at end)
		local t = W.timers[1]
		if not t or t.at > target then break end
		table.remove(W.timers, 1)
		W.clock = t.at
		t.fn()
		if t.every then
			t.at = W.clock + t.every
			table.insert(W.timers, t)
		end
	end
	W.clock = target
end

local BASE_TIME = 1790700000

local function InstallStubs()
	W.events, W.timers, W.errors, W.chat = {}, {}, {}, {}
	W.hyperlinks, W.tells, W.closed = {}, {}, 0
	W.guids = W.guids or {}
	W.linkData = W.linkData or {}
	W.items = W.items or {}
	W.guild = W.guild or {}
	W.Fire = Fire

	_G.time = function() return BASE_TIME + math.floor(W.clock) end
	_G.date = os.date
	_G.GetTime = function() return W.clock end
	_G.geterrorhandler = function() return function(e) table.insert(W.errors, tostring(e)); print("ERROR: " .. tostring(e)) end end
	_G.CreateFrame = function(kind, name, parent)
		local m = NewMock(kind, name)
		m.__parent = parent
		if name then _G[name] = m end
		return m
	end
	_G.C_Timer = {
		After = function(sec, fn) table.insert(W.timers, { at = W.clock + sec, fn = fn }) end,
		NewTicker = function(sec, fn) table.insert(W.timers, { at = W.clock + sec, fn = fn, every = sec }) end,
	}
	_G.UIParent = NewMock("Frame", "UIParent")
	_G.WorldFrame = NewMock("Frame", "WorldFrame")
	_G.Minimap = NewMock("Frame", "Minimap")
	_G.GameTooltip = NewMock("GameTooltip", "GameTooltip")
	_G.DEFAULT_CHAT_FRAME = { AddMessage = function(_, msg) table.insert(W.chat, msg) end }
	_G.UISpecialFrames = {}
	_G.tinsert = table.insert
	_G.SlashCmdList = {}
	_G.PlaySound = function() end
	_G.SOUNDKIT = { IG_CHARACTER_INFO_OPEN = 2, IG_CHARACTER_INFO_CLOSE = 3, IG_CHARACTER_INFO_TAB = 4, IG_MAINMENU_OPTION_CHECKBOX_ON = 5 }
	_G.UnitName = function(u)
		if u == "player" then return W.name or "Tester", W.surname end
		local unit = W.units and W.units[u]
		if unit then return unit.name, unit.surname end
		return nil
	end
	_G.UnitIsPlayer = function(u) return u == "player" or (W.units and W.units[u] and not W.units[u].npc) or false end
	_G.GetRealZoneText = function() return W.zone or "Stormwind City" end
	_G.UnitClass = function() return "Mage", "MAGE" end
	_G.C_AddOns = { GetAddOnMetadata = function(addon, field) if addon == ADDON_NAME and field == "Version" then return TOC_VERSION end end }
	_G.GetRealmName = function() return "Test Realm" end
	_G.GetNormalizedRealmName = function() return "TestRealm" end
	_G.MenuUtil = { CreateContextMenu = function(owner, gen)
		local root = { entries = {} }
		local function add(self, text, a, b) table.insert(self.entries, { text = text, a = a, b = b }) end
		root.CreateRadio, root.CreateCheckbox, root.CreateButton, root.CreateTitle = add, add, add, add
		gen(owner, root)
		W.lastMenu = root
	end }
	_G.PanelTemplates_SetNumTabs = function() end
	_G.PanelTemplates_SetTab = function(frame, i) frame.selectedTab = i end
	_G.CreateScrollBoxListLinearView = function() return NewMock("view") end
	_G.ScrollUtil = { InitScrollBoxListWithScrollBar = function(box, bar, view) box.__view = view end }
	_G.CreateDataProvider = function(list) return { list = list } end
	_G.issecretvalue = function(v) return type(v) == "table" and v.__secret == true end
	_G.InCombatLockdown = function() return W.combat == true end
	_G.hooksecurefunc = function(name, fn)
		local orig = _G[name]
		_G[name] = function(...)
			local r = { orig(...) }
			fn(...)
			return table.unpack(r)
		end
	end
	_G.SetItemRef = function(link)
		W.itemRefs = (W.itemRefs or 0) + 1
		if W.clickWorks then
			local data = W.linkData[link]
			if data then
				C_Timer.After(0.5, function()
					W.trade = { linked = true, linkedName = data.linkedName, prof = data.prof, recipes = data.recipes }
					Fire("TRADE_SKILL_SHOW")
					Fire("TRADE_SKILL_LIST_UPDATE")
				end)
			end
		end
	end
	_G.GetPlayerInfoByGUID = function(guid)
		local g = W.guids[guid]
		if not g then return nil end
		return g.class, g.class, "Human", "Human", 2, g.name, g.realm
	end
	_G.C_Spell = {
		GetSpellTexture = function(id) return 100000 + id end,
		GetSpellName = function(id) return W.spellNames and W.spellNames[id] or nil end,
	}
	W.sent = {}
	W.channels = W.channels or {}
	_G.NUM_CHAT_WINDOWS = 10
	_G.C_ChatInfo = {
		RegisterAddonMessagePrefix = function(prefix) W.prefix = prefix return true end,
		SendAddonMessage = function(prefix, msg, chatType, target)
			assert(#msg <= 255, "addon message too long: " .. #msg)
			table.insert(W.sent, { prefix = prefix, msg = msg, chatType = chatType, target = target, at = W.clock })
			return 0
		end,
		InChatMessagingLockdown = function() return W.lockdown == true end,
	}
	_G.JoinTemporaryChannel = function(name) if not W.noJoin then W.channels[name] = 5 end end
	_G.GetChannelName = function(name) local id = W.channels[name] if id then return id, name end return 0, nil end
	_G.RemoveChatWindowChannel = function(i, name) W.hidden = (W.hidden or 0) + 1 end
	_G.IsInInstance = function() return W.inInstance == true end
	_G.GetProfessions = function()
		local list = {}
		for i = 1, #(W.profs or {}) do list[i] = i end
		return list[1], list[2], list[3], list[4], list[5], list[6]
	end
	_G.GetProfessionInfo = function(i)
		local p = W.profs[i]
		return p.name, p.icon or 777, p.rank, p.max
	end
	_G.C_Item = { GetItemInfoInstant = function(id)
		local classID = W.items[id]
		return id, "x", "y", "", 1, classID, 0
	end }
	_G.C_ClassColor = { GetClassColor = function(c) return { r = 0.5, g = 0.5, b = 1, class = c } end }
	_G.ChatFrameUtil = { SendTell = function(name) table.insert(W.tells, name) end }
	_G.IsInGuild = function() return #W.guild > 0 end
	_G.GetNumGuildMembers = function() return #W.guild end
	_G.GetGuildRosterInfo = function(i)
		local g = W.guild[i]
		return g.name, "", 0, 60, "", "", "", "", g.online
	end
	_G.C_GuildInfo = { GuildRoster = function() W.rosterRequests = (W.rosterRequests or 0) + 1 end }
	W.who = W.who or {}
	_G.C_FriendList = {
		GetNumFriends = function() return 0 end,
		GetFriendInfoByIndex = function() return nil end,
		ShowFriends = function() end,
		SendWho = function(filter, origin) table.insert(W.who, { filter = filter, origin = origin }) end,
		GetNumWhoResults = function() return #(W.whoResults or {}) end,
		GetWhoInfo = function(i) return W.whoResults[i] end,
	}
	_G.C_NameUtil = { ReplaceSurnameSeparatorWithLinkSeparator = function(name) return (name:gsub(" ", "+")) end }
	_G.WHO_TAG_EXACT = "x-"
	_G.WHO_NUM_RESULTS = "%d |4player:players; total"
	_G.Enum = { SocialWhoOrigin = { Item = 3 } }
	_G.GetNumGroupMembers = function() return 0 end
	_G.ERR_CHAT_PLAYER_NOT_FOUND_S = "No player named '%s' is currently playing."
	_G.C_TradeSkillUI = {
		GetBaseProfessionInfo = function()
			if not W.trade then return nil end
			return W.trade.prof
		end,
		IsTradeSkillLinked = function()
			if not W.trade then return false end
			return W.trade.linked, W.trade.linkedName
		end,
		IsTradeSkillGuild = function() return false end,
		IsNPCCrafting = function() return false end,
		GetFilteredRecipeIDs = function()
			local ids = {}
			for _, r in ipairs(W.trade and W.trade.recipes or {}) do ids[#ids + 1] = r.id end
			return ids
		end,
		GetRecipeInfo = function(id)
			for _, r in ipairs(W.trade and W.trade.recipes or {}) do
				if r.id == id then return { recipeID = id, name = r.name, learned = r.learned ~= false, icon = 5000 + id } end
			end
		end,
		GetRecipeOutputItemData = function(id)
			if W.recipeItems and W.recipeItems[id] then return { icon = 7000 + id, itemID = W.recipeItems[id] } end
			for _, r in ipairs(W.trade and W.trade.recipes or {}) do
				if r.id == id then return { icon = 7000 + id, itemID = r.item } end
			end
			return { icon = 1 }
		end,
		GetTradeSkillTexture = function(id) return 9000 + id end,
		GetTradeSkillListLink = function()
			if W.trade and not W.trade.linked then return "|cffffd000|Htrade:Player-1-ME:2259:171|h[Alchemy]|h|r" end
		end,
		CloseTradeSkill = function()
			W.closed = W.closed + 1
			W.trade = nil
			Fire("TRADE_SKILL_CLOSE")
			if ProfessionsFrame then ProfessionsFrame:Hide() end
		end,
	}
end

local function WriteLua(v, out, path)
	local t = type(v)
	if t == "table" then
		if getmetatable(v) then error("metatable (frame?) in saved data at " .. path) end
		out[#out + 1] = "{"
		for k, val in pairs(v) do
			out[#out + 1] = "["
			WriteLua(k, out, path)
			out[#out + 1] = "]="
			WriteLua(val, out, path .. "." .. tostring(k))
			out[#out + 1] = ","
		end
		out[#out + 1] = "}"
	elseif t == "number" then
		out[#out + 1] = (math.type(v) == "integer") and tostring(v) or string.format("%.17g", v)
	elseif t == "string" then
		out[#out + 1] = string.format("%q", v)
	elseif t == "boolean" then
		out[#out + 1] = tostring(v)
	else
		error("unsavable " .. t .. " at " .. path)
	end
end

local function SaveVars()
	local out = {}
	WriteLua(LinkedInnDB, out, "LinkedInnDB")
	return table.concat(out)
end

local LI

local function Boot(saved)
	W = W or { clock = 0 }
	InstallStubs()
	LinkedInnDB = saved and load("return " .. saved)() or nil
	LI = {}
	for _, file in ipairs(FILES) do
		local chunk = assert(loadfile(ADDON_DIR .. "/" .. file))
		chunk(ADDON_NAME, LI)
	end
	Fire("ADDON_LOADED", ADDON_NAME)
	Fire("PLAYER_LOGIN")
	Advance(0.1)
	return LI
end

local function Logout()
	Fire("PLAYER_LOGOUT")
	return SaveVars()
end

local TAILORING = { professionName = "Tailoring", professionID = 197, skillLevel = 260, maxSkillLevel = 300 }
local ALCHEMY = { professionName = "Alchemy", professionID = 171, skillLevel = 150, maxSkillLevel = 225 }
local TAILOR_RECIPES = {
	{ id = 18560, name = "Mooncloth Bag", item = 14155 },
	{ id = 3914, name = "Brown Linen Pants", item = 4343 },
	{ id = 3915, name = "Brown Linen Shirt", item = 4344, learned = false },
}
local ALCHEMY_RECIPES = {
	{ id = 2330, name = "Minor Healing Potion", item = 118 },
}

local function TradeLink(guid, spell, line, text)
	return string.format("|cffffd000|Htrade:%s:%d:%d|h[%s]|h|r", guid, spell, line, text)
end

local function Say(event, msg, sender, senderGUID, channelBase)
	Fire(event, msg, sender, "", "", "", "", 0, 0, channelBase or "", 0, 1, senderGUID)
end

local function Setup()
	W = {
		clock = 0,
		name = "Brew",
		surname = "Master",
		items = { [14155] = 1, [4343] = 4, [118] = 0 },
		guids = {
			["Player-1-AAA"] = { class = "PRIEST", name = "Anna Smith", realm = "" },
			["Player-1-BBB"] = { class = "WARRIOR", name = "Bob Stone", realm = "" },
			["Player-1-CCC"] = { class = "ROGUE", name = "Cora Vale", realm = "" },
		},
		linkData = {
			["trade:Player-1-AAA:3908:197"] = { linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES },
			["trade:Player-1-BBB:3908:197"] = { linkedName = "Bob Stone", prof = TAILORING, recipes = { TAILOR_RECIPES[2] } },
			["trade:Player-1-CCC:2259:171"] = { linkedName = "Cora Vale", prof = ALCHEMY, recipes = ALCHEMY_RECIPES },
		},
	}
end

Setup()
Boot()
check(LI.ready and LI.playerKey == "Brew Master-TestRealm" or LI.playerKey == "Brew-Master-TestRealm", "player key has the surname", LI.playerKey)
check(LI.settings.autoRead == true, "automatic reading is on by default")
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
check(LI.Reader.QueueSize() == 0, "the queue is empty after reading")
W.trade = { linked = true, linkedName = "Anna Smith", prof = TAILORING, recipes = TAILOR_RECIPES }
Fire("TRADE_SKILL_SHOW")
Fire("TRADE_SKILL_LIST_UPDATE")
Advance(1)
check(LI.test.click == 0 and LI.test.auto.ok == 1, "a late update from an automatic read is not counted as a click", LI.test.click)
C_TradeSkillUI.CloseTradeSkill()
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

local results = LI.Search("mooncloth")
check(#results == 2, "searching an item finds the crafter who can make it and a tailor who might", #results)
check(results[1].key == "Bob Stone-TestRealm" and results[1].status == "online" and results[1].confidence == 1, "online crafters come first even when unsure", results[1] and results[1].key)
check(results[2].key == "Anna Smith-TestRealm" and results[2].recipeMeta and results[2].recipeMeta.n == "Mooncloth Bag", "the matching recipe is attached", results[2] and results[2].key)
check(results[2].status == "recent", "someone seen in chat a moment ago counts as recently active", results[2].status)

results = LI.Search("", { kind = "bag" })
check(#results == 2 and results[2].makes == 1, "the item type filter works without a search")
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
check(bobRow.line.__text == "Skill 260  ·  recipes not read yet" or bobRow.line.__text == "recipes not read yet", "a row describes that profession", bobRow.line.__text)
check(rows[5].line.__text == "Skill 260  ·  2 recipes", "skill and recipe count are shown", rows[5].line.__text)
bobRow.__scripts.OnClick(bobRow, "LeftButton")
check(W.tells[1] == "Bob Stone", "clicking a row whispers the crafter by name without the realm", W.tells[1])
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

local coraRow = main.list.__rows[2]
check(coraRow.entry.key == "Cora Vale-TestRealm", "found Cora's row", coraRow.entry.key)
check(coraRow.pill:IsShown(), "each row has a last seen pill")
check(#coraRow.pill.text.__text <= 4, "last seen is shown short", coraRow.pill.text.__text)
check(LI.Status("Cora Vale-TestRealm") ~= "online", "Cora starts out not online")
coraRow.pill.__scripts.OnClick(coraRow.pill)
check(main.list.__rows[2].pill.text.__text == "...", "clicking the pill starts a check and shows dots", main.list.__rows[2].pill.text.__text)
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
check(main.list.__rows[2].pill.text.__text == "online", "a confirmed online crafter's pill says online", main.list.__rows[2].pill.text.__text)

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

LI.SetRecipes("Dan Cook-TestRealm", { name = "Cooking", rank = 225 }, { { id = 818, name = "Spiced Wolf Meat", item = 2680 } }, "click")
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob", "secondary professions are hidden by default", Shape())
check(not Chip("cooking"), "and have no filter by default")
main.secondaryBox:SetChecked(true)
main.secondaryBox.__scripts.OnClick(main.secondaryBox)
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob #cooking Dan", "the secondary checkbox shows them", Shape())
check(Chips() == "alchemy,blacksmithing,enchanting,engineering,leatherworking,tailoring,cooking,first aid,fishing", "and adds their filters", Chips())
Chip("cooking").__scripts.OnClick(Chip("cooking"))
Advance(1)
check(Shape() == "#cooking Dan", "secondary filters work like the others", Shape())
main.secondaryBox:SetChecked(false)
main.secondaryBox.__scripts.OnClick(main.secondaryBox)
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
check(Shape() == "#tailoring Anna Bob", "typing in the search box filters the list, sure matches first among online crafters", Shape())
local annaRow = main.list.__rows[2]
local annaBook = annaRow.books and annaRow.books[1]
check(annaBook and annaBook:IsShown() and annaBook.key == "tailoring", "each row shows a button per profession")
check(annaBook and annaBook.match and annaBook.glow:IsShown(), "the profession that matches the search is highlighted")
check(annaBook and annaBook.rank.__text == "260", "the profession button shows the skill level", annaBook and annaBook.rank.__text)
local refs = W.itemRefs or 0
local whispers = #W.tells
annaBook.__scripts.OnClick(annaBook)
check((W.itemRefs or 0) == refs + 1 and #W.tells == whispers, "clicking a profession button opens it without whispering")
check(annaRow.line.__text and annaRow.line.__text:find("Can make Mooncloth Bag", 1, true), "the row says what the crafter can make", annaRow.line.__text)
main.search:SetText("")
main.search.__scripts.OnTextChanged(main.search)
Advance(1)
SlashCmdList.LINKEDINN("test")
check(main.selectedTab == 2 and main.testPage:IsShown() and not main.findPage:IsShown(), "/li test opens the test tab")
check(main.testPage.head.__text == "Chat alone is enough", "one clean automatic read gives the good verdict", main.testPage.head.__text)
check(#W.errors == uiErrors, "the window builds without errors", W.errors[uiErrors + 1])

local saved = Logout()
Boot(saved)
check(LI.crafters["Anna Smith-TestRealm"] and LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes[18560], "crafters and recipes survive a reload")
check(LI.test.auto.ok == 1 and LI.test.click == 3, "test results survive a reload", LI.test.click)
check(LI.guids["Player-1-CCC"] == "Cora Vale-TestRealm", "the GUID index is rebuilt after a reload")
check(LI.IsFavorite("Cora Vale-TestRealm"), "favorites survive a reload")
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
Advance(200)
check(LI.test.auto.tries == 5 and LI.test.auto.timeout == 5, "reading stops after five links get no reply", LI.test.auto.tries)
check(LI.Reader.IsBroken(), "the reader reports that automatic reading doesn't work")
Advance(200)
check(LI.test.auto.tries == 5, "no more tries once it gave up")
LI.UI.Open(LI.UI.TAB.test)
check(LinkedInnFrame.testPage.head.__text == "Links need a click", "the test page says links need a click", LinkedInnFrame.testPage.head.__text)
check(LinkedInnFrame.testPage.retry:IsShown(), "a retry button appears")
LI.Reader.Retry()
W.autoWorks = true
W.linkData["trade:Player-2-1:3908:197"] = { linkedName = "Mage1 Test", prof = TAILORING, recipes = TAILOR_RECIPES }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-1", 3908, 197, "Tailoring"), "Mage1 Test-TestRealm", "Player-2-1", "Trade - City")
Advance(12)
check(LI.test.auto.ok == 1, "retrying reads again", LI.test.auto.ok)
LI.UI.Refresh()
check(LinkedInnFrame.testPage.head.__text == "Chat alone is enough", "a later success changes the verdict")

local loads = 0
_G.ProfessionsFrame_LoadUI = function()
	loads = loads + 1
	ProfessionsFrame = NewMock("Frame", "ProfessionsFrame")
	ProfessionsFrame:Hide()
	Fire("ADDON_LOADED", "Blizzard_Professions")
	return true
end
local alphas = {}
W.linkData["trade:Player-2-2:3908:197"] = { linkedName = "Mage2 Test", prof = TAILORING, recipes = TAILOR_RECIPES }
Say("CHAT_MSG_CHANNEL", TradeLink("Player-2-2", 3908, 197, "Tailoring"), "Mage2 Test-TestRealm", "Player-2-2", "Trade - City")
for _ = 1, 30 do
	Advance(1)
	if ProfessionsFrame and ProfessionsFrame:IsShown() then alphas[#alphas + 1] = ProfessionsFrame:GetAlpha() end
end
check(loads == 1, "the professions window is loaded before the first automatic read", loads)
check(#alphas == 0 or math.max(table.unpack(alphas)) == 0, "the profession window stays invisible during automatic reads", alphas[1])
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
Advance(5)
check(not Sync.IsJoined(), "the hidden channel waits a moment after login")
Advance(10)
check(Sync.IsJoined() and W.hidden == 10, "it joins the hidden channel and keeps it out of every chat window", W.hidden)
check(#Sent("H1") == 0, "no hello right away")
Advance(35)
local hellos = Sent("H1", "CHANNEL")
check(#hellos == 1 and hellos[1].target == "5", "a hello goes to the hidden channel", #hellos)
local hello = hellos[1] and hellos[1].msg or ""
check(hello:find("tailoring~", 1, true) and not hello:find("mining", 1, true) and hello:find("|MAGE|", 1, true), "the hello lists crafting professions and class", hello)
Addon(hello, "Brew Master-TestRealm")
check(LI.test.sync.echo == true, "hearing your own hello proves the channel works")
Advance(13 * 60 + 200)
check(#Sent("H1") == 2, "hellos repeat every 12 to 15 minutes", #Sent("H1"))

W.trade = { linked = false, prof = TAILORING, recipes = TAILOR_RECIPES }
Fire("TRADE_SKILL_SHOW")
Advance(1)
C_TradeSkillUI.CloseTradeSkill()
Advance(12)
check(#Sent("H1") == 3, "learning recipes sends a hello soon", #Sent("H1"))
local newHello = Sent("H1")[3].msg
check(newHello:find("tailoring~78~8c~2", 1, true), "the new hello counts your recipes", newHello)
local ver = newHello:match("^H1|([^|]+)|")

Addon("Q1|" .. ver, "Other Person-TestRealm", "WHISPER")
Advance(1)
check(#Sent("D1") == 0, "answers wait a few seconds to gather requests")
Addon("Q1|" .. ver, "Third Guy-TestRealm", "WHISPER")
Advance(5)
local data = Sent("D1", "CHANNEL")
check(#data >= 1 and LI.test.sync.answered == 1, "two requests are answered with one broadcast", #data)
local chunks = {}
for _, m in ipairs(data) do chunks[#chunks + 1] = m.msg end
Addon("Q1|" .. ver, "Fourth Gal-TestRealm", "WHISPER")
Advance(30)
check(LI.test.sync.answered == 1, "answers are spaced at least a minute apart")
Advance(40)
check(LI.test.sync.answered == 2, "a later request is still answered", LI.test.sync.answered)

local sentBefore = #W.sent
W.combat = true
Addon("Q1|" .. ver, "Fifth One-TestRealm", "WHISPER")
Advance(90)
local inCombat = #W.sent
W.combat = false
Advance(5)
check(inCombat == sentBefore and #W.sent > inCombat, "nothing is sent in combat, it waits", inCombat - sentBefore)
LI.settings.share = false
Advance(20 * 60)
check(#Sent("H1") == 3, "no hellos when sharing is off", #Sent("H1"))
local answered = LI.test.sync.answered
Addon("Q1|" .. ver, "Sixth Man-TestRealm", "WHISPER")
Advance(90)
check(LI.test.sync.answered == answered, "no answers when sharing is off")
LI.settings.share = true

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
Addon(newHello, "Brew Master-TestRealm")
Advance(130)
check(#Sent("Q1") == 1, "a hello with a version you have asks nothing")
for i = #chunks, 1, -1 do
	Addon(chunks[i], "Brew Master-TestRealm")
end
check(LI.test.sync.lists == 1, "a list you already have is not applied again", LI.test.sync.lists)
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
check(sv[1].__text == "joined, waiting for an echo" and sv[3].__text == "3" and sv[4].__text == "1", "the test tab shows sharing", sv[1].__text .. " / " .. sv[3].__text)
check(#W.errors == errorsBefore, "sharing runs without errors", W.errors[errorsBefore + 1])

print(string.format("\n%d passed, %d failed, %d errors", pass, fail, #W.errors))
FAILURES = fail + #W.errors
