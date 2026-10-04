local ADDON, LI = ...

local Book = {}
LI.Book = Book

local ROW = 26
local WIDTH = 400
local SOFT = { 0.72, 0.68, 0.60 }
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"

local frame
local current = { key = nil, prof = nil, query = "" }

local function Text(parent, template, justify)
	local fs = parent:CreateFontString(nil, "OVERLAY", template or "GameFontHighlight")
	fs:SetJustifyH(justify or "LEFT")
	return fs
end

local function Quality(itemID)
	if not itemID or not C_Item or not C_Item.GetItemQualityByID then
		return nil
	end
	local q = LI.Safe(LI.Try(C_Item.GetItemQualityByID, itemID))
	if type(q) ~= "number" then
		return nil
	end
	if ColorManager and ColorManager.GetColorDataForItemQuality then
		local data = LI.Try(ColorManager.GetColorDataForItemQuality, q)
		if data and data.color and data.color.GetRGB then
			return { data.color:GetRGB() }
		end
	end
	local c = ITEM_QUALITY_COLORS and ITEM_QUALITY_COLORS[q]
	if c then
		return { c.r, c.g, c.b }
	end
	return nil
end

local function ItemLink(meta, id)
	if meta and meta.item and C_Item and C_Item.GetItemInfo then
		local _, link = LI.Try(C_Item.GetItemInfo, meta.item)
		link = LI.Safe(link)
		if type(link) == "string" then
			return link
		end
		if C_Item.RequestLoadItemDataByID then
			LI.Try(C_Item.RequestLoadItemDataByID, meta.item)
		end
	end
	if C_Spell and C_Spell.GetSpellLink and not (meta and meta.item) then
		local link = LI.Safe(LI.Try(C_Spell.GetSpellLink, id))
		if type(link) == "string" then
			return link
		end
	end
	return "[" .. ((meta and meta.n) or "?") .. "]"
end

local REAGENT_SIZE = 18
local REAGENT_GAP = 3
local REAGENT_MAX = 5
local HEADER = 24
local tried = {}

local function Meta(id)
	local meta = LI.db.recipes[id]
	if not meta then
		meta = {}
		LI.db.recipes[id] = meta
	end
	if not meta.n and C_Spell and C_Spell.GetSpellName then
		meta.n = LI.Safe(LI.Try(C_Spell.GetSpellName, id))
	end
	if not tried[id] then
		tried[id] = true
		LI.FillRecipe(id)
	end
	return meta
end

local function ItemIcon(itemID)
	local getInstant = (C_Item and C_Item.GetItemInfoInstant) or GetItemInfoInstant
	local icon = select(5, LI.Try(getInstant, itemID))
	return LI.Safe(icon) or "Interface\\Icons\\INV_Misc_QuestionMark"
end

local function ItemName(itemID)
	local name
	if C_Item and C_Item.GetItemNameByID then
		name = LI.Safe(LI.Try(C_Item.GetItemNameByID, itemID))
	end
	if type(name) ~= "string" or name == "" then
		if C_Item and C_Item.RequestLoadItemDataByID then
			LI.Try(C_Item.RequestLoadItemDataByID, itemID)
		end
		return nil
	end
	return name
end

local function Category(meta)
	local cat = meta.c and LI.db.cats[meta.c]
	if cat and cat.n then
		return meta.c, cat.n, cat.o or 0
	end
	return 0, "Other", math.huge
end

local function Matches(meta, name, q)
	if q == "" or name:lower():find(q, 1, true) then
		return true
	end
	for _, r in ipairs(LI.ParseReagents(meta.r)) do
		local rn = ItemName(r.id)
		if rn and rn:lower():find(q, 1, true) then
			return true
		end
	end
	return false
end

