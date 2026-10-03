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
function methods:SetEnabled(v) self.__disabled = not v end
function methods:SetSize(w, h) self.__w, self.__h = w, h end
function methods:SetNumber(n) self.__text = tostring(n) end
function methods:GetNumber() return tonumber(self.__text) or 0 end
function methods:GetFontString()
	if not self.__fs then self.__fs = NewMock("FontString") end
	return self.__fs
end
function methods:SetElementExtentCalculator(fn) self.__extent = fn end
function methods:IsEnabled() return not self.__disabled end
function methods:GetAlpha() return self.__alpha or 1 end
function methods:SetHyperlink(link)
	table.insert(W.hyperlinks, link)
	if W.autoWorks then
		local data = W.linkData[link]
		C_Timer.After(W.replyDelay or 0.2, function()
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
	_G.UnitGUID = function(u)
		if u == "player" then return W.playerGUID end
		return W.units and W.units[u] and W.units[u].guid or nil
	end
	_G.C_SpellBook = { GetSpellBookItemInfo = function(index) return W.spellbook and W.spellbook[index] and { spellID = W.spellbook[index] } or nil end }
	_G.UnitIsFriend = function(_, u) return not (W.units and W.units[u] and W.units[u].enemy) end
	W.cvars = W.cvars or {}
	_G.C_CVar = {
		GetCVarBool = function(name) return W.cvars[name] == "1" end,
		SetCVar = function(name, value) W.cvars[name] = value table.insert(W.cvarLog, name .. "=" .. value) end,
	}
	W.cvarLog = {}
	_G.C_NamePlate = { GetNamePlates = function()
		local out = {}
		for _, token in ipairs(W.plates or {}) do out[#out + 1] = { namePlateUnitToken = token } end
		return out
	end }
	_G.GetRealZoneText = function() return W.zone or "Stormwind City" end
	_G.UnitClass = function() return "Mage", "MAGE" end
	_G.C_AddOns = { GetAddOnMetadata = function(addon, field) if addon == ADDON_NAME and field == "Version" then return TOC_VERSION end end }
	_G.GetRealmName = function() return "Test Realm" end
	_G.GetNormalizedRealmName = function() return "TestRealm" end
	_G.MenuUtil = { CreateContextMenu = function(owner, gen)
		local function NewMenu()
			local m = { entries = {} }
			local function add(self, text, a, b)
				local entry = NewMenu()
				entry.text, entry.a, entry.b = text, a, b
				table.insert(self.entries, entry)
				return entry
			end
			m.CreateRadio, m.CreateCheckbox, m.CreateButton, m.CreateTitle = add, add, add, add
			return m
		end
		local root = NewMenu()
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
			if W.sendResult then
				local r = W.sendResult
				W.sendResult = nil
				return r
			end
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
		return p.name, p.icon or 777, p.rank, p.max, 0, p.offset, p.line
	end
	_G.C_Item = {
		GetItemInfoInstant = function(id)
			local classID = W.items[id]
			return id, "x", "y", "", 60000 + id, classID, 0
		end,
		GetItemInfo = function(id)
			if id == 14155 then return "Mooncloth Bag", "|cff0070dd|Hitem:14155::::::::60:::::|h[Mooncloth Bag]|h|r" end
			return nil
		end,
		GetItemQualityByID = function(id) return id == 14155 and 3 or 1 end,
		GetItemNameByID = function(id) return W.itemNames and W.itemNames[id] or nil end,
		RequestLoadItemDataByID = function() end,
	}
	_G.C_ClassColor = { GetClassColor = function(c) return { r = 0.5, g = 0.5, b = 1, class = c } end }
	W.editBox = { text = "", Insert = function(self, t) self.text = self.text .. t end }
	W.links = {}
	_G.ChatFrameUtil = {
		SendTell = function(name) table.insert(W.tells, name) W.editBox.text = "" W.typing = true end,
		GetActiveWindow = function() return W.typing and W.editBox or nil end,
		InsertLink = function(link) table.insert(W.links, link) return true end,
	}
	_G.IsShiftKeyDown = function() return W.shift == true end
	_G.IsInGuild = function() return #W.guild > 0 end
	_G.GetNumGuildMembers = function() return #W.guild end
	_G.GetGuildRosterInfo = function(i)
		local g = W.guild[i]
		return g.name, "", 0, 60, "", "", "", "", g.online
	end
	_G.C_GuildInfo = { GuildRoster = function() W.rosterRequests = (W.rosterRequests or 0) + 1 end }
	W.who = W.who or {}
	_G.C_FriendList = {
		GetNumFriends = function() return #(W.friends or {}) end,
		GetFriendInfoByIndex = function(i) return W.friends and W.friends[i] or nil end,
		ShowFriends = function() end,
		SendWho = function(filter, origin) table.insert(W.who, { filter = filter, origin = origin }) end,
		GetNumWhoResults = function() return #(W.whoResults or {}) end,
		GetWhoInfo = function(i) return W.whoResults[i] end,
	}
	_G.C_NameUtil = { ReplaceSurnameSeparatorWithLinkSeparator = function(name) return (name:gsub(" ", "+")) end }
	_G.WHO_TAG_EXACT = "x-"
	_G.WHO_NUM_RESULTS = "%d |4player:players; total"
	_G.Enum = { SocialWhoOrigin = { Item = 3 } }
	_G.GetNumGroupMembers = function() return W.groupSize or 0 end
	_G.IsInRaid = function() return false end
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
				if r.id == id then return { recipeID = id, name = r.name, learned = r.learned ~= false, icon = 5000 + id, categoryID = r.cat } end
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
		GetCategoryInfo = function(id)
			local cats = { [10] = { name = "Bags", uiOrder = 1 }, [11] = { name = "Armor", uiOrder = 2 } }
			local c = cats[id]
			return c and { categoryID = id, name = c.name, uiOrder = c.uiOrder } or nil
		end,
		GetRecipeSchematic = function(id)
			local reagents = W.schematics and W.schematics[id]
			if not reagents then return nil end
			local slots = {}
			for i, r in ipairs(reagents) do
				slots[i] = { reagents = { { itemID = r[1] } }, quantityRequired = r[2], reagentType = r[3] or 1, required = (r[3] or 1) == 1 }
			end
			return { recipeID = id, reagentSlotSchematics = slots }
		end,
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
	{ id = 18560, name = "Mooncloth Bag", item = 14155, cat = 10 },
	{ id = 3914, name = "Brown Linen Pants", item = 4343, cat = 11 },
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

local SCHEMATICS = {
	[18560] = { { 14342, 4 }, { 14256, 2 }, { 8343, 2 } },
	[3914] = { { 2996, 2 }, { 2320, 1 }, { 9999, 1, 0 } },
	[2330] = { { 2447, 1 }, { 765, 1 }, { 3371, 1 } },
}

local function Setup()
	W = {
		schematics = SCHEMATICS,
		itemNames = { [14342] = "Mooncloth", [14256] = "Felcloth", [2996] = "Bolt of Linen Cloth" },
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
check(LI.db.recipes[18560].c == 10 and LI.db.cats[10].n == "Bags" and LI.db.cats[10].o == 1, "recipes remember their category, named once in a shared table")
check(LI.db.recipes[18560].r == "14342:4;14256:2;8343:2", "reagents are stored once per recipe", LI.db.recipes[18560].r)
check(LI.db.recipes[3914].r == "2996:2;2320:1", "optional reagents are left out", LI.db.recipes[3914].r)
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
check(bobRow.line.__text == "Skill 260  ·  recipes not read yet" or bobRow.line.__text == "recipes not read yet", "a row describes that profession", bobRow.line.__text)
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
Advance(0.1)
check(LI.IsChecking("Anna Smith-TestRealm"), "opening your own profession during a check doesn't count as their reply")
C_TradeSkillUI.CloseTradeSkill()
Advance(3)
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
main.maxBox:SetChecked(true)
main.maxBox.__scripts.OnClick(main.maxBox)
Advance(1)
check(Shape() == "" and main.empty:IsShown(), "max skill hides crafters below the cap", Shape())
LI.crafters["Anna Smith-TestRealm"].profs.tailoring.rank = 300
LI.Fire("CraftersChanged")
Advance(1)
check(Shape() == "#tailoring Anna", "a crafter at the cap shows up", Shape())
LI.crafters["Anna Smith-TestRealm"].profs.tailoring.rank = 260
main.maxBox:SetChecked(false)
main.maxBox.__scripts.OnClick(main.maxBox)
Advance(1)
check(Shape() == "#alchemy Cora #tailoring Anna Bob", "unticking shows everyone again", Shape())
local extent = main.list.__view.__extent
check(extent(1, { entry = {} }) == 46 and extent(1, { header = true }) == 34, "normal rows are tall")
main.compactBox:SetChecked(true)
main.compactBox.__scripts.OnClick(main.compactBox)
Advance(1)
check(LI.settings.compact and extent(1, { entry = {} }) == 24 and extent(1, { header = true }) == 34, "compact rows are about half the height, headers stay")
local compactRow = main.list.__rows[2]
check(compactRow.compact and compactRow.icon.__w == 18 and compactRow.pill.__w == 44 and compactRow.books[1].__w == 18, "compact shrinks the icon, pill and profession buttons")
check(compactRow.line.__text == "Skill 150  ·  1 recipes" and compactRow.name:IsShown(), "skill and recipes sit next to the name", compactRow.line.__text)
check(not compactRow.books[1].rank:IsShown(), "compact hides the skill number on the buttons, it's in the text")
main.compactBox:SetChecked(false)
main.compactBox.__scripts.OnClick(main.compactBox)
Advance(1)
check(not main.list.__rows[2].compact and main.list.__rows[2].icon.__w == 30 and main.list.__rows[2].books[1].rank:IsShown(), "unticking brings the full rows back")

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

local saved = Logout()
Boot(saved)
check(LI.crafters["Anna Smith-TestRealm"] and LI.crafters["Anna Smith-TestRealm"].profs.tailoring.recipes[18560], "crafters and recipes survive a reload")
check(LI.test.auto.ok == 1 and LI.test.click == 3, "test results survive a reload", LI.test.click)
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
Advance(200)
check(LI.test.auto.tries == 5 and LI.test.auto.timeout == 5, "reading stops after five links get no reply", LI.test.auto.tries)
check(LI.Reader.IsBroken(), "the reader reports that automatic reading doesn't work")
local st, _, sure = LI.Status("Mage6 Test-TestRealm")
check(st == "offline" and sure == true, "a link that gets no reply marks its owner offline", st)
Advance(200)
check(LI.test.auto.tries == 5, "no more tries once it gave up")
LI.UI.Open(LI.UI.TAB.test)
check(LinkedInnFrame.testPage.head.__text == "Links need a click", "the test page says links need a click", LinkedInnFrame.testPage.head.__text)
check(LinkedInnFrame.testPage.retry:IsShown(), "a retry button appears")
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
	Advance(7)
	check(not LI.IsChecking("Anna Smith-TestRealm"), "a check never stays stuck on Checking")
	C_TradeSkillUI.CloseTradeSkill()
	Advance(3)
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

	W.units = {
		nameplate1 = { name = "Scan", surname = "One", guid = "Player-2-AAA" },
		nameplate2 = { name = "Scan", surname = "Two", guid = "Player-2-BBB" },
		nameplate3 = { name = "Enemy", surname = "Guy", guid = "Player-2-CCC", enemy = true },
		nameplate4 = { name = "Mob", surname = "", guid = "Creature-0", npc = true },
		target = { name = "Scan", surname = "One", guid = "Player-2-AAA" },
	}
	W.plates = { "nameplate1", "nameplate2", "nameplate3", "nameplate4" }
	LI.db.profLinks.alchemy = { spell = 2259, line = 171 }
	W.linkData["trade:Player-2-AAA:2259:171"] = { linkedName = "Scan One", prof = ALCHEMY, recipes = ALCHEMY_RECIPES }
	W.linkData["trade:Player-2-AAA:3908:197"] = { linkedName = "Scan One", prof = TAILORING, recipes = TAILOR_RECIPES }
	W.linkData["trade:Player-2-AAA:7411:333"] = { linkedName = "Scan One", prof = ENCH, recipes = { { id = 7418, name = "Enchant Bracer - Minor Health" } } }
	W.cvars.nameplateShowFriendlyPlayers = "0"
	LI.UI.Open()
	local main = LinkedInnFrame
	check(main.scan:IsEnabled(), "the scan button is ready")
	local chat0 = #W.chat
	check(LI.ScanNearby(), "a scan starts")
	check(W.cvars.nameplateShowFriendlyPlayers == "1", "friendly nameplates are turned on for a moment if they were off")
	Advance(0.5)
	check(W.cvars.nameplateShowFriendlyPlayers == "0", "and turned back off right after")
	local done, total = LI.Reader.ScanProgress()
	check(total == 6, "two friendly players times three known professions are asked; enemies, NPCs, duplicates are skipped", total)
	Advance(0.1)
	LI.UI.Refresh()
	check(main.scan.text.__text:find("^Scanning") and not main.scan:IsEnabled(), "the button shows progress", main.scan.text.__text)
	Advance(10)
	check(not LI.Reader.Scanning(), "the scan finishes")
	local one = LI.crafters["Scan One-TestRealm"]
	check(one and one.profs.alchemy and one.profs.enchanting and one.profs.enchanting.count == 1, "a scanned player gets their professions")
	local askedTailoring = false
	for _, h in ipairs(W.hyperlinks) do
		if h == "trade:Player-2-AAA:3908:197" then askedTailoring = true end
	end
	check(not askedTailoring and not one.profs.tailoring, "after two professions are found, nothing more is asked")
	check(not LI.crafters["Scan Two-TestRealm"] and not LI.crafters["Enemy Guy-TestRealm"], "players with no answer aren't added")
	check(W.chat[#W.chat]:find("Scan done: 1 crafter among 2 players nearby.", 1, true), "a one-line summary goes to chat", W.chat[#W.chat])
	local ready, why = LI.ScanReady()
	check(not ready and why == "cooldown" and not LI.ScanNearby(), "then the scan has a cooldown")
	LI.UI.Refresh()
	check(not main.scan:IsEnabled() and main.scan.text.__text == "Scan nearby", "the button waits out the cooldown")
	Advance(301)
	check(LI.ScanReady(), "and is ready again after five minutes")
	W.cvars.nameplateShowFriendlyPlayers = "1"
	local cvars = #W.cvarLog
	LI.ScanNearby()
	Advance(10)
	check(#W.cvarLog == cvars, "nameplates already on are left alone")
	check(LI.Reader.ScanProgress() == nil, "a second scan only asks the remaining unknowns and ends")
	main:Hide()
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
	Advance(10)
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
	Advance(2)
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
	SlashCmdList.LINKEDINN("ping")
	Advance(4)
	check(LI.test.sync.failed == 1 and LI.test.sync.lastError == "code 3 on CHANNEL", "a send the game refuses is counted with its code", LI.test.sync.lastError)
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
	check(whispered:find("CHANNEL@5", 1, true) and whispered:find("WHISPER@Buddy Pal", 1, true), "someone who asks gets your list by whisper too, not only on the channel", whispered)
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
	check(Find("B1|Near By-TestRealm|H1|abd", "WHISPER", "Far Away"), "a hello on your channel is passed to the other realm")
	W.sent = {}
	Addon("H1|abd|MAGE|tailoring~5~a~-|TestRealm|1", "Near By-TestRealm", "CHANNEL")
	Advance(4)
	check(not Find("B1|Near By", "WHISPER"), "the same message is passed on only once")
	Sync.Send("X1|abc", "CHANNEL")
	Advance(8)
	check(Find("B1|Brew Master-TestRealm|X1|abc", "WHISPER", "Far Away"), "your own work messages cross too")
	Addon("H1|abf|MAGE|tailoring~5~a~-|TestRealm|1|OtherRealm", "Aaa Bridge-TestRealm", "CHANNEL")
	Advance(6)
	W.sent = {}
	Sync.Send("X1|zz", "CHANNEL")
	Advance(8)
	check(not Find("B1|Brew Master-TestRealm|X1|zz", "WHISPER"), "only one user per realm passes messages on")
	local chat0 = #W.chat
	SlashCmdList.LINKEDINN("status")
	local report = table.concat({ table.unpack(W.chat, chat0 + 1) }, "\n")
	check(report:find("Realm: TestRealm", 1, true) and report:find("OtherRealm via Far Away", 1, true) and report:find("Aaa Bridge relays", 1, true) and report:find("Far Away (OtherRealm)", 1, true), "/li status shows realms and who relays", report)
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
	check(Find("H1", "WHISPER", "Stranger Danger") and not Find("H1", "WHISPER", "Other One") and not Find("H1", "WHISPER", "Local Guy"), "someone from an unlinked realm gets one quiet hello, at most every 45 seconds")
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
	check(Sync.Links().OtherRealm == "Third Guy-TestRealm", "a link that can't be whispered is dropped for another one", Sync.Links().OtherRealm)
	check(not Sync.HideNotFound(nil, "CHAT_MSG_SYSTEM", "No player named 'Someone Else' is currently playing."), "other 'no player named' lines are left alone")
	W.playerGUID = nil
end

do
	Setup()
	Boot()
	Advance(5)
	local sent0 = #W.sent
	SlashCmdList.LINKEDINN("toast")
	local toast = LI.WorkUI.Toaster()
	check(toast and toast:IsShown() and toast.head.__text == "Someone needs something you can make", "/li toast shows a sample request pop-up", toast and toast.head.__text)
	Advance(30)
	check(toast:IsShown() and toast.head.__text == "Someone needs something you can make", "and it stays up for a screenshot")
	toast.__scripts.OnClick(toast, "LeftButton")
	Advance(2)
	check(toast:IsShown() and toast.head.__text == "Someone can make it for you", "a click brings the offer pop-up", toast.head.__text)
	toast.__scripts.OnClick(toast, "LeftButton")
	Advance(2)
	check(toast.head.__text == "Request posted", "then the posted one", toast.head.__text)
	toast.__scripts.OnClick(toast, "LeftButton")
	Advance(2)
	check(not toast:IsShown() and #W.sent == sent0, "nothing is sent for the samples")
	SlashCmdList.LINKEDINN("toast offer")
	check(toast:IsShown() and toast.head.__text == "Someone can make it for you", "/li toast offer shows just that one")
	toast.__scripts.OnClick(toast, "LeftButton")
	Advance(2)
end

print(string.format("\n%d passed, %d failed, %d errors", pass, fail, #W.errors))
FAILURES = fail + #W.errors
