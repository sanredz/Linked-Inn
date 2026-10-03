local ADDON, LI = ...

local Book = {}
LI.Book = Book

local ROW = 26
local WIDTH = 330
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

local function Meta(id)
	local meta = LI.db.recipes[id]
	if not meta then
		meta = {}
		LI.db.recipes[id] = meta
	end
	if not meta.n and C_Spell and C_Spell.GetSpellName then
		meta.n = LI.Safe(LI.Try(C_Spell.GetSpellName, id))
	end
	return meta
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
		if q == "" or name:lower():find(q, 1, true) then
			list[#list + 1] = { id = id, meta = meta, name = name }
		end
	end
	table.sort(list, function(a, b)
		if a.name ~= b.name then
			return a.name < b.name
		end
		return a.id < b.id
	end)
	return list
end

function Book.Ask(key, id)
	local meta = LI.db.recipes[id]
	local target = LI.WhisperTarget(key)
	if ChatFrameUtil and ChatFrameUtil.SendTell then
		ChatFrameUtil.SendTell(target)
	elseif ChatFrame_SendTell then
		ChatFrame_SendTell(target)
	else
		return
	end
	local box = ChatFrameUtil and ChatFrameUtil.GetActiveWindow and LI.Try(ChatFrameUtil.GetActiveWindow)
	if box and box.Insert then
		box:Insert("Hi! Could you make " .. ItemLink(meta, id) .. "?")
	end
end

local function LinkInChat(id)
	local link = ItemLink(LI.db.recipes[id], id)
	if ChatFrameUtil and ChatFrameUtil.InsertLink then
		LI.Try(ChatFrameUtil.InsertLink, link)
	end
end

local function RowTooltip(row)
	local data = row.data
	if not data then
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
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine("Click to ask " .. LI.ShortName(current.key) .. " to make it", 0.5, 0.5, 0.5)
	GameTooltip:AddLine("Shift-click to link it in chat", 0.5, 0.5, 0.5)
	GameTooltip:Show()
end

local function InitRow(row, data)
	if not row.built then
		row:RegisterForClicks("LeftButtonUp")
		row.hl = row:CreateTexture(nil, "HIGHLIGHT")
		row.hl:SetAllPoints()
		row.hl:SetColorTexture(1, 0.82, 0.3, 0.10)
		row.icon = row:CreateTexture(nil, "ARTWORK")
		row.icon:SetSize(20, 20)
		row.icon:SetPoint("LEFT", 6, 0)
		row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
		row.name = Text(row, "GameFontHighlight")
		row.name:SetPoint("LEFT", row.icon, "RIGHT", 8, 0)
		row.name:SetPoint("RIGHT", -6, 0)
		row.name:SetWordWrap(false)
		row:SetScript("OnEnter", RowTooltip)
		row:SetScript("OnLeave", function()
			GameTooltip:Hide()
		end)
		row:SetScript("OnClick", function(self)
			if not self.data then
				return
			end
			if IsShiftKeyDown and IsShiftKeyDown() then
				LinkInChat(self.data.id)
			else
				Book.Ask(current.key, self.data.id)
			end
		end)
		row.built = true
	end
	row.data = data
	row.icon:SetTexture(data.meta.i or "Interface\\Icons\\INV_Misc_QuestionMark")
	row.name:SetText(data.name)
	local color = Quality(data.meta.item) or { 1, 1, 1 }
	row.name:SetTextColor(color[1], color[2], color[3])
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
	frame.list:SetDataProvider(CreateDataProvider(list), ScrollBoxConstants and ScrollBoxConstants.RetainScrollPosition)
	local info
	if not p.recipes then
		info = "Recipes not read yet"
	else
		local source = ({ auto = "from a link", click = "from a link", shared = "shared by them", own = "yours" })[p.via] or ""
		info = string.format("%d recipes  ·  %s %s", p.count or 0, source, p.read and LI.Ago(p.read) or "")
	end
	frame.info:SetText(info)
	frame.empty:SetShown(#list == 0)
	frame.empty:SetText(not p.recipes and "Their recipes haven't been read yet.\nOpen it in game while they're online, or wait for them to link it." or "No recipes match.")
	frame.live:SetEnabled(p.link ~= nil)
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
	view:SetElementExtent(ROW)
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
	frame.live:SetScript("OnClick", function()
		local c = LI.crafters[current.key]
		local p = c and c.profs[current.prof]
		if p and p.link and SetItemRef then
			SetItemRef(p.link, p.text or "", "LeftButton")
		end
	end)
	frame.live:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_TOP")
		GameTooltip:SetText("Open in game", 1, 0.82, 0)
		GameTooltip:AddLine("Opens their real profession window. Only works while they're online.", 1, 1, 1, true)
		GameTooltip:Show()
	end)
	frame.live:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	frame:SetScript("OnShow", Refresh)
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
	Refresh()
end

function Book.Frame()
	return frame
end

function Book.Current()
	return current
end

LI.Listen("CraftersChanged", function()
	if frame and frame:IsShown() then
		LI.After(0.1, Refresh)
	end
end)
