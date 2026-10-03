local ADDON, LI = ...

local UI = {}
LI.UI = UI

local TAB = { find = 1, work = 2, test = 3 }
local TABS = { "Crafters", "Work" }
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
local COMPACT_HEIGHT = 24
local COMPACT_ICON = 18
local COMPACT_BOOK = 18
local COMPACT_PILL_WIDTH = 44
local COMPACT_PILL_HEIGHT = 16
local NAME_MAX = 170

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
			root:CreateButton("Open " .. (item.p.name or item.key), function()
				LI.Book.Open(entry.key, item.key, filter.search)
			end)
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
	GameTooltip:AddLine("Click to see their recipes", 0.5, 0.5, 0.5)
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
		local entry = self:GetParent().entry
		if entry then
			LI.Book.Open(entry.key, self.key, filter.search)
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

local function Compact()
	return LI.settings.compact == true
end

local function LayoutRow(row)
	local compact = Compact()
	if row.compact == compact then
		return
	end
	row.compact = compact
	row.icon:ClearAllPoints()
	row.name:ClearAllPoints()
	row.line:ClearAllPoints()
	if compact then
		row.icon:SetSize(COMPACT_ICON, COMPACT_ICON)
		row.icon:SetPoint("LEFT", ICON_X + (ICON_SIZE - COMPACT_ICON) / 2, 0)
		row.name:SetFontObject("GameFontNormal")
		row.name:SetPoint("LEFT", ICON_X + ICON_SIZE + 10, 0)
		row.line:SetPoint("LEFT", row.name, "RIGHT", 10, 0)
		row.pill:SetSize(COMPACT_PILL_WIDTH, COMPACT_PILL_HEIGHT)
	else
		row.icon:SetSize(ICON_SIZE, ICON_SIZE)
		row.icon:SetPoint("LEFT", ICON_X, 0)
		row.name:SetFontObject("GameFontNormalLarge")
		row.name:SetWidth(0)
		row.name:SetPoint("TOPLEFT", row.icon, "TOPRIGHT", 10, 1)
		row.line:SetPoint("BOTTOMLEFT", row.icon, "BOTTOMRIGHT", 10, 0)
		row.pill:SetSize(PILL_WIDTH, PILL_HEIGHT)
	end
end

local function UpdateBooks(row, data)
	local entry = data.entry
	local compact = Compact()
	local size = compact and COMPACT_BOOK or BOOK_SIZE
	local gap = compact and 4 or BOOK_GAP
	local right = compact and (PILL_RIGHT + COMPACT_PILL_WIDTH + 12) or STATUS_WIDTH
	local profs = SortedProfs(entry.crafter)
	local matchKey = data.match and data.match.recipeMeta and data.prof
	for i, item in ipairs(profs) do
		local book = Book(row, i)
		local p = item.p
		book.prof, book.key = p, item.key
		book.match = matchKey == item.key
		book.icon:SetTexture(LI.ProfIcon(item.key, p.icon))
		book.icon:SetDesaturated(not p.recipes)
		book.icon:SetAlpha(p.recipes and 1 or 0.6)
		book.rank:SetText(p.rank and p.rank > 0 and tostring(p.rank) or "")
		if book.match then
			book.glow:SetColorTexture(CAN[1], CAN[2], CAN[3], 0.75)
			book.glow:Show()
		else
			book.glow:Hide()
		end
		book:SetSize(size, size)
		book.rank:SetShown(not compact)
		book:ClearAllPoints()
		book:SetPoint("RIGHT", row, "RIGHT", -right - (i - 1) * (size + gap), 0)
		book:Show()
	end
	for i = #profs + 1, #(row.books or {}) do
		row.books[i]:Hide()
	end
	local shelf = #profs * (size + gap)
	row.line:SetPoint("RIGHT", row, "RIGHT", -right - shelf - 4, 0)
	if compact then
		local width = LI.Try(row.name.GetStringWidth, row.name) or 0
		row.name:SetWidth(math.min(math.max(width, 1), NAME_MAX))
	else
		row.name:SetPoint("RIGHT", row, "RIGHT", -right - shelf - 4, 0)
	end
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
	LayoutRow(row)
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
			if data.header then
				return HEADER_HEIGHT
			end
			return Compact() and COMPACT_HEIGHT or ROW_HEIGHT
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

local function ProfsSelected()
	LI.settings.profs = LI.settings.profs or {}
	return LI.settings.profs
end

