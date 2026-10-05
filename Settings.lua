local ADDON, LI = ...

local Settings = {}
LI.Settings = Settings

local WIDTH = 362
local GOLD = { 1, 0.82, 0 }
local SOFT = { 0.62, 0.6, 0.56 }
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"

local frame
local INTERVALS = { 2, 5, 10, 15 }
local FORGET = { 14, 30, 60, 90, 0 }
local KEEP = { 0, 75, 150, 225 }
local KEEP_NAMES = { [0] = "Any skill", [75] = "Journeyman 75", [150] = "Expert 150", [225] = "Artisan 225" }

local function Sound(kit)
	if PlaySound and SOUNDKIT and SOUNDKIT[kit] then
		LI.Try(PlaySound, SOUNDKIT[kit])
	end
end

local function Text(parent, template, justify)
	local fs = parent:CreateFontString(nil, "OVERLAY", template or "GameFontHighlight")
	fs:SetJustifyH(justify or "LEFT")
	return fs
end

local function Changed()
	LI.Fire("SettingsChanged")
	if LI.UI and LI.UI.Refresh then
		LI.UI.Refresh()
	end
	if frame and frame:IsShown() then
		Settings.Refresh()
	end
end

local HEAD_X = 18
local BOX_X = 14
local BODY_X = 42
local RIGHT_PAD = 18
local BAR_SPACE = 22
local SCROLL_STEP = 40
local PAGE_PAD = 16
local PAGE_WIDTH = WIDTH - 10 - BAR_SPACE

local function Below(region, anchor, x, gap)
	region:SetPoint("TOPLEFT", anchor, "BOTTOMLEFT", x - (anchor.colX or 0), -(gap or 0))
	region.colX = x
	return region
end

local function Body(parent, x, text)
	local fs = Text(parent, "GameFontHighlightSmall")
	fs:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	fs:SetWidth(PAGE_WIDTH - x - RIGHT_PAD)
	fs:SetSpacing(2)
	fs:SetText(text)
	return fs
end

local function Section(parent, anchor, title, gap)
	local head = parent:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	head:SetFont(TITLE_FONT, 17, "")
	head:SetTextColor(GOLD[1], GOLD[2], GOLD[3])
	if anchor then
		Below(head, anchor, HEAD_X, gap or 22)
	else
		head:SetPoint("TOPLEFT", HEAD_X, -14)
		head.colX = HEAD_X
	end
	head:SetText(title)
	local line = parent:CreateTexture(nil, "ARTWORK")
	line:SetHeight(1)
	line:SetPoint("TOPLEFT", head, "BOTTOMLEFT", 0, -4)
	line:SetPoint("RIGHT", parent, "RIGHT", -RIGHT_PAD, 0)
	line:SetColorTexture(1, 0.82, 0, 0.3)
	line.colX = HEAD_X
	return line
end

