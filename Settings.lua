local ADDON, LI = ...

local Settings = {}
LI.Settings = Settings

local WIDTH = 340
local GOLD = { 1, 0.82, 0 }
local SOFT = { 0.62, 0.6, 0.56 }
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"

local frame
local INTERVALS = { 2, 5, 10, 15 }
local FORGET = { 14, 30, 60, 90, 0 }

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
local PAGE_WIDTH = WIDTH - 10

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
	local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
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

local function Create()
	local main = LI.UI.Main()
	frame = CreateFrame("Frame", "LinkedInnSettings", main, "ButtonFrameTemplate")
	frame:SetSize(WIDTH, 580)
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
	if frame.Inset then
		frame.Inset:ClearAllPoints()
		frame.Inset:SetPoint("TOPLEFT", 4, -26)
		frame.Inset:SetPoint("BOTTOMRIGHT", -6, 26)
	end
	local page = CreateFrame("Frame", nil, frame.Inset or frame)
	page:SetAllPoints()
	frame.page = page

	local city = Section(page, nil, "City scans")
	frame.city, frame.cityLast = Option(page, city, "Scan players in cities",
		"Every few minutes in a city or inn, friendly nameplates flash on for half a second so everyone around you gets checked in the background. Not needed if you already play with friendly nameplates on (Shift+V).",
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
		"Saves someone's full recipe list when they link a profession, without you clicking it.",
		function() return LI.settings.autoRead ~= false end,
		function(on) LI.settings.autoRead = on end)

	local list = Section(page, frame.readLast, "Your list")
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
	frame.count = Below(Text(page, "GameFontHighlight"), frame.forgetDesc, HEAD_X, 16)
	frame.wipe = CreateFrame("Button", nil, page, "UIPanelButtonTemplate")
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

	frame.version = Text(frame, "GameFontDisableSmall", "CENTER")
	frame.version:SetPoint("BOTTOM", 0, 8)
	frame.version:SetText(string.format("%s %s", LI.TITLE, LI.VERSION))

	frame:SetScript("OnShow", function()
		Settings.Refresh()
	end)
	frame:Hide()
end

function Settings.Refresh()
	if not frame then
		return
	end
	for _, box in ipairs({ frame.city, frame.read, frame.minimap }) do
		box:SetChecked(box.get() and true or false)
	end
	frame.every:Update()
	frame.forget:Update()
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
