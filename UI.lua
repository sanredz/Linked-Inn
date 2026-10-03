local ADDON, LI = ...

local UI = {}
LI.UI = UI

local TAB = { find = 1, test = 2 }
local TABS = { "Crafters", "Test" }
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"
local ROW_HEIGHT = 46
local BOOK_SIZE = 30
local BOOK_GAP = 6
local ICON_X = 28
local ICON_SIZE = 30
local TEXT_X = ICON_X + ICON_SIZE + 10
local PILL_RIGHT = 10
local PILL_WIDTH = 54
local PILL_HEIGHT = 20
local STATUS_WIDTH = PILL_RIGHT + PILL_WIDTH + 12
local ART = "Interface\\AddOns\\" .. ADDON .. "\\art\\"
local FRESH = 15 * 60
local WARM = 3 * 3600
local HEADER_HEIGHT = 34

local SEEN_COLOR = {
	online = { 0.35, 0.95, 0.45 },
	fresh = { 0.80, 0.95, 0.45 },
	warm = { 1.00, 0.82, 0.30 },
	cold = { 0.55, 0.55, 0.55 },
	gone = { 0.45, 0.45, 0.45 },
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
		return true
	end
	return false
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

local function Lighter(color)
	return 0.55 + color[1] * 0.45, 0.55 + color[2] * 0.45, 0.55 + color[3] * 0.45
end

local function Seen(entry)
	if entry.key == LI.playerKey then
		return "you", SEEN_COLOR.online
	end
	if LI.IsChecking(entry.key) then
		return "...", SEEN_COLOR.warm
	end
	if entry.status == "online" then
		return "online", SEEN_COLOR.online
	end
	if entry.sure then
		return "offline", SEEN_COLOR.gone
	end
	local text = LI.ShortAgo(entry.seenAt)
	local age = entry.seenAt and (time() - entry.seenAt) or math.huge
	if age <= FRESH then
		return text, SEEN_COLOR.fresh
	elseif age <= WARM then
		return text, SEEN_COLOR.warm
	end
	return text, SEEN_COLOR.cold
end

local function SeenLine(entry)
	if entry.status == "online" then
		return "Online now"
	end
	local line = entry.seenAt and ("Last seen " .. LI.Ago(entry.seenAt)) or "Not seen yet"
	if entry.sure then
		return "Offline  ·  " .. line:lower()
	end
	return line
end

local function ShowPillTooltip(pill)
	local entry = pill:GetParent().entry
	if not entry then
		return
	end
	local _, color = Seen(entry)
	GameTooltip:SetOwner(pill, "ANCHOR_RIGHT")
	GameTooltip:SetText(SeenLine(entry), color[1], color[2], color[3])
	local c = entry.crafter
	if c.where then
		GameTooltip:AddLine("in " .. c.where, SOFT[1], SOFT[2], SOFT[3])
	end
	if entry.key ~= LI.playerKey then
		GameTooltip:AddLine(LI.IsChecking(entry.key) and "Checking..." or "Click to check if they're online", 0.5, 0.5, 0.5)
	end
	GameTooltip:Show()
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
	local _, color2 = Seen(entry)
	GameTooltip:AddDoubleLine(SeenLine(entry), c.where and ("in " .. c.where) or "", color2[1], color2[2], color2[3], SOFT[1], SOFT[2], SOFT[3])
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

local function ShowBookTooltip(book)
	local p = book.prof
	if not p then
		return
	end
	GameTooltip:SetOwner(book, "ANCHOR_TOP")
	local name = p.name or book.key
	if p.rank and p.rank > 0 then
		name = string.format("%s  %d/%d", name, p.rank, p.max or p.rank)
	end
	GameTooltip:SetText(name, 1, 0.82, 0)
	if p.recipes then
		GameTooltip:AddLine(string.format("%d recipes known", p.count or 0), 1, 1, 1)
	else
		GameTooltip:AddLine("Recipes not read yet", SOFT[1], SOFT[2], SOFT[3])
	end
	if book.match then
		GameTooltip:AddLine("Can make what you searched for", CAN[1], CAN[2], CAN[3])
	end
	if p.link then
		GameTooltip:AddLine("Click to open their recipes", 0.5, 0.5, 0.5)
	else
		GameTooltip:AddLine("Can't be opened until they link it", 0.5, 0.5, 0.5)
	end
	GameTooltip:Show()
end

local function Book(row, i)
	row.books = row.books or {}
	local book = row.books[i]
	if book then
		return book
	end
	book = CreateFrame("Button", nil, row)
	book:SetSize(BOOK_SIZE, BOOK_SIZE)
	book.glow = book:CreateTexture(nil, "BACKGROUND")
	book.glow:SetPoint("TOPLEFT", -3, 3)
	book.glow:SetPoint("BOTTOMRIGHT", 3, -3)
	book.edge = book:CreateTexture(nil, "BORDER")
	book.edge:SetPoint("TOPLEFT", -1, 1)
	book.edge:SetPoint("BOTTOMRIGHT", 1, -1)
	book.edge:SetColorTexture(0, 0, 0, 0.85)
	book.icon = book:CreateTexture(nil, "ARTWORK")
	book.icon:SetAllPoints()
	book.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	book.rank = book:CreateFontString(nil, "OVERLAY", "NumberFontNormalSmall")
	book.rank:SetPoint("BOTTOMRIGHT", 2, -1)
	book.rank:SetJustifyH("RIGHT")
	book:SetHighlightTexture("Interface\\Buttons\\ButtonHilight-Square", "ADD")
	book:SetScript("OnMouseDown", function(self)
		self.icon:SetPoint("TOPLEFT", 1, -1)
		self.icon:SetPoint("BOTTOMRIGHT", 1, -1)
	end)
	book:SetScript("OnMouseUp", function(self)
		self.icon:ClearAllPoints()
		self.icon:SetAllPoints()
	end)
	book:SetScript("OnClick", function(self)
		if OpenLink(self.prof) then
			Sound("IG_SPELLBOOK_OPEN")
		end
	end)
	book:SetScript("OnEnter", ShowBookTooltip)
	book:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	row.books[i] = book
	return book
end

local function UpdateBooks(row, data)
	local entry = data.entry
	local profs = SortedProfs(entry.crafter)
	local matchKey = data.match and data.match.recipeMeta and data.prof
	for i, item in ipairs(profs) do
		local book = Book(row, i)
		local p = item.p
		book.prof, book.key = p, item.key
		book.match = matchKey == item.key
		book.icon:SetTexture(LI.ProfIcon(item.key, p.icon))
		book.icon:SetDesaturated(not p.link)
		book.icon:SetAlpha(p.link and 1 or 0.6)
		book.rank:SetText(p.rank and p.rank > 0 and tostring(p.rank) or "")
		if book.match then
			book.glow:SetColorTexture(CAN[1], CAN[2], CAN[3], 0.75)
			book.glow:Show()
		else
			book.glow:Hide()
		end
		book:ClearAllPoints()
		book:SetPoint("RIGHT", row, "RIGHT", -STATUS_WIDTH - (i - 1) * (BOOK_SIZE + BOOK_GAP), 0)
		book:Show()
	end
	for i = #profs + 1, #(row.books or {}) do
		row.books[i]:Hide()
	end
	local shelf = #profs * (BOOK_SIZE + BOOK_GAP)
	row.line:SetPoint("RIGHT", row, "RIGHT", -STATUS_WIDTH - shelf - 4, 0)
	row.name:SetPoint("RIGHT", row, "RIGHT", -STATUS_WIDTH - shelf - 4, 0)
end

local function ToggleGroup(key)
	LI.settings.collapsed = LI.settings.collapsed or {}
	LI.settings.collapsed[key] = not LI.settings.collapsed[key] or nil
	Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
	UI.Refresh()
end

local UpdateStar

local function BuildRow(row)
	row:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	row.bg = row:CreateTexture(nil, "BACKGROUND")
	row.bg:SetAllPoints()
	row.hl = row:CreateTexture(nil, "HIGHLIGHT")
	row.hl:SetAllPoints()
	row.hl:SetColorTexture(1, 0.82, 0.3, 0.10)

	row.icon = row:CreateTexture(nil, "ARTWORK")
	row.icon:SetSize(ICON_SIZE, ICON_SIZE)
	row.icon:SetPoint("LEFT", ICON_X, 0)
	row.name = Text(row, "GameFontNormalLarge")
	row.name:SetPoint("TOPLEFT", row.icon, "TOPRIGHT", 10, 1)
	row.name:SetWordWrap(false)
	row.line = Text(row, "GameFontHighlightSmall")
	row.line:SetPoint("BOTTOMLEFT", row.icon, "BOTTOMRIGHT", 10, 0)
	row.line:SetWordWrap(false)

	row.pill = CreateFrame("Button", nil, row)
	row.pill:SetSize(PILL_WIDTH, PILL_HEIGHT)
	row.pill:SetPoint("RIGHT", -PILL_RIGHT, 0)
	row.pill.fill = row.pill:CreateTexture(nil, "BACKGROUND")
	row.pill.fill:SetAllPoints()
	row.pill.fill:SetTexture(ART .. "pill")
	row.pill.fill:SetTexCoord(0, 1, 0, 0.75)
	row.pill.edge = row.pill:CreateTexture(nil, "BORDER")
	row.pill.edge:SetAllPoints()
	row.pill.edge:SetTexture(ART .. "pill_edge")
	row.pill.edge:SetTexCoord(0, 1, 0, 0.75)
	row.pill.text = Text(row.pill, "GameFontHighlightSmall", "CENTER")
	row.pill.text:SetPoint("CENTER", 0, 0)
	row.pill.pulse = row.pill:CreateAnimationGroup()
	if row.pill.pulse then
		local fade = row.pill.pulse:CreateAnimation("Alpha")
		if fade then
			fade:SetFromAlpha(1)
			fade:SetToAlpha(0.35)
			fade:SetDuration(0.45)
		end
		row.pill.pulse:SetLooping("BOUNCE")
	end
	row.pill:SetScript("OnClick", function(self)
		local entry = self:GetParent().entry
		if entry and entry.key ~= LI.playerKey and LI.CheckOnline(entry.key) then
			Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
			UI.Refresh()
		end
	end)
	row.pill:SetScript("OnEnter", function(self)
		self.hover = true
		self.fill:SetAlpha(1)
		ShowPillTooltip(self)
	end)
	row.pill:SetScript("OnLeave", function(self)
		self.hover = false
		self.fill:SetAlpha(0.6)
		GameTooltip:Hide()
	end)

	row.toggle = row:CreateTexture(nil, "ARTWORK")
	row.toggle:SetSize(14, 14)
	row.toggle:SetPoint("LEFT", 8, 0)
	row.headIcon = row:CreateTexture(nil, "ARTWORK")
	row.headIcon:SetSize(ICON_SIZE - 6, ICON_SIZE - 6)
	row.headIcon:SetPoint("LEFT", ICON_X + 3, 0)
	row.headIcon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	row.headName = row:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	row.headName:SetFont(TITLE_FONT, 18, "")
	row.headName:SetPoint("LEFT", TEXT_X, 0)
	row.headCount = Text(row, "GameFontDisableSmall")
	row.headCount:SetPoint("BOTTOMLEFT", row.headName, "BOTTOMRIGHT", 10, 2)
	row.headLine = row:CreateTexture(nil, "ARTWORK")
	row.headLine:SetHeight(1)
	row.headLine:SetPoint("BOTTOMLEFT", ICON_X, 2)
	row.headLine:SetPoint("BOTTOMRIGHT", -PILL_RIGHT, 2)
	row.headLine:SetColorTexture(1, 0.82, 0, 0.35)

	row.star = CreateFrame("Button", nil, row)
	row.star:SetSize(16, 16)
	row.star:SetPoint("LEFT", 7, 0)
	row.star.icon = row.star:CreateTexture(nil, "ARTWORK")
	row.star.icon:SetAllPoints()
	row.star:SetScript("OnClick", function(self)
		local entry = self:GetParent().entry
		if entry then
			local on = LI.ToggleFavorite(entry.key)
			Sound(on and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
		end
	end)
	row.star:SetScript("OnEnter", function(self)
		local entry = self:GetParent().entry
		self:SetAlpha(1)
		GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
		GameTooltip:SetText(entry and LI.IsFavorite(entry.key) and "Remove from favorites" or "Add to favorites", 1, 0.82, 0)
		GameTooltip:Show()
	end)
	row.star:SetScript("OnLeave", function(self)
		GameTooltip:Hide()
		UpdateStar(self:GetParent())
	end)

	row.rowParts = { row.icon, row.name, row.line, row.pill, row.star }
	row.headParts = { row.toggle, row.headIcon, row.headName, row.headCount, row.headLine }

	row:SetScript("OnEnter", function(self)
		self.hover = true
		if self.data and not self.data.header then
			UpdateStar(self)
			ShowRowTooltip(self)
		end
	end)
	row:SetScript("OnLeave", function(self)
		self.hover = false
		UpdateStar(self)
		GameTooltip:Hide()
	end)
	row:SetScript("OnClick", function(self, button)
		local data = self.data
		if not data then
			return
		end
		if data.header then
			ToggleGroup(data.group.key)
		elseif button == "RightButton" then
			RowMenu(self)
		else
			UI.Whisper(data.entry.key)
		end
	end)
	row.built = true
end

UpdateStar = function(row)
	local entry = row.entry
	local star = row.star
	if not entry or not star then
		return
	end
	local on = LI.IsFavorite(entry.key)
	if not pcall(star.icon.SetAtlas, star.icon, on and "auctionhouse-icon-favorite" or "auctionhouse-icon-favorite-off") then
		star.icon:SetTexture("Interface\\Common\\ReputationStar")
	end
	if on then
		star:SetAlpha(1)
	elseif row.hover then
		star:SetAlpha(0.6)
	else
		star:SetAlpha(0)
	end
end

local function ShowParts(parts, shown)
	for _, part in ipairs(parts) do
		part:SetShown(shown)
	end
end

local function ClassIcon(texture, classFile)
	if type(classFile) == "string" and texture.SetAtlas then
		local ok = pcall(texture.SetAtlas, texture, "classicon-" .. classFile:lower())
		if ok then
			return true
		end
	end
	return false
end

local function InitHeader(row, data)
	local group = data.group
	ShowParts(row.rowParts, false)
	ShowParts(row.headParts, true)
	for _, book in ipairs(row.books or {}) do
		book:Hide()
	end
	row.bg:SetColorTexture(0, 0, 0, 0)
	local collapsed = LI.settings.collapsed and LI.settings.collapsed[group.key]
	row.toggle:SetTexture(collapsed and "Interface\\Buttons\\UI-PlusButton-Up" or "Interface\\Buttons\\UI-MinusButton-Up")
	if group.favorites then
		if not pcall(row.headIcon.SetAtlas, row.headIcon, "auctionhouse-icon-favorite") then
			row.headIcon:SetTexture("Interface\\Icons\\INV_Misc_Note_01")
		end
	else
		row.headIcon:SetTexture(LI.ProfIcon(group.key, group.icon))
		row.headIcon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	end
	row.headName:SetText(group.name)
	local count = #group.rows
	local text = string.format("%d %s", count, count == 1 and "crafter" or "crafters")
	if group.online > 0 then
		text = text .. string.format("  ·  |cff59f273%d online|r", group.online)
	end
	row.headCount:SetText(text)
end

local function RowLine(data)
	local entry, match = data.entry, data.match
	local p = entry.crafter.profs[data.prof] or {}
	if match.recipeMeta then
		local more = match.makes > 1 and string.format("  |cff8c8c8c+%d more|r", match.makes - 1) or ""
		return "Can make " .. (match.recipeMeta.n or "?") .. more, CAN
	end
	if match.confidence == 1 then
		return "Recipes not read yet, might make it", MAYBE
	end
	local parts = {}
	if p.rank and p.rank > 0 then
		parts[#parts + 1] = string.format("Skill %d", p.rank)
	end
	if p.recipes then
		parts[#parts + 1] = string.format("%d recipes", p.count or 0)
	else
		parts[#parts + 1] = "recipes not read yet"
	end
	return table.concat(parts, "  ·  "), SOFT
end

local function InitRow(row, data)
	if not row.built then
		BuildRow(row)
	end
	row.data = data
	if data.header then
		row.entry = nil
		InitHeader(row, data)
		return
	end
	ShowParts(row.headParts, false)
	ShowParts(row.rowParts, true)
	local entry = data.entry
	row.entry = entry
	local c = entry.crafter
	local stripe = (data.index or 0) % 2 == 0 and 0.05 or 0.0
	row.bg:SetColorTexture(1, 1, 1, stripe)
	local color = LI.ClassColor(c.class) or LI.COLOR.WHITE
	row.name:SetText(LI.ShortName(entry.key))
	row.name:SetTextColor(color[1], color[2], color[3])
	local seenText, seenColor = Seen(entry)
	UpdateStar(row)
	local pill = row.pill
	pill.text:SetText(seenText)
	pill.text:SetTextColor(Lighter(seenColor))
	pill.fill:SetVertexColor(seenColor[1], seenColor[2], seenColor[3], 0.22)
	pill.fill:SetAlpha(pill.hover and 1 or 0.6)
	pill.edge:SetVertexColor(seenColor[1], seenColor[2], seenColor[3], 0.8)
	if pill.pulse then
		if LI.IsChecking(entry.key) then
			pill.pulse:Play()
		else
			pill.pulse:Stop()
			pill:SetAlpha(1)
		end
	end
	local text, textColor = RowLine(data)
	row.line:SetText(text)
	row.line:SetTextColor(textColor[1], textColor[2], textColor[3])
	if not ClassIcon(row.icon, c.class) then
		local p = c.profs[data.prof] or {}
		row.icon:SetTexture(LI.ProfIcon(data.prof, p.icon))
		row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	end
	row.icon:SetDesaturated(entry.status == "offline")
	row.icon:SetAlpha(entry.status == "offline" and 0.6 or 1)
	UpdateBooks(row, data)
end

local function CreateList(parent)
	local box = CreateFrame("Frame", nil, parent, "WowScrollBoxList")
	local bar = CreateFrame("EventFrame", nil, parent, "MinimalScrollBar")
	box:SetPoint("TOPLEFT", 4, -4)
	box:SetPoint("BOTTOMRIGHT", -20, 4)
	bar:SetPoint("TOPLEFT", box, "TOPRIGHT", 4, 0)
	bar:SetPoint("BOTTOMLEFT", box, "BOTTOMRIGHT", 4, 0)
	local view = CreateScrollBoxListLinearView()
	if view.SetElementExtentCalculator then
		view:SetElementExtentCalculator(function(_, data)
			return data.header and HEADER_HEIGHT or ROW_HEIGHT
		end)
	else
		view:SetElementExtent(ROW_HEIGHT)
	end
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
	for _, entry in ipairs(results) do
		if entry.status == "online" then
			online = online + 1
		end
	end
	local list = {}
	local collapsed = LI.settings.collapsed or {}
	for _, group in ipairs(LI.Group(results)) do
		list[#list + 1] = { header = true, group = group }
		if not collapsed[group.key] then
			for i, data in ipairs(group.rows) do
				data.index = i
				list[#list + 1] = data
			end
		end
	end
	main.list:SetList(list)
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
	for i = #entries, math.max(1, #entries - 5), -1 do
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