local function Option(parent, anchor, label, desc, get, set)
	local box = CreateFrame("CheckButton", nil, parent, "UICheckButtonTemplate")
	box:SetSize(26, 26)
	Below(box, anchor, BOX_X, 8)
	box.label = Text(parent, "GameFontHighlight")
	box.label:SetPoint("LEFT", box, "RIGHT", 2, 0)
	box.label:SetText(label)
	box:SetScript("OnClick", function(self)
		local on = self:GetChecked() and true or false
		set(on)
		Sound(on and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
		Changed()
	end)
	box.get = get
	local last = box
	if desc then
		box.desc = Below(Body(parent, BODY_X, desc), box, BODY_X, 0)
		last = box.desc
	end
	return box, last
end

local function Dropdown(parent, width, choices, label, get, set)
	local function Build(root)
		for _, value in ipairs(choices) do
			root:CreateRadio(label(value), function()
				return get() == value
			end, function()
				set(value)
				Changed()
			end)
		end
	end
	local ok, dropdown = pcall(CreateFrame, "DropdownButton", nil, parent, "WowStyle1DropdownTemplate")
	if ok and dropdown and type(dropdown.SetupMenu) == "function" then
		dropdown:SetWidth(width)
		dropdown:SetupMenu(function(_, root)
			Build(root)
		end)
		dropdown.Update = function(self)
			if self.GenerateMenu then
				self:GenerateMenu()
			end
		end
		return dropdown
	end
	local button = LI.Theme.Button(CreateFrame("Button", nil, parent, "UIPanelButtonTemplate"))
	button:SetSize(width, 22)
	button:SetScript("OnClick", function(self)
		if MenuUtil and MenuUtil.CreateContextMenu then
			MenuUtil.CreateContextMenu(self, function(_, root)
				Build(root)
			end)
		end
	end)
	button.Update = function(self)
		self:SetText(label(get()))
	end
	return button
end

local function Minutes(n)
	return string.format("%d minutes", n)
end

local function Days(n)
	if n == 0 then
		return "Never"
	end
	return string.format("%d days", n)
end

local HOUSE_KEYS = { "off", "light", "balanced", "strict" }
local ART = "Interface\\AddOns\\" .. ADDON .. "\\art\\"
local SEG_GAP = 4
local SEG_WIDTH = math.floor((WIDTH - 10 - 22 - 18 - 18 - SEG_GAP * 3) / 4)
local PaintHouse

local function ModeName(key)
	return (LI.HousekeepingMode(key)).name
end

local function HouseText(mode)
	if not mode.keep then
		return "Off: nothing is put away. Pick a mode to clear out crafters who add nothing."
	end
	local wait = mode.days > 0 and string.format(" and unseen for %d %s", mode.days, mode.days == 1 and "day" or "days") or ", right away"
	return string.format("%s: the best %d per profession stay. Others go once %d others make everything they make%s.", mode.name, mode.keep, mode.rare, wait)
end

local function ChooseHouse(key)
	local _, now = LI.HousekeepingMode(LI.settings.housekeeping)
	local mode, want = LI.HousekeepingMode(key)
	if want > now and StaticPopup_Show then
		local removed, crafters = LI.Housekeep(key, true)
		if removed > 0 then
			StaticPopup_Show("LINKEDINN_HOUSEKEEPING", mode.name, string.format("%d %s from %d %s", removed, removed == 1 and "profession" or "professions", crafters, crafters == 1 and "crafter" or "crafters"), key)
			return
		end
	end
	LI.settings.housekeeping = key
	LI.Housekeep()
	Changed()
end

PaintHouse = function()
	if not frame or not frame.segments then
		return
	end
	local current = LI.HousekeepingMode(LI.settings.housekeeping).key
	for _, b in ipairs(frame.segments) do
		if b.key == current then
			b.fill:SetVertexColor(1, 0.78, 0.25, b.hover and 0.5 or 0.38)
			b.edge:SetVertexColor(1, 0.82, 0.3, 0.95)
			b.text:SetTextColor(1, 0.92, 0.6)
		else
			b.fill:SetVertexColor(0.1, 0.1, 0.1, b.hover and 0.85 or 0.65)
			b.edge:SetVertexColor(0.55, 0.5, 0.42, b.hover and 0.9 or 0.6)
			b.text:SetTextColor(b.hover and 1 or 0.72, b.hover and 1 or 0.7, b.hover and 1 or 0.66)
		end
	end
	frame.houseDesc:SetText(HouseText(LI.HousekeepingMode(frame.houseHover or current)))
end

local function LastRun()
	local last = LI.db and LI.db.housekept
	if LI.HousekeepingMode(LI.settings.housekeeping).key == "off" or type(last) ~= "table" or not last.at then
		return ""
	end
	local mins = math.floor((time() - last.at) / 60)
	local ago = mins < 1 and "just now" or mins < 60 and string.format("%d min ago", mins) or string.format("%d h ago", math.floor(mins / 60))
	return string.format("|cff9e9a8fLast run %s: %d put away.|r", ago, last.removed or 0)
end

local function Skill(n)
	return KEEP_NAMES[n] or tostring(n)
end

local function Remembered()
	local listed, waiting = 0, LI.WaitingCount and LI.WaitingCount() or 0
	for key, c in pairs(LI.crafters or {}) do
		if key ~= LI.playerKey and LI.IsListed(c) then
			listed = listed + 1
		end
	end
	return listed, waiting
end

if StaticPopupDialogs then
	StaticPopupDialogs["LINKEDINN_FORGET_ALL"] = {
		text = "Forget every crafter on your list?\n\nFavorites go too. Crafters come back as you meet them again.",
		button1 = YES or "Yes",
		button2 = NO or "No",
		OnAccept = function()
			LI.ForgetEveryone()
			Changed()
		end,
		timeout = 0,
		whileDead = true,
		hideOnEscape = true,
		preferredIndex = 3,
	}
end

local function Fit()
	if not frame or not frame.last then
		return
	end
	local top, bottom = frame.page:GetTop(), frame.last:GetBottom()
	if not top or not bottom then
		return
	end
	frame.page:SetHeight(math.max(1, top - bottom + PAGE_PAD))
	local bar = frame.scroll.ScrollBar
	if bar and bar.SetShown then
		local scrolls = frame.page:GetHeight() > (frame.scroll:GetHeight() or 0) + 1
		bar:SetShown(scrolls)
		if not scrolls then
			frame.scroll:SetVerticalScroll(0)
		end
	end
end

if StaticPopupDialogs then
	StaticPopupDialogs["LINKEDINN_FORGET_BELOW"] = {
		text = "Only keep professions at %s and up?\n\n%s crafters on your list have lower ones. Those are forgotten now and skipped from here on. Favorites are kept.",
		button1 = YES or "Yes",
		button2 = NO or "No",
		OnAccept = function(_, min)
			min = tonumber(min)
			if not min then
				return
			end
			LI.settings.keepSkill = min
			LI.ForgetBelow(min)
			Changed()
		end,
		OnCancel = function()
			Changed()
		end,
		timeout = 0,
		whileDead = true,
		hideOnEscape = true,
		preferredIndex = 3,
	}
end

if StaticPopupDialogs then
	StaticPopupDialogs["LINKEDINN_HOUSEKEEPING"] = {
		text = "Switch housekeeping to %s?\n\nThis puts away %s now. Favorites, guild, friends and rare recipes are kept.",
		button1 = YES or "Yes",
		button2 = NO or "No",
		OnAccept = function(_, key)
			if type(key) ~= "string" then
				return
			end
			LI.settings.housekeeping = key
			LI.Housekeep()
			Changed()
		end,
		OnCancel = function()
			Changed()
		end,
		timeout = 0,
		whileDead = true,
		hideOnEscape = true,
		preferredIndex = 3,
	}
end

local function Create()
	local main = LI.UI.Main()
	frame = CreateFrame("Frame", "LinkedInnSettings", main, "ButtonFrameTemplate")
	frame:SetSize(WIDTH, 620)
	frame:SetPoint("TOPLEFT", main, "TOPRIGHT", 4, 0)
	frame:SetFrameStrata("HIGH")
	if ButtonFrameTemplate_HidePortrait then
		LI.Try(ButtonFrameTemplate_HidePortrait, frame)
	end
	if ButtonFrameTemplate_HideButtonBar then
		LI.Try(ButtonFrameTemplate_HideButtonBar, frame)
	end
	if frame.SetTitle then
		frame:SetTitle("Settings")
	end
	LI.Theme.Skin(frame, "Settings", { titleSize = 20 })
	if frame.Inset then
		frame.Inset:ClearAllPoints()
		frame.Inset:SetPoint("TOPLEFT", 12, -42)
		frame.Inset:SetPoint("BOTTOMRIGHT", -12, 32)
	end
	local holder = frame.Inset or frame
	local ok, scroll = pcall(CreateFrame, "ScrollFrame", nil, holder, "ScrollFrameTemplate")
	if not ok or not scroll then
		scroll = CreateFrame("ScrollFrame", nil, holder)
		scroll:EnableMouseWheel(true)
		scroll:SetScript("OnMouseWheel", function(self, delta)
			local range = self:GetVerticalScrollRange() or 0
			local at = (self:GetVerticalScroll() or 0) - delta * SCROLL_STEP
			self:SetVerticalScroll(math.max(0, math.min(range, at)))
		end)
	end
	scroll:SetPoint("TOPLEFT", 0, -2)
	scroll:SetPoint("BOTTOMRIGHT", -BAR_SPACE, 2)
	frame.scroll = scroll
	local page = CreateFrame("Frame", nil, scroll)
	page:SetSize(PAGE_WIDTH, 1)
	scroll:SetScrollChild(page)
	frame.page = page

	local city = Section(page, nil, "City scans")
	frame.city, frame.cityLast = Option(page, city, "Scan players in cities",
		"Every few minutes in a city or inn, friendly nameplates flash on briefly so people around you get checked.\n|cffe8b04aNot needed if friendly nameplates are on (Shift+V).|r",
		function() return LI.settings.cityScan == true end,
		function(on) LI.settings.cityScan = on end)
	frame.everyLabel = Below(Text(page, "GameFontHighlightSmall"), frame.cityLast, BODY_X, 14)
	frame.everyLabel:SetText("Scan every")
	frame.every = Dropdown(page, 120, INTERVALS, Minutes, function()
		return tonumber(LI.settings.cityEvery) or 5
	end, function(v)
		LI.settings.cityEvery = v
	end)
	frame.every:SetPoint("LEFT", frame.everyLabel, "LEFT", 76, 0)

	local reading = Section(page, frame.everyLabel, "Reading", 28)
	frame.read, frame.readLast = Option(page, reading, "Read profession links from chat",
		"Saves someone's recipes when they link a profession.",
		function() return LI.settings.autoRead ~= false end,
		function(on) LI.settings.autoRead = on end)
	frame.hide, frame.hideLast = Option(page, frame.readLast, "Hide profession links in chat",
		"Trade, general, say and yell. Still read and saved.",
		function() return LI.settings.hideLinks == true end,
		function(on) LI.settings.hideLinks = on end)

	frame.guild, frame.guildLast = Option(page, frame.hideLast, "Guild and friends only",
		"Only reads, lists and talks to your guild and friends list, Work included. Everyone else stays saved and comes back when you turn it off.",
		function() return LI.settings.guildOnly == true end,
		function(on) LI.settings.guildOnly = on end)
	frame.farSide = Below(Body(page, BODY_X, ""), frame.guildLast, BODY_X, 4)
	frame.farSide:SetTextColor(0.91, 0.69, 0.29)
	frame.guildLast = frame.farSide

	local list = Section(page, frame.guildLast, "Your list")
	frame.forgetLabel = Below(Text(page, "GameFontHighlight"), list, HEAD_X, 16)
	frame.forgetLabel:SetText("Forget crafters not seen for")
	frame.forget = Dropdown(page, 104, FORGET, Days, function()
		return tonumber(LI.settings.forgetDays) or 60
	end, function(v)
		LI.settings.forgetDays = v
		LI.PruneNow()
	end)
	frame.forget:SetPoint("LEFT", frame.forgetLabel, "RIGHT", 8, 0)
	frame.forgetDesc = Below(Body(page, HEAD_X, "Seeing someone anywhere, in chat, crafting or walking by, keeps them on the list. Favorites are never forgotten."), frame.forgetLabel, HEAD_X, 10)
	frame.keepLabel = Below(Text(page, "GameFontHighlight"), frame.forgetDesc, HEAD_X, 18)
	frame.keepLabel:SetText("Don't keep skill below")
	frame.keep = Dropdown(page, 146, KEEP, Skill, function()
		return tonumber(LI.settings.keepSkill) or 0
	end, function(v)
		local now = tonumber(LI.settings.keepSkill) or 0
		local affected = v > now and LI.CountBelow(v) or 0
		if affected > 0 and StaticPopup_Show then
			StaticPopup_Show("LINKEDINN_FORGET_BELOW", Skill(v), affected, v)
			return
		end
		LI.settings.keepSkill = v
	end)
	frame.keep:SetPoint("LEFT", frame.keepLabel, "RIGHT", 8, 0)
	frame.keepDesc = Below(Body(page, HEAD_X, "Lower professions are skipped when read and taken off your list. Favorites are kept."), frame.keepLabel, HEAD_X, 10)
	frame.houseLabel = Below(Text(page, "GameFontHighlight"), frame.keepDesc, HEAD_X, 18)
	frame.houseLabel:SetText("Housekeeping")
	frame.segments = {}
	for i, key in ipairs(HOUSE_KEYS) do
		local b = CreateFrame("Button", nil, page)
		b:SetSize(SEG_WIDTH, 22)
		if i == 1 then
			Below(b, frame.houseLabel, HEAD_X, 8)
		else
			b:SetPoint("LEFT", frame.segments[i - 1], "RIGHT", SEG_GAP, 0)
		end
		b.fill = LI.Slices(b, ART .. "pill", "BACKGROUND", 22)
		b.edge = LI.Slices(b, ART .. "pill_edge", "BORDER", 22)
		b.text = b:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
		b.text:SetPoint("CENTER")
		b.text:SetText(ModeName(key))
		b.key = key
		b:SetScript("OnClick", function()
			Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
			ChooseHouse(key)
		end)
		b:SetScript("OnEnter", function(self)
			self.hover = true
			frame.houseHover = key
			PaintHouse()
		end)
		b:SetScript("OnLeave", function(self)
			self.hover = false
			frame.houseHover = nil
			PaintHouse()
		end)
		frame.segments[i] = b
	end
	frame.houseDesc = Below(Body(page, HEAD_X, ""), frame.segments[1], HEAD_X, 8)
	frame.houseDesc:SetTextColor(0.9, 0.88, 0.82)
	frame.houseKeep = Below(Body(page, HEAD_X, "Never touches rare recipes, favorites, guild, friends or Linked Inn users."), frame.houseDesc, HEAD_X, 4)
	frame.houseLast = Below(Body(page, HEAD_X, ""), frame.houseKeep, HEAD_X, 4)
	frame.count = Below(Text(page, "GameFontHighlight"), frame.houseLast, HEAD_X, 16)
	frame.wipe = LI.Theme.Button(CreateFrame("Button", nil, page, "UIPanelButtonTemplate"))
	frame.wipe:SetSize(130, 22)
	frame.wipe:SetText("Forget everyone")
	Below(frame.wipe, frame.count, HEAD_X - 2, 8)
	frame.wipe:SetScript("OnClick", function()
		if StaticPopup_Show then
			StaticPopup_Show("LINKEDINN_FORGET_ALL")
		end
	end)

	local minimap = Section(page, frame.wipe, "Minimap", 22)
	frame.minimap = Option(page, minimap, "Show the minimap button", nil,
		function() return LI.settings.showMinimap ~= false end,
		function(on) LI.settings.showMinimap = on end)
	frame.last = frame.minimap

	frame.version = Text(frame, "GameFontDisableSmall", "CENTER")
	frame.version:SetPoint("BOTTOM", 0, 8)
	frame.version:SetText(string.format("%s %s", LI.TITLE, LI.VERSION))

	frame:SetScript("OnShow", function()
		Settings.Refresh()
		LI.After(0, Fit)
	end)
	frame:Hide()
end

function Settings.Refresh()
	if not frame then
		return
	end
	for _, box in ipairs({ frame.city, frame.read, frame.hide, frame.guild, frame.minimap }) do
		box:SetChecked(box.get() and true or false)
	end
	frame.every:Update()
	frame.forget:Update()
	frame.keep:Update()
	PaintHouse()
	frame.houseLast:SetText(LastRun())
	local far = LI.guildFarSide or 0
	if far > 0 then
		frame.farSide:SetText(string.format("%d online %s on the other realm. The game can't read them there, but they show up if they use Linked Inn.", far, far == 1 and "guildmate is" or "guildmates are"))
	else
		frame.farSide:SetText("")
	end
	local on = LI.settings.cityScan == true
	frame.everyLabel:SetTextColor(on and 1 or 0.5, on and 1 or 0.5, on and 1 or 0.5)
	if frame.every.SetEnabled then
		frame.every:SetEnabled(on)
	end
	local listed, waiting = Remembered()
	local text = string.format("%d %s remembered", listed, listed == 1 and "crafter" or "crafters")
	if waiting > 0 then
		text = text .. string.format("  |cff9e9a8f·  %d waiting|r", waiting)
	end
	frame.count:SetText(text)
	Fit()
end

function Settings.Frame()
	return frame
end

function Settings.Hide()
	if frame then
		frame:Hide()
	end
end

function Settings.Toggle()
	if not LI.ready or not LI.UI.Main() then
		return
	end
	if not frame then
		Create()
	end
	if frame:IsShown() then
		frame:Hide()
		return
	end
	local book = LI.Book and LI.Book.Frame()
	if book then
		book:Hide()
	end
	frame:Show()
end

LI.Listen("CraftersChanged", function()
	if frame and frame:IsShown() then
		Settings.Refresh()
	end
end)