local function AnySelected(chips)
	local selected = ProfsSelected()
	for _, info in ipairs(chips) do
		if selected[info.key] then
			return true
		end
	end
	return false
end

local function UpdateChips()
	local profs = LI.ProfessionChips(LI.settings.secondary)
	local chips = main.chips
	local selected = ProfsSelected()
	local any = AnySelected(profs)
	for i, info in ipairs(profs) do
		local chip = chips[i]
		if not chip then
			chip = CreateFrame("Button", nil, main.chipBar)
			chip:SetSize(30, 30)
			chip.sel = chip:CreateTexture(nil, "BACKGROUND")
			chip.sel:SetPoint("TOPLEFT", -3, 3)
			chip.sel:SetPoint("BOTTOMRIGHT", 3, -3)
			chip.sel:SetColorTexture(1, 0.82, 0.2, 0.9)
			chip.edge = chip:CreateTexture(nil, "BORDER")
			chip.edge:SetPoint("TOPLEFT", -1, 1)
			chip.edge:SetPoint("BOTTOMRIGHT", 1, -1)
			chip.edge:SetColorTexture(0, 0, 0, 0.85)
			chip.icon = chip:CreateTexture(nil, "ARTWORK")
			chip.icon:SetAllPoints()
			chip.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
			chip.count = chip:CreateFontString(nil, "OVERLAY", "NumberFontNormalSmall")
			chip.count:SetPoint("BOTTOMRIGHT", 2, -1)
			chip.hl = chip:CreateTexture(nil, "HIGHLIGHT")
			chip.hl:SetAllPoints()
			chip.hl:SetColorTexture(1, 1, 1, 0.15)
			chip:SetScript("OnClick", function(self)
				local set = ProfsSelected()
				set[self.key] = not set[self.key] or nil
				Sound(set[self.key] and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
				UI.Refresh()
				if self:IsMouseOver() then
					self:GetScript("OnEnter")(self)
				end
			end)
			chip:SetScript("OnEnter", function(self)
				GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
				GameTooltip:SetText(self.name or "", 1, 0.82, 0)
				local n = self.n or 0
				GameTooltip:AddLine(n == 0 and "Nobody seen yet" or string.format("%d %s", n, n == 1 and "crafter" or "crafters"), 1, 1, 1)
				GameTooltip:AddLine(ProfsSelected()[self.key] and "Click to remove from the filter" or "Click to add to the filter", 0.5, 0.5, 0.5)
				GameTooltip:Show()
			end)
			chip:SetScript("OnLeave", function()
				GameTooltip:Hide()
			end)
			chips[i] = chip
		end
		chip.key, chip.name, chip.n = info.key, info.name, info.count
		chip.icon:SetTexture(LI.ProfIcon(info.key, info.icon))
		local on = selected[info.key] == true
		chip.sel:SetShown(on)
		chip.icon:SetDesaturated((any and not on) or info.count == 0)
		chip.icon:SetAlpha(on and 1 or (any and 0.55) or (info.count == 0 and 0.45) or 1)
		chip.count:SetText(info.count > 0 and tostring(info.count) or "")
		chip:ClearAllPoints()
		chip:SetPoint("LEFT", main.chipBar, "LEFT", (i - 1) * 36 + 3, 0)
		chip:Show()
	end
	for i = #profs + 1, #chips do
		chips[i]:Hide()
	end
	main.clearChips:ClearAllPoints()
	main.clearChips:SetPoint("LEFT", main.chipBar, "LEFT", #profs * 36 + 4, 0)
	main.clearChips:SetShown(any)
	main.secondaryBox:SetChecked(LI.settings.secondary and true or false)
	main.maxBox:SetChecked(LI.settings.maxOnly and true or false)
	main.compactBox:SetChecked(LI.settings.compact and true or false)
	local done, total = LI.Reader.ScanProgress()
	if done then
		main.scan.text:SetText(string.format("Scanning %d/%d", done, total))
		main.scan:SetEnabled(false)
	else
		main.scan.text:SetText("Scan nearby")
		main.scan:SetEnabled((LI.ScanReady()))
	end
	if main.scan:IsEnabled() then
		main.scan.text:SetTextColor(1, 0.82, 0)
		main.scan.icon:SetDesaturated(false)
		main.scan.icon:SetAlpha(1)
	else
		main.scan.text:SetTextColor(0.5, 0.5, 0.5)
		main.scan.icon:SetDesaturated(true)
		main.scan.icon:SetAlpha(0.5)
	end
end

local function RefreshFind()
	local opts = { profs = ProfsSelected(), secondary = LI.settings.secondary, kind = LI.settings.kind, maxOnly = LI.settings.maxOnly }
	local results = LI.Search(filter.search, opts)
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
	local total = 0
	for key in pairs(LI.crafters) do
		if key ~= LI.playerKey then
			total = total + 1
		end
	end
	main.count:SetText(string.format("%d shown  ·  %d crafters remembered", #results, total))
	local empty = #results == 0
	main.empty:SetShown(empty)
	if empty then
		if total == 0 then
			main.emptyHead:SetText("The inn is quiet")
			main.emptyText:SetText("Linked Inn listens to Trade, General, guild and party chat. Whenever someone links a profession, they show up here.")
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

local function SharingLines()
	local sync = LI.test.sync or {}
	local channel
	if sync.echo then
		channel = "working"
	elseif sync.joined then
		channel = "joined, waiting for an echo"
	else
		channel = "not joined yet"
	end
	local own
	if LI.Sync and LI.Sync.Version() then
		local c = LI.crafters and LI.crafters[LI.playerKey]
		local n = 0
		for key in pairs(c and c.profs or {}) do
			if not LI.GATHERING[key] then
				n = n + 1
			end
		end
		own = string.format("shared (%d %s)", n, n == 1 and "profession" or "professions")
	else
		own = "nothing to share yet"
	end
	return {
		{ "Hidden channel", channel },
		{ "Your professions", own },
		{ "Linked Inn users heard", tostring(sync.heard or 0) },
		{ "Profession lists received", tostring(sync.lists or 0) },
		{ "Your list sent", string.format("%d %s", sync.answered or 0, (sync.answered or 0) == 1 and "time" or "times") },
	}
end

local function FillLines(labels, values, lines)
	for i, pair in ipairs(lines) do
		labels[i]:SetText(pair[1])
		values[i]:SetText(pair[2])
	end
end

local function RefreshTest()
	local page = main.testPage
	local t = LI.test
	local head, color, body = Verdict()
	page.head:SetText(head)
	page.head:SetTextColor(color[1], color[2], color[3])
	page.body:SetText(body)
	local auto = t.auto
	FillLines(page.labels, page.values, {
		{ "Profession links seen in chat", tostring(t.links) },
		{ "Read automatically", string.format("%d of %d tries", auto.ok, auto.tries) },
		{ "No reply / error", string.format("%d / %d", auto.timeout, auto.err) },
		{ "Window popped up while reading", tostring(auto.flashed) },
		{ "Read by clicking a link", tostring(t.click) },
		{ "Read from a recipe link", string.format("%d of %d tries", (t.built or {}).ok or 0, (t.built or {}).tries or 0) },
	})
	FillLines(page.syncLabels, page.syncValues, SharingLines())
	local log = {}
	local entries = LI.db.log
	for i = #entries, math.max(1, #entries - 3), -1 do
		log[#log + 1] = date("%H:%M", entries[i].t) .. "  " .. entries[i].m
	end
	page.log:SetText(#log > 0 and table.concat(log, "\n") or "Nothing yet.")
	page.auto:SetChecked(LI.settings.autoRead and true or false)
	page.retry:SetShown(LI.Reader.IsBroken())
end

local function Lines(page, top, count)
	local labels, values = {}, {}
	for i = 1, count do
		local label = Text(page, "GameFontNormal")
		label:SetPoint("TOPLEFT", 40, top - (i - 1) * 18)
		local value = Text(page, "GameFontHighlight", "RIGHT")
		value:SetPoint("TOPRIGHT", -40, top - (i - 1) * 18)
		labels[i], values[i] = label, value
	end
	return labels, values
end

local function SectionHead(page, top, text)
	local head = Text(page, "GameFontNormalSmall")
	head:SetPoint("TOPLEFT", 40, top)
	head:SetText(text)
	head:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	local line = page:CreateTexture(nil, "ARTWORK")
	line:SetHeight(1)
	line:SetPoint("TOPLEFT", 40, top - 14)
	line:SetPoint("TOPRIGHT", -40, top - 14)
	line:SetColorTexture(1, 0.82, 0, 0.25)
end

local function Check(page, label, onClick)
	local box = CreateFrame("CheckButton", nil, page, "UICheckButtonTemplate")
	box:SetSize(24, 24)
	box:SetScript("OnClick", function(self)
		LI.SafeCall(onClick, self:GetChecked() and true or false)
		UI.Refresh()
	end)
	local text = Text(page, "GameFontHighlightSmall")
	text:SetPoint("LEFT", box, "RIGHT", 2, 0)
	text:SetText(label)
	box.label = text
	return box
end

local function BuildTestPage(page)
	page.head = page:CreateFontString(nil, "OVERLAY", "GameFontNormalHuge")
	page.head:SetFont(TITLE_FONT, 26, "")
	page.head:SetPoint("TOP", 0, -18)
	page.body = Text(page, "GameFontHighlight", "CENTER")
	page.body:SetPoint("TOP", page.head, "BOTTOM", 0, -6)
	page.body:SetWidth(440)
	page.body:SetSpacing(2)
	SectionHead(page, -84, "Reading links")
	page.labels, page.values = Lines(page, -104, 6)
	SectionHead(page, -216, "Sharing with other Linked Inn users")
	page.syncLabels, page.syncValues = Lines(page, -236, 5)
	local logHead = Text(page, "GameFontNormalSmall")
	logHead:SetPoint("TOPLEFT", 40, -334)
	logHead:SetText("Latest")
	logHead:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	page.log = Text(page, "GameFontDisableSmall")
	page.log:SetPoint("TOPLEFT", logHead, "BOTTOMLEFT", 0, -4)
	page.log:SetWidth(440)
	page.log:SetSpacing(2)
	page.auto = Check(page, "Read links automatically", function(on)
		LI.settings.autoRead = on
	end)
	page.auto:SetPoint("BOTTOMLEFT", 34, 8)
	page.retry = Button(page, "Try again", 100, function()
		LI.Reader.Retry()
	end)
	page.retry:SetPoint("LEFT", page.auto.label, "RIGHT", 10, 0)
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
	local workShown = main.selectedTab == TAB.work
	main.findPage:SetShown(findShown)
	main.workPage:SetShown(workShown)
	main.workHeader:SetShown(workShown)
	main.testPage:SetShown(main.selectedTab == TAB.test)
	local unseen = LI.Work.UnseenCount()
	local workTab = _G["LinkedInnFrameTab" .. TAB.work]
	if workTab then
		workTab:SetText(unseen > 0 and string.format("Work (%d)", unseen) or "Work")
		if PanelTemplates_TabResize then
			pcall(PanelTemplates_TabResize, workTab, 15)
		end
	end
	main.search:SetShown(findShown)
	main.kind:SetShown(findShown)
	main.chipBar:SetShown(findShown)
	main.secondaryBox:SetShown(findShown)
	main.maxBox:SetShown(findShown)
	main.compactBox:SetShown(findShown)
	main.scan:SetShown(findShown)
	main.compactLabel:SetShown(findShown)
	main.maxLabel:SetShown(findShown)
	main.secondaryLabel:SetShown(findShown)
	main.count:SetShown(findShown)
	if findShown then
		RefreshFind()
	elseif workShown then
		LI.WorkUI.Refresh()
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


	main.chipBar = CreateFrame("Frame", nil, main)
	main.chipBar:SetPoint("TOPLEFT", 66, -60)
	main.chipBar:SetPoint("TOPRIGHT", -10, -60)
	main.chipBar:SetHeight(36)
	main.chips = {}
	main.clearChips = CreateFrame("Button", nil, main.chipBar)
	main.clearChips:SetSize(44, 30)
	main.clearChips.text = Text(main.clearChips, "GameFontNormalSmall", "LEFT")
	main.clearChips.text:SetPoint("LEFT", 4, 0)
	main.clearChips.text:SetText("Clear")
	main.clearChips:SetScript("OnClick", function()
		LI.settings.profs = {}
		Sound("IG_MAINMENU_OPTION_CHECKBOX_OFF")
		UI.Refresh()
	end)
	main.clearChips:SetScript("OnEnter", function(self)
		self.text:SetTextColor(1, 1, 1)
	end)
	main.clearChips:SetScript("OnLeave", function(self)
		self.text:SetTextColor(1, 0.82, 0)
	end)
	main.clearChips:Hide()
	main.secondaryBox = CreateFrame("CheckButton", nil, main, "UICheckButtonTemplate")
	main.secondaryBox:SetSize(24, 24)
	main.secondaryBox:SetPoint("LEFT", main.kind, "RIGHT", 8, 0)
	main.secondaryBox:SetScript("OnClick", function(self)
		LI.settings.secondary = self:GetChecked() and true or false
		Sound(LI.settings.secondary and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
		UI.Refresh()
	end)
	main.secondaryBox:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
		GameTooltip:SetText("Secondary professions", 1, 0.82, 0)
		GameTooltip:AddLine("Also show Cooking, First Aid and Fishing.", 1, 1, 1, true)
		GameTooltip:Show()
	end)
	main.secondaryBox:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	main.secondaryLabel = Text(main, "GameFontHighlightSmall")
	main.secondaryLabel:SetPoint("LEFT", main.secondaryBox, "RIGHT", 0, 0)
	main.secondaryLabel:SetText("Secondary")

	main.maxBox = CreateFrame("CheckButton", nil, main, "UICheckButtonTemplate")
	main.maxBox:SetSize(24, 24)
	main.maxBox:SetPoint("TOPLEFT", main.secondaryBox, "BOTTOMLEFT", 0, -11)
	main.maxLabel = Text(main, "GameFontHighlightSmall")
	main.maxLabel:SetPoint("LEFT", main.maxBox, "RIGHT", 0, 0)
	main.maxLabel:SetText("Max skill only")
	main.maxBox:SetScript("OnClick", function(self)
		LI.settings.maxOnly = self:GetChecked() and true or false
		Sound(LI.settings.maxOnly and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
		UI.Refresh()
	end)
	main.maxBox:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
		GameTooltip:SetText("Max skill only", 1, 0.82, 0)
		GameTooltip:AddLine("Only crafters at the highest skill level.", 1, 1, 1, true)
		GameTooltip:Show()
	end)
	main.maxBox:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)


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

	main.workPage = CreateFrame("Frame", nil, main.Inset)
	main.workPage:SetAllPoints()
	LI.WorkUI.Build(main.workPage)
	main.workHeader = LI.WorkUI.BuildHeader(main)
	main.workPage:Hide()

	main.count = Text(main, "GameFontDisableSmall", "RIGHT")
	main.count:SetPoint("RIGHT", main, "BOTTOMRIGHT", -12, 14)
	main.compactBox = CreateFrame("CheckButton", nil, main, "UICheckButtonTemplate")
	main.compactBox:SetSize(22, 22)
	main.compactBox:SetPoint("LEFT", main, "BOTTOMLEFT", 8, 15)
	main.compactBox:SetScript("OnClick", function(self)
		LI.settings.compact = self:GetChecked() and true or false
		Sound(LI.settings.compact and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
		UI.Refresh()
	end)
	main.compactLabel = Text(main, "GameFontHighlightSmall")
	main.compactLabel:SetPoint("LEFT", main.compactBox, "RIGHT", 0, -1)
	main.compactLabel:SetText("Compact")
	main.scan = CreateFrame("Button", nil, main)
	main.scan:SetSize(110, 20)
	main.scan:SetPoint("LEFT", main.compactLabel, "RIGHT", 18, 0)
	main.scan.icon = main.scan:CreateTexture(nil, "ARTWORK")
	main.scan.icon:SetSize(14, 14)
	main.scan.icon:SetPoint("LEFT", 0, 0)
	if not pcall(main.scan.icon.SetAtlas, main.scan.icon, "common-search-magnifyingglass") then
		main.scan.icon:SetTexture("Interface\\Common\\UI-Searchbox-Icon")
	end
	main.scan.text = Text(main.scan, "GameFontNormalSmall")
	main.scan.text:SetPoint("LEFT", main.scan.icon, "RIGHT", 4, 0)
	main.scan.text:SetText("Scan nearby")
	main.scan:SetScript("OnClick", function()
		if LI.ScanNearby() then
			Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
		end
		UI.Refresh()
	end)
	main.scan:SetMotionScriptsWhileDisabled(true)
	main.scan:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_TOP")
		if self:IsEnabled() then
			self.text:SetTextColor(1, 1, 1)
		end
		GameTooltip:SetText("Scan nearby", 1, 0.82, 0)
		local ready, why, left = LI.ScanReady()
		if why == "cooldown" then
			GameTooltip:AddLine(string.format("Ready again in %s", LI.Duration(left)), 1, 1, 1)
		elseif why == "combat" then
			GameTooltip:AddLine("Not in combat", 1, 1, 1)
		end
		GameTooltip:Show()
	end)
	main.scan:SetScript("OnLeave", function(self)
		GameTooltip:Hide()
		UI.Refresh()
	end)

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
LI.Listen("WorkChanged", QueueRefresh)
LI.Listen("WorkSeen", QueueRefresh)
LI.Listen("ScanDone", QueueRefresh)

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
