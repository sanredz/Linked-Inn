local ADDON, LI = ...

local UI = {}
LI.UI = UI

local TAB = { find = 1, test = 2 }
local TABS = { "Crafters", "Test" }
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"
local ROW_HEIGHT = 46

local STATUS = {
	online = { icon = "Interface\\FriendsFrame\\StatusIcon-Online", color = { 0.35, 0.95, 0.45 } },
	recent = { icon = "Interface\\FriendsFrame\\StatusIcon-Away", color = { 1.00, 0.82, 0.30 } },
	offline = { icon = "Interface\\FriendsFrame\\StatusIcon-Offline", color = { 0.55, 0.55, 0.55 } },
}

local SOFT = { 0.72, 0.68, 0.60 }
local CAN = { 0.55, 0.95, 0.55 }
local MAYBE = { 0.85, 0.75, 0.50 }

local main
local filter = { search = "", prof = nil }
local refreshQueued = false

local function Text(parent, template, justify)
	local fs = parent:CreateFontString(nil, "OVERLAY", template or "GameFontHighlight")
	fs:SetJustifyH(justify or "LEFT")
	return fs
end

local function Button(parent, label, width, onClick)
	local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
	button:SetSize(width or 130, 22)
	button:SetText(label)
	button:SetScript("OnClick", function(self)
		LI.SafeCall(onClick, self)
	end)
	return button
end

local function Sound(kit)
	if PlaySound and SOUNDKIT and SOUNDKIT[kit] then
		LI.Try(PlaySound, SOUNDKIT[kit])
	end
end

local function Menu(owner, build)
	if MenuUtil and MenuUtil.CreateContextMenu then
		MenuUtil.CreateContextMenu(owner, function(_, root)
			LI.SafeCall(build, root)
		end)
	end
end

local function Movable(frame)
	frame:SetMovable(true)
	frame:SetClampedToScreen(true)
	frame:EnableMouse(true)
	frame:RegisterForDrag("LeftButton")
	frame:SetScript("OnDragStart", frame.StartMoving)
	frame:SetScript("OnDragStop", frame.StopMovingOrSizing)
end

function UI.Whisper(key)
	local target = LI.WhisperTarget(key)
	if ChatFrameUtil and ChatFrameUtil.SendTell then
		ChatFrameUtil.SendTell(target)
	elseif ChatFrame_SendTell then
		ChatFrame_SendTell(target)
	end
end

local function OpenLink(p)
	if p and p.link and SetItemRef then
		SetItemRef(p.link, p.text or "", "LeftButton")
	end
end

local function KindName(key)
	for _, k in ipairs(LI.KINDS) do
		if k.key == key then
			return k.name
		end
	end
	return LI.KINDS[1].name
end