function Book.Recipes(key, profKey, query)
	local c = LI.crafters and LI.crafters[key]
	local p = c and c.profs[profKey]
	local list = {}
	if not p or not p.recipes then
		return list
	end
	local q = LI.Trim(query or ""):lower()
	for id in pairs(p.recipes) do
		local meta = Meta(id)
		local name = meta.n or ("Recipe " .. id)
		if Matches(meta, name, q) then
			local catID, catName, order = Category(meta)
			list[#list + 1] = { id = id, meta = meta, name = name, cat = catID, catName = catName, order = order }
		end
	end
	table.sort(list, function(a, b)
		if a.order ~= b.order then
			return a.order < b.order
		end
		if a.catName ~= b.catName then
			return a.catName < b.catName
		end
		if a.name ~= b.name then
			return a.name < b.name
		end
		return a.id < b.id
	end)
	return list
end

function Book.Elements(list)
	local out, last, counts = {}, nil, {}
	for _, data in ipairs(list) do
		counts[data.catName] = (counts[data.catName] or 0) + 1
	end
	local kinds = 0
	for _ in pairs(counts) do
		kinds = kinds + 1
	end
	local headers = kinds > 1 or (kinds == 1 and not counts.Other)
	for _, data in ipairs(list) do
		if data.catName ~= last and headers then
			out[#out + 1] = { header = true, name = data.catName, count = counts[data.catName] }
		end
		last = data.catName
		out[#out + 1] = data
	end
	return out
end

function Book.Ask(key, id)
	local meta = LI.db.recipes[id]
	LI.Whisper(key, "Hi! Could you make " .. ItemLink(meta, id) .. "?")
end

local function LinkInChat(id)
	local link = ItemLink(LI.db.recipes[id], id)
	if ChatFrameUtil and ChatFrameUtil.InsertLink then
		LI.Try(ChatFrameUtil.InsertLink, link)
	end
end

function Book.ReagentLines(meta)
	local lines = {}
	for _, r in ipairs(LI.ParseReagents(meta.r)) do
		local icon = ItemIcon(r.id)
		local name = ItemName(r.id) or "Loading..."
		lines[#lines + 1] = string.format("|T%s:16:16:0:0|t  %d \195\151 %s", tostring(icon), r.qty, name)
	end
	return lines
end

local function RowTooltip(row)
	local data = row.data
	if not data or data.header then
		return
	end
	GameTooltip:SetOwner(row, "ANCHOR_RIGHT")
	if data.meta.item and GameTooltip.SetItemByID then
		LI.Try(GameTooltip.SetItemByID, GameTooltip, data.meta.item)
	elseif GameTooltip.SetSpellByID then
		LI.Try(GameTooltip.SetSpellByID, GameTooltip, data.id)
	end
	if (LI.Try(GameTooltip.NumLines, GameTooltip) or 0) == 0 then
		GameTooltip:SetText(data.name, 1, 1, 1)
	end
	local lines = Book.ReagentLines(data.meta)
	if #lines > 0 then
		GameTooltip:AddLine(" ")
		GameTooltip:AddLine("Reagents", 1, 0.82, 0)
		for _, line in ipairs(lines) do
			GameTooltip:AddLine(line, 1, 1, 1)
		end
	end
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine("Click to ask " .. LI.ShortName(current.key) .. " to make it", 0.5, 0.5, 0.5)
	GameTooltip:AddLine("Shift-click to link it in chat   Right-click for more", 0.5, 0.5, 0.5)
	GameTooltip:Show()
end

local function Reagent(row, i)
	row.reagents = row.reagents or {}
	local b = row.reagents[i]
	if b then
		return b
	end
	b = CreateFrame("Button", nil, row)
	b:SetSize(REAGENT_SIZE, REAGENT_SIZE)
	b.edge = b:CreateTexture(nil, "BORDER")
	b.edge:SetPoint("TOPLEFT", -1, 1)
	b.edge:SetPoint("BOTTOMRIGHT", 1, -1)
	b.edge:SetColorTexture(0, 0, 0, 0.8)
	b.icon = b:CreateTexture(nil, "ARTWORK")
	b.icon:SetAllPoints()
	b.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	b.count = b:CreateFontString(nil, "OVERLAY", "NumberFontNormalSmall")
	b.count:SetPoint("BOTTOMRIGHT", 3, -2)
	b:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_RIGHT")
		if GameTooltip.SetItemByID then
			LI.Try(GameTooltip.SetItemByID, GameTooltip, self.itemID)
		end
		if (LI.Try(GameTooltip.NumLines, GameTooltip) or 0) == 0 then
			GameTooltip:SetText(ItemName(self.itemID) or "Reagent", 1, 1, 1)
		end
		GameTooltip:AddLine(string.format("Needs %d", self.qty or 1), 1, 0.82, 0)
		GameTooltip:Show()
	end)
	b:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	b:SetScript("OnClick", function(self)
		self:GetParent():Click()
	end)
	row.reagents[i] = b
	return b
end

local function UpdateReagents(row, meta)
	local list = LI.ParseReagents(meta.r)
	local shown = math.min(#list, REAGENT_MAX)
	for i = 1, shown do
		local r = list[i]
		local b = Reagent(row, i)
		b.itemID, b.qty = r.id, r.qty
		b.icon:SetTexture(ItemIcon(r.id))
		b.count:SetText(r.qty > 1 and tostring(r.qty) or "")
		b:ClearAllPoints()
		b:SetPoint("RIGHT", row, "RIGHT", -8 - (shown - i) * (REAGENT_SIZE + REAGENT_GAP), 0)
		b:Show()
	end
	for i = shown + 1, #(row.reagents or {}) do
		row.reagents[i]:Hide()
	end
	row.more:SetShown(#list > REAGENT_MAX)
	row.more:SetText("+" .. (#list - REAGENT_MAX))
	local width = shown * (REAGENT_SIZE + REAGENT_GAP) + (#list > REAGENT_MAX and 22 or 0) + 12
	row.name:SetPoint("RIGHT", row, "RIGHT", -width, 0)
	row.more:ClearAllPoints()
	row.more:SetPoint("RIGHT", row, "RIGHT", -10 - shown * (REAGENT_SIZE + REAGENT_GAP), 0)
end

local function InitRow(row, data)
	if not row.built then
		row:RegisterForClicks("LeftButtonUp", "RightButtonUp")
		row.hl = row:CreateTexture(nil, "HIGHLIGHT")
		row.hl:SetAllPoints()
		row.hl:SetColorTexture(1, 0.82, 0.3, 0.10)
		row.icon = row:CreateTexture(nil, "ARTWORK")
		row.icon:SetSize(20, 20)
		row.icon:SetPoint("LEFT", 10, 0)
		row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
		row.name = Text(row, "GameFontHighlight")
		row.name:SetPoint("LEFT", row.icon, "RIGHT", 8, 0)
		row.name:SetWordWrap(false)
		row.more = Text(row, "GameFontDisableSmall", "RIGHT")
		row.head = Text(row, "GameFontNormal")
		row.head:SetPoint("BOTTOMLEFT", 8, 6)
		row.headCount = Text(row, "GameFontDisableSmall")
		row.headCount:SetPoint("LEFT", row.head, "RIGHT", 8, 0)
		row.headLine = row:CreateTexture(nil, "ARTWORK")
		row.headLine:SetHeight(1)
		row.headLine:SetPoint("BOTTOMLEFT", 8, 2)
		row.headLine:SetPoint("BOTTOMRIGHT", -8, 2)
		row.headLine:SetColorTexture(1, 0.82, 0, 0.3)
		row:SetScript("OnEnter", RowTooltip)
		row:SetScript("OnLeave", function()
			GameTooltip:Hide()
		end)
		row:SetScript("OnClick", function(self, button)
			if not self.data or self.data.header then
				return
			end
			if button == "RightButton" then
				local id = self.data.id
				if MenuUtil and MenuUtil.CreateContextMenu then
					MenuUtil.CreateContextMenu(self, function(_, root)
						root:CreateButton("Ask " .. LI.ShortName(current.key) .. " to make it", function()
							Book.Ask(current.key, id)
						end)
						root:CreateButton("Post a request for it", function()
							LI.WorkUI.OpenDialog(id)
						end)
					end)
				end
			elseif IsShiftKeyDown and IsShiftKeyDown() then
				LinkInChat(self.data.id)
			else
				Book.Ask(current.key, self.data.id)
			end
		end)
		row.built = true
	end
	row.data = data
	local header = data.header == true
	row.head:SetShown(header)
	row.headCount:SetShown(header)
	row.headLine:SetShown(header)
	row.icon:SetShown(not header)
	row.name:SetShown(not header)
	if header then
		row.hl:SetAlpha(0)
		row.head:SetText(data.name)
		row.headCount:SetText(tostring(data.count))
		row.more:Hide()
		for _, b in ipairs(row.reagents or {}) do
			b:Hide()
		end
		return
	end
	row.hl:SetAlpha(1)
	row.icon:SetTexture(data.meta.i or "Interface\\Icons\\INV_Misc_QuestionMark")
	row.name:SetText(data.name)
	local color = Quality(data.meta.item) or { 1, 1, 1 }
	row.name:SetTextColor(color[1], color[2], color[3])
	UpdateReagents(row, data.meta)
end

local function Refresh()
	if not frame or not frame:IsShown() then
		return
	end
	local c = LI.crafters and LI.crafters[current.key]
	local p = c and c.profs[current.prof]
	if not p then
		frame:Hide()
		return
	end
	local color = LI.ClassColor(c.class) or LI.COLOR.WHITE
	frame.who:SetText(LI.ShortName(current.key))
	frame.who:SetTextColor(color[1], color[2], color[3])
	frame.profIcon:SetTexture(LI.ProfIcon(current.prof, p.icon))
	local title = p.name or current.prof
	if p.rank and p.rank > 0 then
		title = string.format("%s  %d/%d", title, p.rank, p.max or p.rank)
	end
	frame.prof:SetText(title)
	local list = Book.Recipes(current.key, current.prof, current.query)
	frame.list:SetDataProvider(CreateDataProvider(Book.Elements(list)), ScrollBoxConstants and ScrollBoxConstants.RetainScrollPosition)
	local info
	if not p.recipes then
		info = "Recipes not read yet"
	else
		local source = ({ auto = "from a link", click = "from a link", shared = "shared by them", own = "yours" })[p.via] or ""
		info = string.format("%d %s  ·  %s %s", p.count or 0, (p.count or 0) == 1 and "recipe" or "recipes", source, p.read and LI.Ago(p.read) or "")
	end
	frame.info:SetText(info)
	frame.empty:SetShown(#list == 0)
	frame.empty:SetText(not p.recipes and "Their recipes haven't been read yet.\nOpen it in game while they're online, or wait for them to link it." or "No recipes match.")
	local stateText, stateColor, canOpen
	if current.key == LI.playerKey then
		stateText, stateColor, canOpen = "", SOFT, true
	elseif not p.link then
		stateText, stateColor, canOpen = "Not linked yet", SOFT, false
	elseif LI.IsChecking(current.key) then
		stateText, stateColor, canOpen = "Checking...", { 1, 0.82, 0.3 }, false
	else
		local status, seen, sure = LI.Status(current.key)
		if status == "online" then
			stateText, stateColor, canOpen = "Online", { 0.35, 0.95, 0.45 }, true
		elseif sure then
			stateText, stateColor, canOpen = "Offline", { 0.55, 0.55, 0.55 }, false
		else
			stateText, stateColor, canOpen = seen and ("Last seen " .. LI.Ago(seen)) or "", SOFT, true
		end
	end
	frame.state:SetText(stateText)
	frame.state:SetTextColor(stateColor[1], stateColor[2], stateColor[3])
	frame.live:SetEnabled(canOpen and p.link ~= nil)
end

local function Create()
	local main = LI.UI.Main()
	frame = CreateFrame("Frame", "LinkedInnBook", main, "ButtonFrameTemplate")
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
		frame:SetTitle("Recipes")
	end
	frame.profIcon = frame:CreateTexture(nil, "ARTWORK")
	frame.profIcon:SetSize(36, 36)
	frame.profIcon:SetPoint("TOPLEFT", 14, -30)
	frame.profIcon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	frame.who = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	frame.who:SetPoint("TOPLEFT", frame.profIcon, "TOPRIGHT", 10, -1)
	frame.prof = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	frame.prof:SetFont(TITLE_FONT, 16, "")
	frame.prof:SetPoint("BOTTOMLEFT", frame.profIcon, "BOTTOMRIGHT", 10, 1)
	frame.search = CreateFrame("EditBox", nil, frame, "SearchBoxTemplate")
	frame.search:SetSize(WIDTH - 40, 20)
	frame.search:SetPoint("TOPLEFT", 22, -74)
	frame.search:SetScript("OnTextChanged", function(self)
		if SearchBoxTemplate_OnTextChanged then
			pcall(SearchBoxTemplate_OnTextChanged, self)
		end
		current.query = self:GetText() or ""
		Refresh()
	end)
	if frame.Inset then
		frame.Inset:ClearAllPoints()
		frame.Inset:SetPoint("TOPLEFT", 4, -100)
		frame.Inset:SetPoint("BOTTOMRIGHT", -6, 54)
	end
	local parent = frame.Inset or frame
	frame.list = CreateFrame("Frame", nil, parent, "WowScrollBoxList")
	local bar = CreateFrame("EventFrame", nil, parent, "MinimalScrollBar")
	frame.list:SetPoint("TOPLEFT", 4, -4)
	frame.list:SetPoint("BOTTOMRIGHT", -20, 4)
	bar:SetPoint("TOPLEFT", frame.list, "TOPRIGHT", 4, 0)
	bar:SetPoint("BOTTOMLEFT", frame.list, "BOTTOMRIGHT", 4, 0)
	local view = CreateScrollBoxListLinearView()
	if view.SetElementExtentCalculator then
		view:SetElementExtentCalculator(function(_, data)
			return data.header and HEADER or ROW
		end)
	else
		view:SetElementExtent(ROW)
	end
	view:SetElementInitializer("Button", function(row, data)
		LI.SafeCall(InitRow, row, data)
	end)
	ScrollUtil.InitScrollBoxListWithScrollBar(frame.list, bar, view)
	frame.empty = Text(parent, "GameFontDisable", "CENTER")
	frame.empty:SetPoint("CENTER")
	frame.empty:SetWidth(WIDTH - 60)
	frame.empty:SetSpacing(3)
	frame.info = Text(frame, "GameFontDisableSmall")
	frame.info:SetPoint("BOTTOMLEFT", 14, 34)
	frame.live = CreateFrame("Button", nil, frame, "UIPanelButtonTemplate")
	frame.live:SetSize(150, 22)
	frame.live:SetText("Open in game")
	frame.live:SetPoint("BOTTOMRIGHT", -10, 8)
	frame.live:SetScript("OnClick", function(self)
		if not self:IsEnabled() then
			return
		end
		local c = LI.crafters[current.key]
		local p = c and c.profs[current.prof]
		if p and p.link and SetItemRef then
			SetItemRef(p.link, p.text or "", "LeftButton")
		end
	end)
	frame.live:SetMotionScriptsWhileDisabled(true)
	frame.live:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_TOP")
		GameTooltip:SetText("Open in game", 1, 0.82, 0)
		if self:IsEnabled() then
			GameTooltip:AddLine("Opens their real profession window.", 1, 1, 1, true)
		else
			GameTooltip:AddLine("Only works while they're online. The recipes above are saved, so you can still browse and ask.", 1, 1, 1, true)
		end
		GameTooltip:Show()
	end)
	frame.state = Text(frame, "GameFontHighlightSmall", "RIGHT")
	frame.state:SetPoint("RIGHT", frame.live, "LEFT", -10, 0)
	frame.live:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	frame:SetScript("OnShow", Refresh)
	frame:HookScript("OnHide", function()
		LI.Fire("BookChanged")
	end)
	frame:Hide()
end

function Book.Open(key, profKey, query)
	if not LI.ready or not LI.UI.Main() then
		return
	end
	if not frame then
		Create()
	end
	if frame:IsShown() and current.key == key and current.prof == profKey and (query or "") == "" then
		frame:Hide()
		return
	end
	if LI.Settings then
		LI.Settings.Hide()
	end
	current.key, current.prof = key, profKey
	current.query = ""
	if query and query ~= "" then
		local hits = Book.Recipes(key, profKey, query)
		if #hits > 0 then
			current.query = query
		end
	end
	frame.search:SetText(current.query)
	frame:Show()
	LI.ProbeOnline(key)
	Refresh()
	LI.Fire("BookChanged")
end

function Book.Frame()
	return frame
end

function Book.Current()
	return current
end

function Book.IsOpen(key, profKey)
	if not frame or not frame:IsShown() or current.key ~= key then
		return false
	end
	return profKey == nil or current.prof == profKey
end

local function Later()
	if frame and frame:IsShown() then
		LI.After(0.1, Refresh)
	end
end

LI.Listen("CraftersChanged", Later)
LI.Listen("StatusChanged", Later)
