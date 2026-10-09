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

function methods:SetScript(k, fn)
	self.__scripts[k] = fn
	if k == "OnUpdate" then
		W.updaters = W.updaters or {}
		W.updaters[self] = fn and true or nil
	end
end
function methods:GetScript(k) return self.__scripts[k] end
function methods:RegisterEvent(ev)
	W.events[ev] = W.events[ev] or {}
	for _, f in ipairs(W.events[ev]) do
		if f == self then return end
	end
	table.insert(W.events[ev], self)
end
function methods:UnregisterEvent(ev)
	for i, f in ipairs(W.events[ev] or {}) do
		if f == self then
			table.remove(W.events[ev], i)
			return
		end
	end
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
function methods:GetName() return self.__name end
function methods:IsForbidden() return false end
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
function methods:SetScale(v) self.__scale = v end
function methods:GetScale() return self.__scale or 1 end
function methods:EnableMouse(v) self.__mouse = v and true or false end
function methods:IsMouseEnabled() if self.__mouse == nil then return true end return self.__mouse end
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
function methods:GetObjectType() return self.__kind end
function methods:SetHyperlink(link)
	table.insert(W.hyperlinks, link)
	if W.autoWorks then
		local data = W.linkData[link]
		C_Timer.After(W.replyDelay or 0.2, function()
			if data then
				W.trade = { linked = true, linkedName = data.linkedName, prof = data.prof, recipes = data.recipes }
				W.Fire("TRADE_SKILL_SHOW")
				if ProfessionsFrame and not W.noFrame and W.UIHears() then ProfessionsFrame:Show() end
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
	W.updaters = {}
	W.hyperlinks, W.tells, W.closed = {}, {}, 0
	W.guids = W.guids or {}
	W.linkData = W.linkData or {}
	W.items = W.items or {}
	W.guild = W.guild or {}
	W.Fire = Fire

	_G.GetBuildInfo = function()
		if W.retail then
			return "12.1.0", "69933", "Sep 22 2026", 120100
		end
		return "1.60.1", "70235", "Oct 1 2026", 16001
	end
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
		GetCVar = function(name) return W.cvars[name] end,
		SetCVar = function(name, value) W.cvars[name] = value table.insert(W.cvarLog, name .. "=" .. value) end,
	}
	W.cvarLog = {}
	_G.C_NamePlate = { GetNamePlates = function()
		local out = {}
		for _, token in ipairs(W.plates or {}) do out[#out + 1] = { namePlateUnitToken = token } end
		return out
	end }
	_G.GetRealZoneText = function() return W.zone or "Stormwind City" end
	_G.IsResting = function() return W.resting == true end
	W.chatFilters = {}
	_G.ChatFrame_AddMessageEventFilter = function(ev, fn)
		W.chatFilters[ev] = W.chatFilters[ev] or {}
		table.insert(W.chatFilters[ev], fn)
	end
	_G.GetFramesRegisteredForEvent = function(ev) return table.unpack(W.events[ev] or {}) end
	_G.UnitExists = function(u) return u == "player" or (W.units and W.units[u] ~= nil) or false end
	_G.UnitClass = function() return "Mage", "MAGE" end
	_G.C_AddOns = { GetAddOnMetadata = function(addon, field) if addon == ADDON_NAME and field == "Version" then return TOC_VERSION end end }
	_G.GetRealmName = function() return "Test Realm" end
	_G.GetNormalizedRealmName = function() return W.realm or "TestRealm" end
	_G.GetAutoCompleteRealms = function() return W.connected or {} end
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
	_G.hooksecurefunc = function(a, b, c)
		local tbl, name, fn = _G, a, b
		if type(a) == "table" then
			tbl, name, fn = a, b, c
		end
		local orig = tbl[name]
		tbl[name] = function(...)
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
		return g.class, g.class, g.race or "Human", g.race or "Human", 2, g.name, g.realm
	end
	_G.C_Spell = {
		GetSpellTexture = function(id) return 100000 + id end,
		GetSpellName = function(id) return W.spellNames and W.spellNames[id] or nil end,
	}
	W.sent = {}
	W.channels = W.channels or { [1] = 1 }
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
	_G.JoinTemporaryChannel = function(name)
		if W.noJoin then return end
		if W.joinDelay then
			C_Timer.After(W.joinDelay, function() W.channels[name] = 5 end)
		else
			W.channels[name] = 5
		end
	end
	_G.JoinChannelByName = function(name, password, frame)
		W.joinFrame = frame
		if W.noJoin then return end
		if W.joinDelay then
			C_Timer.After(W.joinDelay, function() W.channels[name] = 5 end)
		else
			W.channels[name] = 5
		end
	end
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
		SendTellWithMessage = function(name, text) table.insert(W.tells, name) W.editBox.text = text W.typing = true end,
		GetActiveWindow = function() return nil end,
		InsertLink = function(link) table.insert(W.links, link) return true end,
	}
	_G.IsShiftKeyDown = function() return W.shift == true end
	_G.StaticPopupDialogs = _G.StaticPopupDialogs or {}
	_G.StaticPopup_Show = function(which, a1, a2, data) W.popup, W.popupArgs = which, { a1, a2, data } end
	_G.IsInGuild = function() return #W.guild > 0 end
	_G.GetNumGuildMembers = function() return #W.guild end
	_G.GetGuildRosterInfo = function(i)
		local g = W.guild[i]
		return g.name, "", 0, 60, "", "", "", "", g.online, "", g.class or "WARRIOR", 0, 0, false, false, 0, g.guid
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
	_G.UnitFactionGroup = function() return W.faction end
	W.bnetSent = {}
	local function Game(f)
		return f and { gameAccountID = f.id, isOnline = f.online ~= false, clientProgram = f.program or "WoW", wowProjectID = f.project, characterName = f.name, realmName = f.realm, factionName = f.faction, isInCurrentRegion = true } or nil
	end
	_G.BNGetNumFriends = function() return #(W.bnet or {}) end
	_G.C_BattleNet = {
		GetFriendNumGameAccounts = function(i) return (W.bnet and W.bnet[i]) and 1 or 0 end,
		GetFriendGameAccountInfo = function(i) return Game(W.bnet and W.bnet[i]) end,
		GetGameAccountInfoByID = function(id)
			for _, f in ipairs(W.bnet or {}) do
				if f.id == id then return Game(f) end
			end
		end,
		SendGameData = function(id, prefix, msg)
			assert(#msg <= 4000, "Battle.net message too long")
			table.insert(W.bnetSent, { id = id, prefix = prefix, msg = msg })
		end,
	}
	_G.IsInRaid = function() return false end
	_G.ERR_CHAT_PLAYER_NOT_FOUND_S = "No player named '%s' is currently playing."
	_G.C_TradeSkillUI = {
		GetBaseProfessionInfo = function()
			if not W.trade then return nil end
			return W.trade.prof
		end,
		GetChildProfessionInfo = function()
			if not W.trade then return nil end
			return W.trade.child
		end,
		GetTradeSkillDisplayName = function(line)
			return W.lineNames and W.lineNames[line] or ""
		end,
		GetProfessionInfoBySkillLineID = function(line)
			return W.lineInfo and W.lineInfo[line] or nil
		end,
		IsTradeSkillLinked = function()
			if not W.trade then return false end
			return W.trade.linked, W.trade.linkedName
		end,
		IsTradeSkillGuild = function() return false end,
		IsDataSourceChanging = function() return W.dataChanging == true end,
		IsNPCCrafting = function() return false end,
		GetFilteredRecipeIDs = function()
			if W.dataChanging then return {} end
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
			if W.categories then return W.categories[id] end
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
	W.ui = CreateFrame("Frame")
	W.ui:RegisterEvent("TRADE_SKILL_SHOW")
	W.UIHears = function()
		for _, f in ipairs(W.events.TRADE_SKILL_SHOW or {}) do
			if f == W.ui then return true end
		end
		return false
	end
	LinkedInnDB = saved and load("return " .. saved)() or nil
	LI = {}
	for _, file in ipairs(FILES) do
		local chunk = assert(loadfile(ADDON_DIR .. "/" .. file))
		chunk(ADDON_NAME, LI)
	end
	Fire("ADDON_LOADED", ADDON_NAME)
	if not saved and not W.defaultLinks then
		for k in pairs(LinkedInnDB.profLinks) do
			LinkedInnDB.profLinks[k] = nil
		end
	end
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