local function SortedProfs(c)
	local list = {}
	for key, p in pairs(c.profs) do
		list[#list + 1] = { key = key, p = p }
	end
	table.sort(list, function(a, b)
		local ra, rb = a.p.recipes and 1 or 0, b.p.recipes and 1 or 0
		if ra ~= rb then
			return ra > rb
		end
		return a.key < b.key
	end)
	return list
end

local function ProfLine(c, only)
	local parts = {}
	for _, entry in ipairs(SortedProfs(c)) do
		if not only or only == entry.key then
			local p = entry.p
			local label = p.name or entry.key
			if p.rank and p.rank > 0 then
				label = label .. " " .. p.rank
			end
			parts[#parts + 1] = label
		end
	end
	return table.concat(parts, "  ·  ")
end

local function StatusText(entry)
	if entry.status == "online" then
		return "Online"
	end
	if entry.seenAt then
		local ago = LI.Ago(entry.seenAt)
		if ago == "just now" then
			return "Seen just now"
		end
		return "Seen " .. ago
	end
	return "Offline"
end

local function ShowRowTooltip(row)
	local entry = row.entry
	if not entry then
		return
	end
	local c = entry.crafter
	GameTooltip:SetOwner(row, "ANCHOR_RIGHT")
	local color = LI.ClassColor(c.class) or LI.COLOR.WHITE
	GameTooltip:SetText(LI.ShortName(entry.key), color[1], color[2], color[3])
	for _, item in ipairs(SortedProfs(c)) do
		local p = item.p
		local right
		if p.recipes then
			right = string.format("%d recipes", p.count or 0)
		else
			right = "recipes not read yet"
		end
		local name = p.name or item.key
		if p.rank and p.rank > 0 then
			name = string.format("%s (%d/%d)", name, p.rank, p.max or p.rank)
		end
		GameTooltip:AddDoubleLine(name, right, 1, 1, 1, SOFT[1], SOFT[2], SOFT[3])
	end
	GameTooltip:AddLine(" ")
	local st = STATUS[entry.status] or STATUS.offline
	GameTooltip:AddDoubleLine(StatusText(entry), c.where and ("in " .. c.where) or "", st.color[1], st.color[2], st.color[3], SOFT[1], SOFT[2], SOFT[3])
	if entry.recipeMeta and entry.makes > 1 then
		GameTooltip:AddLine(string.format("Can make %d items that match your search", entry.makes), CAN[1], CAN[2], CAN[3], true)
	end
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine("Click to whisper   Right-click for more", 0.5, 0.5, 0.5)
	GameTooltip:Show()
end

local function RowMenu(row)
	local entry = row.entry
	if not entry then
		return
	end
	Menu(row, function(root)
		if root.CreateTitle then
			root:CreateTitle(LI.ShortName(entry.key))
		end
		root:CreateButton("Whisper", function()
			UI.Whisper(entry.key)
		end)
		for _, item in ipairs(SortedProfs(entry.crafter)) do
			if item.p.link then
				root:CreateButton("Open " .. (item.p.name or item.key), function()
					OpenLink(item.p)
				end)
			end
		end
		root:CreateButton("Forget this crafter", function()
			LI.Forget(entry.key)
		end)
	end)
end

local function BuildRow(row)
	row:SetHeight(ROW_HEIGHT)
	row:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	row.bg = row:CreateTexture(nil, "BACKGROUND")
	row.bg:SetAllPoints()
	row.hl = row:CreateTexture(nil, "HIGHLIGHT")
	row.hl:SetAllPoints()
	row.hl:SetColorTexture(1, 0.82, 0.3, 0.10)
	row.icon = row:CreateTexture(nil, "ARTWORK")
	row.icon:SetSize(34, 34)
	row.icon:SetPoint("LEFT", 8, 0)
	row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	row.dot = row:CreateTexture(nil, "OVERLAY")
	row.dot:SetSize(14, 14)
	row.dot:SetPoint("TOPLEFT", row.icon, "TOPRIGHT", 8, -1)
	row.name = Text(row, "GameFontNormalLarge")
	row.name:SetPoint("LEFT", row.dot, "RIGHT", 3, 0)
	row.line = Text(row, "GameFontHighlightSmall")
	row.line:SetPoint("BOTTOMLEFT", row.icon, "BOTTOMRIGHT", 10, 1)
	row.line:SetPoint("RIGHT", -120, 0)
	row.line:SetWordWrap(false)
	row.status = Text(row, "GameFontHighlightSmall", "RIGHT")
	row.status:SetPoint("TOPRIGHT", -12, -9)
	row.where = Text(row, "GameFontDisableSmall", "RIGHT")
	row.where:SetPoint("TOPRIGHT", row.status, "BOTTOMRIGHT", 0, -4)
	row:SetScript("OnEnter", ShowRowTooltip)
	row:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	row:SetScript("OnClick", function(self, button)
		if button == "RightButton" then
			RowMenu(self)
		elseif self.entry then
			UI.Whisper(self.entry.key)
		end
	end)
	row.built = true
end

local function InitRow(row, entry)
	if not row.built then
		BuildRow(row)
	end
	row.entry = entry
	local c = entry.crafter
	local stripe = (entry.index or 0) % 2 == 0 and 0.05 or 0.0
	row.bg:SetColorTexture(1, 1, 1, stripe)
	local color = LI.ClassColor(c.class) or LI.COLOR.WHITE
	row.name:SetText(LI.ShortName(entry.key))
	row.name:SetTextColor(color[1], color[2], color[3])
	local st = STATUS[entry.status] or STATUS.offline
	row.dot:SetTexture(st.icon)
	row.status:SetText(StatusText(entry))
	row.status:SetTextColor(st.color[1], st.color[2], st.color[3])
	row.where:SetText(c.where or "")
	local icon
	if entry.recipeMeta then
		icon = entry.recipeMeta.i
		local more = entry.makes > 1 and string.format("  |cff8c8c8c+%d more|r", entry.makes - 1) or ""
		row.line:SetText("Can make " .. (entry.recipeMeta.n or "?") .. more)
		row.line:SetTextColor(CAN[1], CAN[2], CAN[3])
	elseif entry.confidence == 1 then
		row.line:SetText(ProfLine(c, filter.prof) .. "  |cff8c8c8c- recipes not read yet, might make it|r")
		row.line:SetTextColor(MAYBE[1], MAYBE[2], MAYBE[3])
	else
		row.line:SetText(ProfLine(c, nil))
		row.line:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	end
	if not icon then
		local first = SortedProfs(c)[1]
		if filter.prof and c.profs[filter.prof] then
			first = { key = filter.prof, p = c.profs[filter.prof] }
		end
		icon = first and LI.ProfIcon(first.key, first.p.icon)
	end
	row.icon:SetTexture(icon or LI.ICON)
	row.icon:SetDesaturated(entry.status == "offline")
	row.icon:SetAlpha(entry.status == "offline" and 0.75 or 1)
end

local function CreateList(parent)
	local box = CreateFrame("Frame", nil, parent, "WowScrollBoxList")
	local bar = CreateFrame("EventFrame", nil, parent, "MinimalScrollBar")
	box:SetPoint("TOPLEFT", 4, -4)
	box:SetPoint("BOTTOMRIGHT", -20, 4)
	bar:SetPoint("TOPLEFT", box, "TOPRIGHT", 4, 0)
	bar:SetPoint("BOTTOMLEFT", box, "BOTTOMRIGHT", 4, 0)
	local view = CreateScrollBoxListLinearView()
	view:SetElementExtent(ROW_HEIGHT)
	view:SetElementInitializer("Button", function(row, data)
		LI.SafeCall(InitRow, row, data)
	end)
	ScrollUtil.InitScrollBoxListWithScrollBar(box, bar, view)
	box.SetList = function(self, list)
		local retain = ScrollBoxConstants and ScrollBoxConstants.RetainScrollPosition
		self:SetDataProvider(CreateDataProvider(list), retain)
	end
	return box
end

local function UpdateChips()
	local profs = LI.ProfessionsSeen()
	local chips = main.chips
	for i, info in ipairs(profs) do
		local chip = chips[i]
		if not chip then
			chip = CreateFrame("Button", nil, main.chipBar)
			chip:SetSize(30, 30)
			chip.icon = chip:CreateTexture(nil, "ARTWORK")
			chip.icon:SetAllPoints()
			chip.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
			chip.sel = chip:CreateTexture(nil, "BACKGROUND")
			chip.sel:SetPoint("TOPLEFT", -3, 3)
			chip.sel:SetPoint("BOTTOMRIGHT", 3, -3)
			chip.sel:SetColorTexture(1, 0.82, 0.2, 0.9)
			chip.hl = chip:CreateTexture(nil, "HIGHLIGHT")
			chip.hl:SetAllPoints()
			chip.hl:SetColorTexture(1, 1, 1, 0.15)
			chip:SetScript("OnClick", function(self)
				filter.prof = filter.prof ~= self.key and self.key or nil
				Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
				UI.Refresh()
			end)
			chip:SetScript("OnEnter", function(self)
				GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
				GameTooltip:SetText(self.name or "", 1, 0.82, 0)
				GameTooltip:AddLine(string.format("%d %s", self.count or 0, (self.count or 0) == 1 and "crafter" or "crafters"), 1, 1, 1)
				GameTooltip:AddLine(filter.prof == self.key and "Click to show everyone" or "Click to show only this profession", 0.5, 0.5, 0.5)
				GameTooltip:Show()
			end)
			chip:SetScript("OnLeave", function()
				GameTooltip:Hide()
			end)
			chips[i] = chip
		end
		chip.key, chip.name, chip.count = info.key, info.name, info.count
		chip.icon:SetTexture(LI.ProfIcon(info.key, info.icon))
		local selected = filter.prof == info.key
		chip.sel:SetShown(selected)
		chip.icon:SetDesaturated(filter.prof ~= nil and not selected)
		chip:ClearAllPoints()
		chip:SetPoint("LEFT", main.chipBar, "LEFT", (i - 1) * 38 + 3, 0)
		chip:Show()
	end
	for i = #profs + 1, #chips do
		chips[i]:Hide()
	end
	main.noChips:SetShown(#profs == 0)
end

local function RefreshFind()
	local opts = { prof = filter.prof, kind = LI.settings.kind, onlineOnly = LI.settings.onlineOnly }
	local results = LI.Search(filter.search, opts)
	local online = 0
	for i, entry in ipairs(results) do
		entry.index = i
		if entry.status == "online" then
			online = online + 1
		end
	end
	main.list:SetList(results)
	UpdateChips()
	main.kind:SetText(KindName(LI.settings.kind))
	main.onlineBox:SetChecked(LI.settings.onlineOnly and true or false)
	local total = 0
	for _ in pairs(LI.crafters) do
		total = total + 1
	end
	main.count:SetText(string.format("%d shown  ·  %d online  ·  %d crafters remembered", #results, online, total))
	local empty = #results == 0
	main.empty:SetShown(empty)
	if empty then
		if total == 0 then
			main.emptyHead:SetText("The inn is quiet")
			main.emptyText:SetText("Linked Inn listens to Trade, General, guild and party chat. Whenever someone links a profession, they show up here. Open your own profession window to add yourself.")
		elseif filter.search ~= "" then
			main.emptyHead:SetText("Nobody for \"" .. filter.search .. "\" yet")
			main.emptyText:SetText("No one you've seen can make that so far. Try a shorter word, or clear the filters.")
		else
			main.emptyHead:SetText("Nobody matches")
			main.emptyText:SetText("Clear the filters to see everyone.")
		end
	end
end

local function Verdict()
	local t = LI.test
	local auto = t.auto
	if auto.ok > 0 and auto.flashed == 0 then
		return "Chat alone is enough", LI.COLOR.GREEN, "Recipes were read straight from links in chat, without clicking and without any window opening."
	elseif auto.ok > 0 then
		return "Chat alone works, but a window pops up", LI.COLOR.GOLD, "Recipes come in without clicking, but the profession window flashed open while reading."
	elseif LI.Reader.IsBroken() or (auto.tries >= 3 and auto.ok == 0) then
		return "Links need a click", LI.COLOR.RED, "Reading links automatically got no reply. Clicking a link in chat still saves that crafter's recipes."
	end
	return "Not enough data yet", LI.COLOR.GRAY, "Stay in a city with Trade chat for a while, or ask someone to link a profession. Results show up here."
end

local function RefreshTest()
	local page = main.testPage
	local t = LI.test
	local head, color, body = Verdict()
	page.head:SetText(head)
	page.head:SetTextColor(color[1], color[2], color[3])
	page.body:SetText(body)
	local auto = t.auto
	local lines = {
		{ "Profession links seen in chat", tostring(t.links) },
		{ "Waiting to be read", tostring(LI.Reader.QueueSize()) },
		{ "Read automatically", string.format("%d of %d tries", auto.ok, auto.tries) },
		{ "No reply / error", string.format("%d / %d", auto.timeout, auto.err) },
		{ "Window popped up while reading", tostring(auto.flashed) },
		{ "Read by clicking a link", tostring(t.click) },
		{ "Your own professions saved", tostring(t.own) },
	}
	for i, pair in ipairs(lines) do
		page.labels[i]:SetText(pair[1])
		page.values[i]:SetText(pair[2])
	end
	local formats = {}
	for _, f in ipairs(t.formats) do
		formats[#formats + 1] = string.format("%s  (%s, seen %d)", f.text or "?", f.shape, f.count or 1)
	end
	page.formats:SetText(#formats > 0 and table.concat(formats, "\n") or "No profession links seen yet.")
	local log = {}
	local entries = LI.db.log
	for i = #entries, math.max(1, #entries - 7), -1 do
		log[#log + 1] = date("%H:%M", entries[i].t) .. "  " .. entries[i].m
	end
	page.log:SetText(#log > 0 and table.concat(log, "\n") or "Nothing yet.")
	page.auto:SetChecked(LI.settings.autoRead and true or false)
	page.retry:SetShown(LI.Reader.IsBroken())
end

local function BuildTestPage(page)
	page.head = page:CreateFontString(nil, "OVERLAY", "GameFontNormalHuge")
	page.head:SetFont(TITLE_FONT, 26, "")
	page.head:SetPoint("TOP", 0, -22)
	page.body = Text(page, "GameFontHighlight", "CENTER")
	page.body:SetPoint("TOP", page.head, "BOTTOM", 0, -8)
	page.body:SetWidth(440)
	page.body:SetSpacing(2)
	page.labels, page.values = {}, {}
	for i = 1, 7 do
		local label = Text(page, "GameFontNormal")
		label:SetPoint("TOPLEFT", 40, -100 - (i - 1) * 20)
		local value = Text(page, "GameFontHighlight", "RIGHT")
		value:SetPoint("TOPRIGHT", -40, -100 - (i - 1) * 20)
		page.labels[i], page.values[i] = label, value
	end
	local formatsHead = Text(page, "GameFontNormalSmall")
	formatsHead:SetPoint("TOPLEFT", 40, -250)
	formatsHead:SetText("Link formats")
	page.formats = Text(page, "GameFontHighlightSmall")
	page.formats:SetPoint("TOPLEFT", formatsHead, "BOTTOMLEFT", 0, -4)
	page.formats:SetWidth(440)
	local logHead = Text(page, "GameFontNormalSmall")
	logHead:SetPoint("TOPLEFT", 40, -320)
	logHead:SetText("Latest")
	page.log = Text(page, "GameFontDisableSmall")
	page.log:SetPoint("TOPLEFT", logHead, "BOTTOMLEFT", 0, -4)
	page.log:SetWidth(440)
	page.log:SetSpacing(2)
	page.auto = CreateFrame("CheckButton", nil, page, "UICheckButtonTemplate")
	page.auto:SetSize(24, 24)
	page.auto:SetPoint("BOTTOMLEFT", 34, 10)
	page.auto:SetScript("OnClick", function(self)
		LI.settings.autoRead = self:GetChecked() and true or false
		UI.Refresh()
	end)
	local autoLabel = Text(page, "GameFontHighlightSmall")
	autoLabel:SetPoint("LEFT", page.auto, "RIGHT", 2, 0)
	autoLabel:SetText("Read links automatically")
	page.retry = Button(page, "Try again", 100, function()
		LI.Reader.Retry()
	end)
	page.retry:SetPoint("LEFT", autoLabel, "RIGHT", 10, 0)
	page.reset = Button(page, "Reset test", 100, function()
		LI.ResetTest()
	end)
	page.reset:SetPoint("BOTTOMRIGHT", -36, 10)
end

function UI.Refresh()
	if not main or not main:IsShown() then
		return
	end
	local findShown = main.selectedTab == TAB.find
	main.findPage:SetShown(findShown)
	main.testPage:SetShown(not findShown)
	main.search:SetShown(findShown)
	main.onlineBox:SetShown(findShown)
	main.onlineLabel:SetShown(findShown)
	main.kind:SetShown(findShown)
	main.chipBar:SetShown(findShown)
	main.count:SetShown(findShown)
	if findShown then
		RefreshFind()
	else
		RefreshTest()
	end
end

local function QueueRefresh()
	if refreshQueued or not main or not main:IsShown() then
		return
	end
	refreshQueued = true
	LI.After(0.25, function()
		refreshQueued = false
		UI.Refresh()
	end)
end

local function SelectTab(index)
	main.selectedTab = index
	if PanelTemplates_SetTab then
		PanelTemplates_SetTab(main, index)
	end
	UI.Refresh()
end

local function CreateMain()
	main = CreateFrame("Frame", "LinkedInnFrame", UIParent, "ButtonFrameTemplate")
	main:SetSize(560, 580)
	main:SetPoint("CENTER", 0, 20)
	main:SetFrameStrata("HIGH")
	main:SetToplevel(true)
	Movable(main)
	if main.SetTitle then
		main:SetTitle(LI.TITLE)
	end
	if main.SetPortraitToAsset then
		main:SetPortraitToAsset(LI.ICON)
	end
	if ButtonFrameTemplate_HideButtonBar then
		ButtonFrameTemplate_HideButtonBar(main)
	end
	tinsert(UISpecialFrames, "LinkedInnFrame")

	local search = CreateFrame("EditBox", nil, main, "SearchBoxTemplate")
	search:SetSize(250, 22)
	search:SetPoint("TOPLEFT", 70, -32)
	if search.Instructions then
		search.Instructions:SetText("Search an item, profession or name")
	end
	search:SetScript("OnTextChanged", function(self)
		if SearchBoxTemplate_OnTextChanged then
			pcall(SearchBoxTemplate_OnTextChanged, self)
		end
		filter.search = LI.Trim(self:GetText() or "")
		QueueRefresh()
	end)
	main.search = search

	main.kind = Button(main, KindName(LI.settings.kind), 120, function(self)
		Menu(self, function(root)
			for _, k in ipairs(LI.KINDS) do
				root:CreateRadio(k.name, function()
					return LI.settings.kind == k.key
				end, function()
					LI.settings.kind = k.key
					UI.Refresh()
				end)
			end
		end)
	end)
	main.kind:SetPoint("LEFT", search, "RIGHT", 8, 0)

	main.onlineBox = CreateFrame("CheckButton", nil, main, "UICheckButtonTemplate")
	main.onlineBox:SetSize(24, 24)
	main.onlineBox:SetPoint("LEFT", main.kind, "RIGHT", 6, 0)
	main.onlineBox:SetScript("OnClick", function(self)
		LI.settings.onlineOnly = self:GetChecked() and true or false
		UI.Refresh()
	end)
	main.onlineLabel = Text(main, "GameFontHighlightSmall")
	main.onlineLabel:SetPoint("LEFT", main.onlineBox, "RIGHT", 0, 0)
	main.onlineLabel:SetText("Online")

	main.chipBar = CreateFrame("Frame", nil, main)
	main.chipBar:SetPoint("TOPLEFT", 66, -60)
	main.chipBar:SetPoint("TOPRIGHT", -10, -60)
	main.chipBar:SetHeight(36)
	main.chips = {}
	main.noChips = Text(main.chipBar, "GameFontDisableSmall")
	main.noChips:SetPoint("LEFT", 4, 0)
	main.noChips:SetText("Professions you come across appear here as filters.")

	if main.Inset then
		main.Inset:ClearAllPoints()
		main.Inset:SetPoint("TOPLEFT", 4, -100)
		main.Inset:SetPoint("BOTTOMRIGHT", -6, 26)
	end

	main.findPage = CreateFrame("Frame", nil, main.Inset)
	main.findPage:SetAllPoints()
	main.list = CreateList(main.findPage)
	main.empty = CreateFrame("Frame", nil, main.findPage)
	main.empty:SetAllPoints()
	local emptyIcon = main.empty:CreateTexture(nil, "ARTWORK")
	emptyIcon:SetSize(56, 56)
	emptyIcon:SetPoint("CENTER", 0, 60)
	emptyIcon:SetTexture(LI.ICON)
	emptyIcon:SetDesaturated(true)
	emptyIcon:SetAlpha(0.6)
	main.emptyHead = main.empty:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	main.emptyHead:SetFont(TITLE_FONT, 22, "")
	main.emptyHead:SetPoint("TOP", emptyIcon, "BOTTOM", 0, -12)
	main.emptyText = Text(main.empty, "GameFontHighlight", "CENTER")
	main.emptyText:SetPoint("TOP", main.emptyHead, "BOTTOM", 0, -8)
	main.emptyText:SetWidth(380)
	main.emptyText:SetSpacing(3)
	main.emptyText:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	main.empty:Hide()

	main.testPage = CreateFrame("Frame", nil, main.Inset)
	main.testPage:SetAllPoints()
	BuildTestPage(main.testPage)
	main.testPage:Hide()

	main.count = Text(main, "GameFontDisableSmall", "RIGHT")
	main.count:SetPoint("BOTTOMRIGHT", -12, 8)

	for i, name in ipairs(TABS) do
		local tab = CreateFrame("Button", "LinkedInnFrameTab" .. i, main, "PanelTabButtonTemplate")
		tab:SetID(i)
		tab:SetText(name)
		tab:SetScript("OnClick", function(self)
			SelectTab(self:GetID())
			Sound("IG_CHARACTER_INFO_TAB")
		end)
		if i == 1 then
			tab:SetPoint("TOPLEFT", main, "BOTTOMLEFT", 12, 2)
		else
			tab:SetPoint("TOPLEFT", _G["LinkedInnFrameTab" .. (i - 1)], "TOPRIGHT", 3, 0)
		end
		if PanelTemplates_TabResize then
			pcall(PanelTemplates_TabResize, tab, 15)
		end
	end
	if PanelTemplates_SetNumTabs then
		PanelTemplates_SetNumTabs(main, #TABS)
	end

	main:SetScript("OnShow", function()
		Sound("IG_CHARACTER_INFO_OPEN")
		UI.Refresh()
	end)
	main:SetScript("OnHide", function()
		Sound("IG_CHARACTER_INFO_CLOSE")
	end)
	main:Hide()
	main.selectedTab = TAB.find
	if PanelTemplates_SetTab then
		PanelTemplates_SetTab(main, TAB.find)
	end
end

function UI.Main()
	return main
end

function UI.Toggle()
	if not LI.ready then
		return
	end
	if not main then
		CreateMain()
	end
	main:SetShown(not main:IsShown())
end

function UI.Open(tab)
	if not LI.ready then
		return
	end
	if not main then
		CreateMain()
	end
	main:Show()
	SelectTab(tab or main.selectedTab or TAB.find)
end

UI.TAB = TAB

LI.Listen("CraftersChanged", QueueRefresh)
LI.Listen("StatusChanged", QueueRefresh)
LI.Listen("TestChanged", QueueRefresh)

SLASH_LINKEDINN1 = "/linkedinn"
SLASH_LINKEDINN2 = "/li"
SlashCmdList.LINKEDINN = function(msg)
	msg = LI.Trim(msg):lower()
	if msg == "test" then
		UI.Open(TAB.test)
	else
		UI.Toggle()
	end
end

function LinkedInn_OnAddonCompartmentClick()
	UI.Toggle()
end

function LinkedInn_OnAddonCompartmentEnter(_, button)
	GameTooltip:SetOwner(button, "ANCHOR_LEFT")
	GameTooltip:SetText(LI.TITLE, 1, 0.82, 0)
	GameTooltip:AddLine("Find someone who can craft what you need.", 1, 1, 1, true)
	GameTooltip:Show()
end

function LinkedInn_OnAddonCompartmentLeave()
	GameTooltip:Hide()
end
