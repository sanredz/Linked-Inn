local ADDON, LI = ...

local WorkUI = {}
LI.WorkUI = WorkUI

local ROW = 50
local ROW_OFFERS = 78
local CHIP_HEIGHT = 20
local CHIP_MAX = 4
local ART = "Interface\\AddOns\\" .. ADDON .. "\\art\\"
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"
local SOFT = { 0.72, 0.68, 0.60 }
local GREEN = { 0.35, 0.95, 0.45 }
local GOLD = { 1, 0.82, 0 }
local VIEWS = {
	{ key = "foryou", name = "For you" },
	{ key = "mine", name = "My requests" },
}

local page
local dialog
local toast
local toastQueue = {}
local toastBusy = false
local toastSerial = 0
local ShowNext
local view = "foryou"

local function WhoColor(key)
	local c = LI.crafters[key]
	return LI.ClassColor(c and c.class) or LI.COLOR.WHITE
end

local function Text(parent, template, justify)
	local fs = parent:CreateFontString(nil, "OVERLAY", template or "GameFontHighlight")
	fs:SetJustifyH(justify or "LEFT")
	return fs
end

local function Button(parent, label, width, onClick)
	local button = LI.Theme.Button(CreateFrame("Button", nil, parent, "UIPanelButtonTemplate"))
	button:SetSize(width or 120, 22)
	button:SetText(label)
	button:SetScript("OnClick", function(self, ...)
		LI.SafeCall(onClick, self, ...)
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

function WorkUI.Money(copper)
	copper = math.floor(tonumber(copper) or 0)
	if copper <= 0 then
		return "No price"
	end
	local fn = (C_CurrencyInfo and C_CurrencyInfo.GetCoinTextureString) or GetCoinTextureString
	local text = fn and LI.Safe(LI.Try(fn, copper))
	if type(text) == "string" and text ~= "" then
		return text
	end
	local gold, silver = math.floor(copper / 10000), math.floor(copper % 10000 / 100)
	if silver > 0 then
		return string.format("%dg %ds", gold, silver)
	end
	return string.format("%dg", gold)
end

local function Quality(itemID)
	if not itemID or not C_Item or not C_Item.GetItemQualityByID then
		return nil
	end
	local q = LI.Safe(LI.Try(C_Item.GetItemQualityByID, itemID))
	local c = type(q) == "number" and ITEM_QUALITY_COLORS and ITEM_QUALITY_COLORS[q]
	if c then
		return { c.r, c.g, c.b }
	end
	return nil
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

local function ItemIcon(itemID)
	local getInstant = (C_Item and C_Item.GetItemInfoInstant) or GetItemInfoInstant
	local icon = select(5, LI.Try(getInstant, itemID))
	return LI.Safe(icon) or "Interface\\Icons\\INV_Misc_QuestionMark"
end

local function ItemLink(req)
	local meta = LI.db.recipes[req.recipe] or {}
	if req.item and C_Item and C_Item.GetItemInfo then
		local _, link = LI.Try(C_Item.GetItemInfo, req.item)
		link = LI.Safe(link)
		if type(link) == "string" then
			return link
		end
	end
	return "[" .. (meta.n or "item") .. "]"
end

function WorkUI.Name(req)
	local meta = LI.db.recipes[req.recipe] or {}
	return meta.n or ("Recipe " .. tostring(req.recipe)), meta.i
end

local function Left(req)
	local seconds = req.expires - time()
	if seconds <= 0 then
		return "expired"
	end
	return LI.Duration(seconds) .. " left"
end

local function Whisper(key, text)
	LI.Whisper(key, text)
end

function WorkUI.WhisperOwner(req)
	Whisper(req.owner, "Hi! I can make " .. ItemLink(req) .. " for you.")
end

local function CreateToast()
	toast = CreateFrame("Button", "LinkedInnToast", UIParent, "BackdropTemplate")
	toast:SetSize(340, 66)
	toast:SetPoint("TOP", UIParent, "TOP", 0, -140)
	toast:SetFrameStrata("HIGH")
	if toast.SetBackdrop then
		toast:SetBackdrop({
			bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
			edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
			edgeSize = 14,
			insets = { left = 3, right = 3, top = 3, bottom = 3 },
		})
		toast:SetBackdropColor(0.05, 0.04, 0.02, 0.94)
		toast:SetBackdropBorderColor(1, 0.82, 0, 1)
	end
	toast.icon = toast:CreateTexture(nil, "ARTWORK")
	toast.icon:SetSize(40, 40)
	toast.icon:SetPoint("LEFT", 13, 0)
	toast.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	toast.head = Text(toast, "GameFontNormal")
	toast.head:SetPoint("TOPLEFT", 64, -10)
	toast.title = Text(toast, "GameFontHighlight")
	toast.title:SetPoint("TOPLEFT", toast.head, "BOTTOMLEFT", 0, -3)
	toast.title:SetPoint("RIGHT", -12, 0)
	toast.title:SetWordWrap(false)
	toast.sub = Text(toast, "GameFontDisableSmall")
	toast.sub:SetPoint("TOPLEFT", toast.title, "BOTTOMLEFT", 0, -3)
	toast.sub:SetPoint("RIGHT", -12, 0)
	toast.sub:SetWordWrap(false)
	toast.fade = toast:CreateAnimationGroup()
	if toast.fade then
		local fade = toast.fade:CreateAnimation("Alpha")
		if fade then
			fade:SetFromAlpha(1)
			fade:SetToAlpha(0)
			fade:SetDuration(0.5)
		end
	end
	toast:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	toast:SetScript("OnClick", function(self, button)
		if button ~= "RightButton" and self.onClick then
			LI.SafeCall(self.onClick)
		end
		self.done = true
		self:Hide()
		toastSerial = toastSerial + 1
		toastBusy = false
		LI.After(0.3, ShowNext)
	end)
	toast:SetScript("OnEnter", function(self)
		self.hover = true
	end)
	toast:SetScript("OnLeave", function(self)
		self.hover = false
	end)
	toast:Hide()
end

ShowNext = function()
	if toastBusy or #toastQueue == 0 then
		return
	end
	toastBusy = true
	toastSerial = toastSerial + 1
	local serial = toastSerial
	local t = table.remove(toastQueue, 1)
	if not toast then
		CreateToast()
	end
	toast.head:SetText(t.head or "")
	toast.title:SetText(t.title or "")
	toast.sub:SetText(t.sub or "")
	toast.icon:SetTexture(t.icon or LI.ICON)
	toast.onClick = t.onClick
	toast.done = false
	toast:SetAlpha(1)
	toast:Show()
	if t.sound then
		Sound(t.sound)
	end
	local shown = GetTime()
	local function Close()
		if serial ~= toastSerial then
			return
		end
		if not toast.done and (toast.hover and GetTime() - shown < 20) then
			LI.After(1, Close)
			return
		end
		if not toast.done and toast.fade then
			toast.fade:Play()
		end
		LI.After(0.5, function()
			if serial ~= toastSerial then
				return
			end
			toast:Hide()
			toastBusy = false
			ShowNext()
		end)
	end
	LI.After(5, Close)
end

function WorkUI.Toast(t)
	if #toastQueue >= 5 then
		table.remove(toastQueue, 1)
	end
	toastQueue[#toastQueue + 1] = t
	ShowNext()
end

function WorkUI.Toaster()
	return toast
end

local function Details(req, mine)
	local parts = {}
	if mine then
		local count, online = LI.Work.KnownCrafters(req.recipe)
		if count == 0 then
			parts[#parts + 1] = "No crafter on your list knows it yet"
		else
			parts[#parts + 1] = string.format("%d %s %s it", count, count == 1 and "crafter" or "crafters", count == 1 and "knows" or "know")
			if online > 0 then
				parts[#parts + 1] = string.format("|cff59f273%d online|r", online)
			end
		end
	else
		local color = WhoColor(req.owner)
		parts[#parts + 1] = LI.Colorize(LI.ShortName(req.owner), color)
	end
	parts[#parts + 1] = LI.Work.MATS[req.mats].name
	if req.note and req.note ~= "" then
		parts[#parts + 1] = "|cffc8c0a8\"" .. req.note .. "\"|r"
	end
	return table.concat(parts, "  \194\183  ")
end

local function RowTooltip(row)
	local req = row.req
	if not req then
		return
	end
	GameTooltip:SetOwner(row, "ANCHOR_RIGHT")
	if req.item and GameTooltip.SetItemByID then
		LI.Try(GameTooltip.SetItemByID, GameTooltip, req.item)
	end
	if (LI.Try(GameTooltip.NumLines, GameTooltip) or 0) == 0 then
		GameTooltip:SetText((WorkUI.Name(req)), 1, 1, 1)
	end
	local needs = LI.Work.Needs(req.recipe, req.qty)
	if #needs > 0 then
		GameTooltip:AddLine(" ")
		GameTooltip:AddLine(row.mine and "Materials you bring" or "Materials they bring", 1, 0.82, 0)
		for _, r in ipairs(needs) do
			local have = (req.have or {})[r.id] or 0
			local color = have >= r.need and "|cff59f273" or (have > 0 and "|cffffd24d" or "|cffff6060")
			GameTooltip:AddLine(string.format("|T%s:16:16:0:0|t  %s%d / %d|r  %s", tostring(ItemIcon(r.id)), color, have, r.need, ItemName(r.id) or "Loading..."), 1, 1, 1)
		end
	end
	GameTooltip:AddLine(" ")
	if row.mine then
		GameTooltip:AddDoubleLine("Quantity", tostring(req.qty), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Offering", WorkUI.Money(req.price), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Expires", Left(req), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddLine(" ")
		GameTooltip:AddLine("Click to see who can make it   Right-click for more", 0.5, 0.5, 0.5)
	else
		GameTooltip:AddDoubleLine("Requested by", LI.ShortName(req.owner), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Quantity", tostring(req.qty), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Paying", WorkUI.Money(req.price), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Expires", Left(req), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddLine(" ")
		GameTooltip:AddLine("Click to whisper   Right-click for more", 0.5, 0.5, 0.5)
	end
	GameTooltip:Show()
end

local function RowMenu(row)
	local req = row.req
	if not req then
		return
	end
	Menu(row, function(root)
		if root.CreateTitle then
			root:CreateTitle((WorkUI.Name(req)))
		end
		if row.mine then
			root:CreateButton("Show crafters who know it", function()
				WorkUI.ShowCrafters(req)
			end)
			root:CreateButton("Cancel request", function()
				LI.Work.Cancel(req.id)
			end)
		else
			root:CreateButton("Whisper " .. LI.ShortName(req.owner), function()
				WorkUI.WhisperOwner(req)
			end)
			if req.canMake and not req.offered then
				root:CreateButton("Tell them I can make it", function()
					LI.Work.Offer(req.key)
				end)
			end
			root:CreateButton("Hide this request", function()
				LI.Work.Hide(req.key)
			end)
		end
	end)
end

function WorkUI.ShowCrafters(req)
	local name = WorkUI.Name(req)
	local main = LI.UI.Main()
	LI.UI.Open(LI.UI.TAB.find)
	if main and main.search then
		main.search:SetText(name)
		local script = main.search:GetScript("OnTextChanged")
		if script then
			script(main.search)
		end
	end
end

local function BuildRow(row)
	row:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	row.bg = row:CreateTexture(nil, "BACKGROUND")
	row.bg:SetAllPoints()
	row.hl = row:CreateTexture(nil, "HIGHLIGHT")
	row.hl:SetAllPoints()
	row.hl:SetColorTexture(1, 0.82, 0.3, 0.10)
	row.accent = row:CreateTexture(nil, "ARTWORK")
	row.accent:SetPoint("TOPLEFT", 0, -3)
	row.accent:SetPoint("BOTTOMLEFT", 0, 3)
	row.accent:SetWidth(3)
	row.accent:SetColorTexture(GREEN[1], GREEN[2], GREEN[3], 0.9)
	row.edge = row:CreateTexture(nil, "BORDER")
	row.edge:SetSize(36, 36)
	row.edge:SetPoint("TOPLEFT", 13, -7)
	row.edge:SetColorTexture(0, 0, 0, 0.85)
	row.icon = row:CreateTexture(nil, "ARTWORK")
	row.icon:SetSize(34, 34)
	row.icon:SetPoint("CENTER", row.edge, "CENTER")
	row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	row.name = Text(row, "GameFontNormalLarge")
	row.name:SetPoint("TOPLEFT", row.edge, "TOPRIGHT", 10, 0)
	row.name:SetPoint("RIGHT", -150, 0)
	row.name:SetWordWrap(false)
	row.line = Text(row, "GameFontHighlightSmall")
	row.line:SetPoint("BOTTOMLEFT", row.edge, "BOTTOMRIGHT", 10, 1)
	row.line:SetPoint("RIGHT", -150, 0)
	row.line:SetWordWrap(false)
	row.price = Text(row, "GameFontHighlight", "RIGHT")
	row.price:SetPoint("TOPRIGHT", -12, -8)
	row.state = Text(row, "GameFontHighlightSmall", "RIGHT")
	row.state:SetPoint("TOPRIGHT", -12, -29)
	row.offer = Button(row, "I can make it", 104, function(self)
		local req = self:GetParent().req
		if req and LI.Work.Offer(req.key) then
			Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
		end
	end)
	row.offer:SetHeight(20)
	row.offer:SetPoint("TOPRIGHT", -8, -24)
	row.offersLabel = Text(row, "GameFontDisableSmall")
	row.offersLabel:SetPoint("BOTTOMLEFT", row.edge, "BOTTOMRIGHT", 10, -22)
	row.offersLabel:SetText("Offers:")
	row.more = Text(row, "GameFontDisableSmall")
	row.chips = {}
	row:SetScript("OnEnter", RowTooltip)
	row:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	row:SetScript("OnClick", function(self, button)
		if not self.req then
			return
		end
		if button == "RightButton" then
			RowMenu(self)
		elseif self.mine then
			WorkUI.ShowCrafters(self.req)
		else
			WorkUI.WhisperOwner(self.req)
		end
	end)
	row.built = true
end

local function Offerer(chip)
	local row = chip:GetParent()
	return row.req, chip.key
end

local function ChipTooltip(chip)
	local req, key = Offerer(chip)
	if not req or not key then
		return
	end
	local c = LI.crafters[key]
	local color = WhoColor(key)
	GameTooltip:SetOwner(chip, "ANCHOR_RIGHT")
	GameTooltip:SetText(LI.ShortName(key), color[1], color[2], color[3])
	local at = req.offers and req.offers[key]
	if at then
		GameTooltip:AddLine("Offered " .. LI.Ago(at), 1, 1, 1)
	end
	local meta = LI.db.recipes[req.recipe] or {}
	local p = c and meta.p and c.profs[meta.p]
	if p then
		local skill = p.rank and string.format(" %d", p.rank) or ""
		if LI.KnowsRecipe(p, meta.p, req.recipe) then
			GameTooltip:AddLine(string.format("%s%s, knows this recipe", p.name or meta.p, skill), 0.35, 0.95, 0.45)
		else
			GameTooltip:AddLine((p.name or meta.p) .. skill, 0.85, 0.85, 0.85)
		end
	end
	local status, seen = LI.Status(key)
	if status == "online" then
		GameTooltip:AddLine("Online", 0.35, 0.95, 0.45)
	elseif seen then
		GameTooltip:AddLine("Last seen " .. LI.Ago(seen), 0.6, 0.6, 0.6)
	end
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine("Click to whisper   Right-click for more", 0.5, 0.5, 0.5)
	GameTooltip:Show()
end

local function WhisperOfferer(req, key)
	Whisper(key, "Hi! Thanks for offering to make " .. ItemLink(req) .. ". ")
end

local function ChipMenu(chip)
	local req, key = Offerer(chip)
	if not req or not key then
		return
	end
	Menu(chip, function(root)
		if root.CreateTitle then
			root:CreateTitle(LI.ShortName(key))
		end
		root:CreateButton("Whisper", function()
			WhisperOfferer(req, key)
		end)
		root:CreateButton("Invite to group", function()
			local invite = (C_PartyInfo and C_PartyInfo.InviteUnit) or InviteUnit
			if invite then
				LI.Try(invite, LI.WhisperTarget(key))
			end
		end)
		root:CreateButton("Remove offer", function()
			LI.Work.RemoveOffer(req.id, key)
		end)
	end)
end

local CAP = 0.1875

local function Slices(frame, file, layer)
	local cap = CHIP_HEIGHT / 2
	local left = frame:CreateTexture(nil, layer)
	left:SetTexture(file)
	left:SetTexCoord(0, CAP, 0, 0.75)
	left:SetPoint("TOPLEFT")
	left:SetPoint("BOTTOMLEFT")
	left:SetWidth(cap)
	local right = frame:CreateTexture(nil, layer)
	right:SetTexture(file)
	right:SetTexCoord(1 - CAP, 1, 0, 0.75)
	right:SetPoint("TOPRIGHT")
	right:SetPoint("BOTTOMRIGHT")
	right:SetWidth(cap)
	local middle = frame:CreateTexture(nil, layer)
	middle:SetTexture(file)
	middle:SetTexCoord(CAP, 1 - CAP, 0, 0.75)
	middle:SetPoint("TOPLEFT", left, "TOPRIGHT")
	middle:SetPoint("BOTTOMRIGHT", right, "BOTTOMLEFT")
	local parts = { left, middle, right }
	return {
		parts = parts,
		SetVertexColor = function(_, ...)
			for _, t in ipairs(parts) do
				t:SetVertexColor(...)
			end
		end,
		SetAlpha = function(_, alpha)
			for _, t in ipairs(parts) do
				t:SetAlpha(alpha)
			end
		end,
		GetAlpha = function()
			return left:GetAlpha()
		end,
	}
end

local function Chip(row, i)
	local chip = row.chips[i]
	if chip then
		return chip
	end
	chip = CreateFrame("Button", nil, row)
	chip:SetHeight(CHIP_HEIGHT)
	chip:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	chip.fill = Slices(chip, ART .. "pill", "BACKGROUND")
	chip.edge = Slices(chip, ART .. "pill_edge", "BORDER")
	chip.dot = chip:CreateTexture(nil, "ARTWORK")
	chip.dot:SetSize(12, 12)
	chip.dot:SetPoint("LEFT", 7, 0)
	chip.text = Text(chip, "GameFontHighlightSmall")
	chip.text:SetPoint("LEFT", chip.dot, "RIGHT", 3, 0)
	chip:SetScript("OnEnter", function(self)
		self.fill:SetAlpha(1)
		ChipTooltip(self)
	end)
	chip:SetScript("OnLeave", function(self)
		self.fill:SetAlpha(0.7)
		GameTooltip:Hide()
	end)
	chip:SetScript("OnClick", function(self, button)
		local req, key = Offerer(self)
		if not req then
			return
		end
		if button == "RightButton" then
			ChipMenu(self)
		else
			WhisperOfferer(req, key)
		end
	end)
	row.chips[i] = chip
	return chip
end

local function UpdateChips(row, req, show)
	local offers = show and LI.Work.Offers(req) or {}
	row.offersLabel:SetShown(#offers > 0)
	local prev = row.offersLabel
	for i = 1, math.max(#offers, #row.chips) do
		local chip = row.chips[i]
		local offer = offers[i]
		if offer and i <= CHIP_MAX then
			chip = Chip(row, i)
			chip.key = offer.key
			local color = WhoColor(offer.key)
			chip.text:SetText(LI.ShortName(offer.key))
			chip.text:SetTextColor(color[1], color[2], color[3])
			local online = LI.Status(offer.key) == "online"
			chip.dot:SetTexture(online and "Interface\\FriendsFrame\\StatusIcon-Online" or "Interface\\FriendsFrame\\StatusIcon-Offline")
			chip.fill:SetVertexColor(color[1], color[2], color[3], 0.25)
			chip.fill:SetAlpha(0.7)
			chip.edge:SetVertexColor(color[1], color[2], color[3], 0.8)
			local width = LI.Try(chip.text.GetStringWidth, chip.text) or 60
			chip:SetWidth(math.max(60, width + 32))
			chip:ClearAllPoints()
			chip:SetPoint("LEFT", prev, "RIGHT", 6, 0)
			chip:Show()
			prev = chip
		elseif chip then
			chip:Hide()
		end
	end
	row.more:SetShown(#offers > CHIP_MAX)
	if #offers > CHIP_MAX then
		row.more:SetText(string.format("+%d more", #offers - CHIP_MAX))
		row.more:ClearAllPoints()
		row.more:SetPoint("LEFT", prev, "RIGHT", 8, 0)
	end
end

local function InitRow(row, data)
	if not row.built then
		BuildRow(row)
	end
	local req = data.req
	row.req, row.mine = req, data.mine
	row.bg:SetColorTexture(1, 1, 1, (data.index or 0) % 2 == 0 and 0.05 or 0)
	local name, icon = WorkUI.Name(req)
	row.icon:SetTexture(icon or "Interface\\Icons\\INV_Misc_QuestionMark")
	local qty = req.qty > 1 and string.format("  |cffa0a0a0\195\151%d|r", req.qty) or ""
	row.name:SetText(name .. qty)
	local color = Quality(req.item) or { 1, 1, 1 }
	row.name:SetTextColor(color[1], color[2], color[3])
	row.line:SetText(Details(req, data.mine))
	row.price:SetText(WorkUI.Money(req.price))
	row.accent:SetShown(not data.mine and req.canMake == true)
	UpdateChips(row, req, data.mine)
	if data.mine then
		local offers = 0
		for _ in pairs(req.offers or {}) do
			offers = offers + 1
		end
		row.offer:Hide()
		row.state:Show()
		if offers > 0 then
			row.state:SetText(string.format("|cff59f273%d %s|r  \194\183  %s", offers, offers == 1 and "offer" or "offers", Left(req)))
		else
			row.state:SetText("No offers yet  \194\183  " .. Left(req))
		end
	elseif req.canMake and not req.offered then
		row.offer:Show()
		row.state:Hide()
	else
		row.offer:Hide()
		row.state:Show()
		row.state:SetText(req.offered and "|cff59f273Offer sent|r" or Left(req))
	end
end

local function ViewButtons(parent)
	parent.views = {}
	local prev
	for i, v in ipairs(VIEWS) do
		local b = CreateFrame("Button", nil, parent)
		b.key = v.key
		b.label = Text(b, "GameFontNormal")
		b.label:SetPoint("CENTER")
		b.name = v.name
		b.label:SetText(v.name)
		b:SetSize(100, 24)
		if prev then
			b:SetPoint("LEFT", prev, "RIGHT", 6, 0)
		else
			b:SetPoint("TOPLEFT", 10, -8)
		end
		b.line = b:CreateTexture(nil, "ARTWORK")
		b.line:SetHeight(2)
		b.line:SetPoint("BOTTOMLEFT", 8, 0)
		b.line:SetPoint("BOTTOMRIGHT", -8, 0)
		b.line:SetColorTexture(GOLD[1], GOLD[2], GOLD[3], 0.9)
		b:SetScript("OnClick", function(self)
			view = self.key
			Sound("IG_CHARACTER_INFO_TAB")
			WorkUI.Refresh()
		end)
		b:SetScript("OnEnter", function(self)
			if view ~= self.key then
				self.label:SetTextColor(1, 1, 1)
			end
		end)
		b:SetScript("OnLeave", function()
			WorkUI.Refresh()
		end)
		parent.views[i] = b
		prev = b
	end
end

local function MyProfessions()
	local list = {}
	local c = LI.crafters and LI.crafters[LI.playerKey]
	for key, p in pairs(c and c.profs or {}) do
		if not LI.GATHERING[key] then
			list[#list + 1] = { key = key, name = p.name or key }
		end
	end
	table.sort(list, function(a, b) return a.key < b.key end)
	return list
end

local header

local function ToggleProfession(key)
	local s = LI.Work.Settings()
	local mine = MyProfessions()
	if not next(s.profs) then
		for _, other in ipairs(mine) do
			s.profs[other.key] = true
		end
	end
	s.profs[key] = not s.profs[key] or nil
	local all = true
	for _, other in ipairs(mine) do
		if not s.profs[other.key] then
			all = false
		end
	end
	if all or not next(s.profs) then
		s.profs = {}
	end
	WorkUI.Refresh()
end

local function HeaderCheck(parent, label, field, after)
	local box = CreateFrame("CheckButton", nil, parent, "UICheckButtonTemplate")
	box:SetSize(24, 24)
	box.field = field
	box.label = Text(parent, "GameFontHighlightSmall")
	box.label:SetPoint("LEFT", box, "RIGHT", 0, 0)
	box.label:SetText(label)
	if after then
		box:SetPoint("LEFT", after.label, "RIGHT", 12, 0)
	end
	box:SetScript("OnClick", function(self)
		local s = LI.Work.Settings()
		s[self.field] = self:GetChecked() and true or false
		Sound(s[self.field] and "IG_MAINMENU_OPTION_CHECKBOX_ON" or "IG_MAINMENU_OPTION_CHECKBOX_OFF")
		WorkUI.Refresh()
	end)
	return box
end

local LABEL_WIDTH = 104

local function ProfText()
	local s = LI.Work.Settings()
	if not next(s.profs) then
		return "All my professions"
	end
	local names = {}
	for _, prof in ipairs(MyProfessions()) do
		if s.profs[prof.key] then
			names[#names + 1] = prof.name
		end
	end
	return #names == 1 and names[1] or string.format("%d professions", #names)
end

function WorkUI.BuildHeader(main)
	header = CreateFrame("Frame", nil, main)
	header:SetPoint("TOPLEFT", 18, -68 - LI.STRIP)
	header:SetPoint("TOPRIGHT", -14, -68 - LI.STRIP)
	header:SetHeight(68)

	header.howLabel = Text(header, "GameFontNormal", "RIGHT")
	header.howLabel:SetWidth(LABEL_WIDTH)
	header.howLabel:SetPoint("TOPLEFT", 0, -8)
	header.howLabel:SetText("Alert me by")
	header.notify = HeaderCheck(header, "Pop-up", "notify")
	header.notify:SetPoint("LEFT", header.howLabel, "RIGHT", 8, 0)
	header.sound = HeaderCheck(header, "Sound", "sound", header.notify)
	header.glow = HeaderCheck(header, "Minimap glow", "glow", header.sound)

	header.whatLabel = Text(header, "GameFontNormal", "RIGHT")
	header.whatLabel:SetWidth(LABEL_WIDTH)
	header.whatLabel:SetPoint("TOPRIGHT", header.howLabel, "BOTTOMRIGHT", 0, -20)
	header.whatLabel:SetText("Only alert for")
	header.allMats = HeaderCheck(header, "All mats", "allMats")
	header.allMats:SetPoint("LEFT", header.whatLabel, "RIGHT", 8, 0)
	header.atLeast = Text(header, "GameFontHighlightSmall")
	header.atLeast:SetPoint("LEFT", header.allMats.label, "RIGHT", 14, 0)
	header.atLeast:SetText("at least")
	header.price = CreateFrame("EditBox", nil, header, "InputBoxTemplate")
	header.price:SetSize(40, 20)
	header.price:SetPoint("LEFT", header.atLeast, "RIGHT", 10, 0)
	header.price:SetAutoFocus(false)
	header.price:SetNumeric(true)
	header.price:SetMaxLetters(5)
	header.price:SetJustifyH("CENTER")
	header.price:SetScript("OnTextChanged", function(self, user)
		if user then
			local gold = tonumber(self:GetText()) or 0
			LI.Work.Settings().minPrice = gold * 10000
			WorkUI.Refresh()
		end
	end)
	header.price:SetScript("OnEnterPressed", function(self)
		self:ClearFocus()
	end)
	header.price:SetScript("OnEscapePressed", function(self)
		self:ClearFocus()
	end)
	header.coin = header:CreateTexture(nil, "ARTWORK")
	header.coin:SetSize(13, 13)
	header.coin:SetPoint("LEFT", header.price, "RIGHT", 3, 0)
	header.coin:SetTexture("Interface\\MoneyFrame\\UI-GoldIcon")
	header.profs = Button(header, ProfText(), 132, function(self)
		local s = LI.Work.Settings()
		Menu(self, function(root)
			local mine = MyProfessions()
			if #mine == 0 and root.CreateTitle then
				root:CreateTitle("Your professions load shortly after login")
			end
			for _, prof in ipairs(mine) do
				root:CreateCheckbox(prof.name, function()
					return not next(s.profs) or s.profs[prof.key] == true
				end, function()
					ToggleProfession(prof.key)
				end)
			end
		end)
	end)
	header.profs:SetPoint("LEFT", header.coin, "RIGHT", 12, 0)
	header:Hide()
	return header
end

function WorkUI.Header()
	return header
end

local function RefreshHeader()
	if not header then
		return
	end
	local s = LI.Work.Settings()
	for _, box in ipairs({ header.notify, header.sound, header.glow, header.allMats }) do
		box:SetChecked(s[box.field] and true or false)
	end
	if not header.price:HasFocus() then
		local gold = math.floor((s.minPrice or 0) / 10000)
		header.price:SetText(gold > 0 and tostring(gold) or "")
	end
	header.profs:SetText(ProfText())
end

function WorkUI.Build(parent)
	page = parent
	ViewButtons(page)
	page.post = Button(page, "Post a request", 128, function()
		WorkUI.OpenDialog()
	end)
	page.post:SetPoint("TOPRIGHT", -12, -8)
	page.rule = page:CreateTexture(nil, "ARTWORK")
	page.rule:SetHeight(1)
	page.rule:SetPoint("TOPLEFT", 8, -36)
	page.rule:SetPoint("TOPRIGHT", -8, -36)
	page.rule:SetColorTexture(1, 0.82, 0, 0.25)

	local box = CreateFrame("Frame", nil, page, "WowScrollBoxList")
	local bar = CreateFrame("EventFrame", nil, page, "MinimalScrollBar")
	box:SetPoint("TOPLEFT", 4, -40)
	box:SetPoint("BOTTOMRIGHT", -20, 4)
	bar:SetPoint("TOPLEFT", box, "TOPRIGHT", 4, 0)
	bar:SetPoint("BOTTOMLEFT", box, "BOTTOMRIGHT", 4, 0)
	local listView = CreateScrollBoxListLinearView()
	if listView.SetElementExtentCalculator then
		listView:SetElementExtentCalculator(function(_, data)
			if data.mine and next(data.req.offers or {}) then
				return ROW_OFFERS
			end
			return ROW
		end)
	else
		listView:SetElementExtent(ROW)
	end
	listView:SetElementInitializer("Button", function(row, data)
		LI.SafeCall(InitRow, row, data)
	end)
	ScrollUtil.InitScrollBoxListWithScrollBar(box, bar, listView)
	page.list = box

	page.empty = CreateFrame("Frame", nil, page)
	page.empty:SetPoint("TOPLEFT", 0, -40)
	page.empty:SetPoint("BOTTOMRIGHT")
	page.emptyIcon = page.empty:CreateTexture(nil, "ARTWORK")
	page.emptyIcon:SetSize(52, 52)
	page.emptyIcon:SetPoint("CENTER", 0, 60)
	page.emptyIcon:SetTexture("Interface\\Icons\\INV_Misc_Note_01")
	page.emptyIcon:SetDesaturated(true)
	page.emptyIcon:SetAlpha(0.6)
	page.emptyHead = page.empty:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	page.emptyHead:SetFont(TITLE_FONT, 22, "")
	page.emptyHead:SetPoint("TOP", page.emptyIcon, "BOTTOM", 0, -12)
	page.emptyText = Text(page.empty, "GameFontHighlight", "CENTER")
	page.emptyText:SetPoint("TOP", page.emptyHead, "BOTTOM", 0, -8)
	page.emptyText:SetWidth(390)
	page.emptyText:SetSpacing(3)
	page.emptyText:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	page.empty:Hide()
end

function WorkUI.View()
	return view
end

function WorkUI.SetView(key)
	view = key
	WorkUI.Refresh()
end

function WorkUI.Refresh()
	if not page or not page:IsShown() then
		return
	end
	RefreshHeader()
	local foryou = LI.Work.Received(true)
	local mine = LI.Work.Mine()
	for _, b in ipairs(page.views) do
		local label = b.name
		if b.key == "foryou" and #foryou > 0 then
			label = string.format("%s (%d)", label, #foryou)
		elseif b.key == "mine" and #mine > 0 then
			label = string.format("%s (%d)", label, #mine)
		end
		b.label:SetText(label)
		local on = view == b.key
		b.line:SetShown(on)
		if on then
			b.label:SetTextColor(GOLD[1], GOLD[2], GOLD[3])
		else
			b.label:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
		end
	end
	local list = {}
	if view == "mine" then
		for i, req in ipairs(mine) do
			list[#list + 1] = { req = req, mine = true, index = i }
		end
	else
		for i, req in ipairs(foryou) do
			list[#list + 1] = { req = req, index = i }
		end
	end
	page.list:SetDataProvider(CreateDataProvider(list), ScrollBoxConstants and ScrollBoxConstants.RetainScrollPosition)
	page.empty:SetShown(#list == 0)
	if #list == 0 then
		if view == "foryou" then
			page.emptyHead:SetText("Nothing for you right now")
			page.emptyText:SetText("When a Linked Inn user asks for something you can craft, it shows up here and you get a notice.")
		else
			page.emptyHead:SetText("You haven't asked for anything")
			page.emptyText:SetText("Post a request and crafters who can make it get a notice.")
		end
	end
	LI.Work.MarkSeen()
end

local function SearchItems(query)
	local q = LI.Trim(query or ""):lower()
	local out = {}
	if q == "" then
		return out
	end
	for id, meta in pairs(LI.db.recipes) do
		if type(meta.n) == "string" and meta.n:lower():find(q, 1, true) then
			out[#out + 1] = { id = id, meta = meta }
		end
	end
	table.sort(out, function(a, b)
		local sa, sb = a.meta.n:lower():find(q, 1, true), b.meta.n:lower():find(q, 1, true)
		if sa ~= sb then
			return sa < sb
		end
		return a.meta.n < b.meta.n
	end)
	while #out > 6 do
		table.remove(out)
	end
	return out
end
WorkUI.SearchItems = SearchItems

local REAGENT_ROWS = 8
local REAGENT_ROW = 26

local function Label(parent, text, template)
	local fs = Text(parent, template or "GameFontNormal")
	fs:SetText(text)
	return fs
end

local function ArrowButton(parent, which)
	local b = CreateFrame("Button", nil, parent)
	b:SetSize(23, 22)
	b:SetNormalTexture("Interface\\Buttons\\UI-SpellbookIcon-" .. which .. "Page-Up")
	b:SetPushedTexture("Interface\\Buttons\\UI-SpellbookIcon-" .. which .. "Page-Down")
	b:SetDisabledTexture("Interface\\Buttons\\UI-SpellbookIcon-" .. which .. "Page-Disabled")
	b:SetHighlightTexture("Interface\\Buttons\\UI-Common-MouseHilight", "ADD")
	return b
end

local function Spinner(parent, onChange)
	local ok, box = false, nil
	if NumericInputSpinnerMixin then
		ok, box = pcall(CreateFrame, "EditBox", nil, parent, "NumericInputSpinnerTemplate")
	end
	if ok and box and box.SetMinMaxValues and box.SetOnValueChangedCallback then
		box:SetMinMaxValues(0, 99)
		box:SetOnValueChangedCallback(function(_, value)
			LI.SafeCall(onChange, value)
		end)
		box.Get = function(self)
			return self:GetValue() or 0
		end
		box.Set = function(self, value)
			self:SetValue(value)
		end
		box.SetRange = function(self, low, high)
			self:SetMinMaxValues(low, high)
			self:SetValue(math.max(low, math.min(high, self:GetValue() or low)))
		end
		return box
	end
	box = CreateFrame("EditBox", nil, parent, "InputBoxTemplate")
	box:SetSize(31, 20)
	box:SetAutoFocus(false)
	box:SetNumeric(true)
	box:SetMaxLetters(4)
	box:SetJustifyH("CENTER")
	box.low, box.high = 0, 99
	box.Get = function(self)
		return math.max(self.low, math.min(self.high, tonumber(self:GetText()) or self.low))
	end
	box.Set = function(self, value)
		value = math.max(self.low, math.min(self.high, math.floor(tonumber(value) or 0)))
		self:SetText(tostring(value))
		LI.SafeCall(onChange, value)
	end
	box.SetRange = function(self, low, high)
		self.low, self.high = low, high
		self:Set(self:Get())
	end
	box.DecrementButton = ArrowButton(box, "Prev")
	box.DecrementButton:SetPoint("RIGHT", box, "LEFT", -6, 0)
	box.DecrementButton:SetScript("OnClick", function()
		box:Set(box:Get() - 1)
	end)
	box.IncrementButton = ArrowButton(box, "Next")
	box.IncrementButton:SetPoint("LEFT", box, "RIGHT", 0, 0)
	box.IncrementButton:SetScript("OnClick", function()
		box:Set(box:Get() + 1)
	end)
	box:SetScript("OnTextChanged", function(self, user)
		if user then
			LI.SafeCall(onChange, self:Get())
		end
	end)
	return box
end

local function LinkButton(parent, label, onClick)
	local b = CreateFrame("Button", nil, parent)
	b.text = Text(b, "GameFontNormalSmall")
	b.text:SetPoint("RIGHT")
	b.text:SetText(label)
	b:SetSize(44, 16)
	b:SetScript("OnClick", function(self)
		Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
		LI.SafeCall(onClick, self)
	end)
	b:SetScript("OnEnter", function(self)
		self.text:SetTextColor(1, 1, 1)
	end)
	b:SetScript("OnLeave", function(self)
		self.text:SetTextColor(GOLD[1], GOLD[2], GOLD[3])
	end)
	return b
end

local function Have()
	local have = {}
	for _, row in ipairs(dialog.rows) do
		if row:IsShown() and row.itemID then
			have[row.itemID] = row.spin:Get()
		end
	end
	return have
end

local function DialogInfo()
	if not dialog.recipe then
		dialog.info:SetText("")
		return
	end
	local count, online = LI.Work.KnownCrafters(dialog.recipe)
	local who
	if count == 0 then
		who = "Nobody on your list knows it yet"
	else
		who = string.format("%d %s on your list %s it%s", count, count == 1 and "crafter" or "crafters", count == 1 and "knows" or "know", online > 0 and string.format(", |cff59f273%d online|r", online) or "")
	end
	local mats = LI.Work.MatsFor(dialog.recipe, dialog.amount:Get(), Have())
	dialog.info:SetText(who .. "\n|cffa8a090Crafters will see:|r " .. LI.Work.MATS[mats].name)
end

local function UpdateNeeds()
	if not dialog.recipe then
		return
	end
	local amount = math.max(1, dialog.amount:Get())
	for _, row in ipairs(dialog.rows) do
		if row:IsShown() and row.per then
			local need = row.per * amount
			row.total:SetText("/ " .. need)
			row.spin:SetRange(0, need)
		end
	end
	DialogInfo()
end

local function Layout()
	local shown = 0
	for _, row in ipairs(dialog.rows) do
		if row:IsShown() then
			shown = shown + 1
		end
	end
	dialog.noReagents:SetShown(shown == 0)
	dialog.allLink:SetShown(shown > 0)
	dialog.noneLink:SetShown(shown > 0)
	local height = math.max(shown, 1) * REAGENT_ROW
	dialog.details:ClearAllPoints()
	dialog.details:SetPoint("TOPLEFT", dialog.body, "TOPLEFT", 0, -26 - height - 14)
	dialog.details:SetPoint("RIGHT", dialog.body, "RIGHT")
end

local function SelectRecipe(id)
	dialog.recipe = id
	local meta = id and LI.db.recipes[id]
	local picked = meta ~= nil
	dialog.pick:SetShown(picked)
	dialog.body:SetShown(picked)
	dialog.search:SetShown(not picked)
	dialog.hint:SetShown(not picked)
	dialog.ask:SetText(picked and "You're asking for" or "What do you need made?")
	for _, r in ipairs(dialog.results) do
		r:Hide()
	end
	dialog.noResults:Hide()
	dialog.post:SetEnabled(picked)
	dialog.error:SetText("")
	for _, row in ipairs(dialog.rows) do
		row:Hide()
		row.itemID, row.per = nil, nil
	end
	if not picked then
		dialog.info:SetText("")
		return
	end
	LI.FillRecipe(id)
	dialog.pick.icon:SetTexture(meta.i or "Interface\\Icons\\INV_Misc_QuestionMark")
	dialog.pick.name:SetText(meta.n or "?")
	local color = Quality(meta.item) or { 1, 1, 1 }
	dialog.pick.name:SetTextColor(color[1], color[2], color[3])
	local prof = meta.p and LI.PROFESSION_NAMES[meta.p]
	dialog.pick.prof:SetText(prof or "")
	for i, r in ipairs(LI.Work.Needs(id, 1)) do
		local row = dialog.rows[i]
		if row then
			row.itemID, row.per = r.id, r.need
			row.icon:SetTexture(ItemIcon(r.id))
			row.name:SetText(ItemName(r.id) or "Loading...")
			row.spin:SetRange(0, r.need * math.max(1, dialog.amount:Get()))
			row.spin:Set(0)
			row:Show()
		end
	end
	Layout()
	UpdateNeeds()
end

local function ShowResults()
	if dialog.recipe then
		return
	end
	local text = dialog.search:GetText() or ""
	local found = SearchItems(text)
	for i, r in ipairs(dialog.results) do
		local hit = found[i]
		r.id = hit and hit.id
		if hit then
			r.icon:SetTexture(hit.meta.i or "Interface\\Icons\\INV_Misc_QuestionMark")
			r.name:SetText(hit.meta.n)
			local color = Quality(hit.meta.item) or { 1, 1, 1 }
			r.name:SetTextColor(color[1], color[2], color[3])
			r.prof:SetText(LI.PROFESSION_NAMES[hit.meta.p or ""] or "")
			r:Show()
		else
			r:Hide()
		end
	end
	local typed = LI.Trim(text) ~= ""
	dialog.noResults:SetShown(#found == 0 and typed)
	dialog.hint:SetShown(not typed)
end

local function DurationName(seconds)
	for _, d in ipairs(LI.Work.DURATIONS) do
		if d.seconds == seconds then
			return d.name
		end
	end
	return LI.Duration(seconds)
end

local function MoneyBox(parent, letters, width)
	local box = CreateFrame("EditBox", nil, parent, "InputBoxTemplate")
	box:SetSize(width, 20)
	box:SetAutoFocus(false)
	box:SetNumeric(true)
	box:SetMaxLetters(letters)
	box:SetJustifyH("CENTER")
	return box
end

local function CreateDialog()
	local main = LI.UI.Main()
	dialog = CreateFrame("Frame", "LinkedInnRequest", main, "ButtonFrameTemplate")
	dialog:SetSize(360, 620)
	dialog:SetPoint("TOPLEFT", main, "TOPRIGHT", 4, 0)
	dialog:SetFrameStrata("HIGH")
	if ButtonFrameTemplate_HidePortrait then
		LI.Try(ButtonFrameTemplate_HidePortrait, dialog)
	end
	if ButtonFrameTemplate_HideButtonBar then
		LI.Try(ButtonFrameTemplate_HideButtonBar, dialog)
	end
	if dialog.SetTitle then
		dialog:SetTitle("New request")
	end
	if dialog.Inset then
		dialog.Inset:Hide()
	end
	LI.Theme.Skin(dialog, "New request", { titleSize = 18, card = false })

	dialog.ask = Label(dialog, "What do you need made?")
	dialog.ask:SetPoint("TOPLEFT", 20, -44)

	dialog.search = CreateFrame("EditBox", nil, dialog, "SearchBoxTemplate")
	dialog.search:SetSize(316, 22)
	dialog.search:SetPoint("TOPLEFT", 24, -64)
	if dialog.search.Instructions then
		dialog.search.Instructions:SetText("Type an item name")
	end
	dialog.search:SetScript("OnTextChanged", function(self)
		if SearchBoxTemplate_OnTextChanged then
			pcall(SearchBoxTemplate_OnTextChanged, self)
		end
		ShowResults()
	end)
	dialog.hint = Text(dialog, "GameFontDisableSmall")
	dialog.hint:SetPoint("TOPLEFT", 26, -94)
	dialog.hint:SetWidth(310)
	dialog.hint:SetText("Anything from the recipes Linked Inn has seen.")
	dialog.results = {}
	for i = 1, 10 do
		local r = CreateFrame("Button", nil, dialog)
		r:SetSize(316, 26)
		r:SetPoint("TOPLEFT", 24, -90 - (i - 1) * 26)
		r.hl = r:CreateTexture(nil, "HIGHLIGHT")
		r.hl:SetAllPoints()
		r.hl:SetColorTexture(1, 0.82, 0.3, 0.12)
		r.icon = r:CreateTexture(nil, "ARTWORK")
		r.icon:SetSize(20, 20)
		r.icon:SetPoint("LEFT", 4, 0)
		r.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
		r.name = Text(r, "GameFontHighlight")
		r.name:SetPoint("LEFT", r.icon, "RIGHT", 8, 0)
		r.name:SetPoint("RIGHT", -96, 0)
		r.name:SetWordWrap(false)
		r.prof = Text(r, "GameFontDisableSmall", "RIGHT")
		r.prof:SetPoint("RIGHT", -6, 0)
		r:SetScript("OnClick", function(self)
			if self.id then
				Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
				SelectRecipe(self.id)
			end
		end)
		r:Hide()
		dialog.results[i] = r
	end
	dialog.noResults = Text(dialog, "GameFontDisableSmall")
	dialog.noResults:SetPoint("TOPLEFT", 26, -94)
	dialog.noResults:SetText("No recipe by that name yet.")
	dialog.noResults:Hide()

	dialog.pick = CreateFrame("Frame", nil, dialog)
	dialog.pick:SetPoint("TOPLEFT", 18, -62)
	dialog.pick:SetPoint("RIGHT", -18, 0)
	dialog.pick:SetHeight(44)
	dialog.pick.edge = dialog.pick:CreateTexture(nil, "BORDER")
	dialog.pick.edge:SetSize(42, 42)
	dialog.pick.edge:SetPoint("LEFT")
	dialog.pick.edge:SetColorTexture(0, 0, 0, 0.85)
	dialog.pick.icon = dialog.pick:CreateTexture(nil, "ARTWORK")
	dialog.pick.icon:SetSize(40, 40)
	dialog.pick.icon:SetPoint("CENTER", dialog.pick.edge, "CENTER")
	dialog.pick.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	dialog.pick.name = Text(dialog.pick, "GameFontNormalLarge")
	dialog.pick.name:SetPoint("TOPLEFT", dialog.pick.edge, "TOPRIGHT", 10, -3)
	dialog.pick.name:SetPoint("RIGHT", -110, 0)
	dialog.pick.name:SetWordWrap(false)
	dialog.pick.prof = Text(dialog.pick, "GameFontDisableSmall")
	dialog.pick.prof:SetPoint("BOTTOMLEFT", dialog.pick.edge, "BOTTOMRIGHT", 10, 3)
	dialog.pick.change = LinkButton(dialog.pick, "Change", function()
		SelectRecipe(nil)
		dialog.search:SetText("")
		ShowResults()
	end)
	dialog.pick.change.text:ClearAllPoints()
	dialog.pick.change.text:SetPoint("LEFT")
	dialog.pick.change:SetPoint("LEFT", dialog.pick.prof, "RIGHT", 10, 0)
	dialog.amountLabel = Text(dialog.pick, "GameFontDisableSmall", "CENTER")
	dialog.amountLabel:SetText("Amount")
	dialog.amount = Spinner(dialog.pick, function()
		UpdateNeeds()
	end)
	dialog.amount:SetPoint("RIGHT", dialog.pick, "RIGHT", -26, -6)
	dialog.amountLabel:SetPoint("BOTTOM", dialog.amount, "TOP", 0, 3)
	dialog.amount:SetRange(1, 99)
	dialog.pick:Hide()

	dialog.body = CreateFrame("Frame", nil, dialog)
	dialog.body:SetPoint("TOPLEFT", 0, -118)
	dialog.body:SetPoint("BOTTOMRIGHT", 0, 90)
	dialog.matsHead = Label(dialog.body, "Materials you bring")
	dialog.matsHead:SetPoint("TOPLEFT", 20, 0)
	dialog.noneLink = LinkButton(dialog.body, "None", function()
		for _, row in ipairs(dialog.rows) do
			if row:IsShown() then
				row.spin:Set(0)
			end
		end
		DialogInfo()
	end)
	dialog.noneLink:SetPoint("TOPRIGHT", -20, 0)
	dialog.allLink = LinkButton(dialog.body, "All", function()
		for _, row in ipairs(dialog.rows) do
			if row:IsShown() and row.per then
				row.spin:Set(row.per * math.max(1, dialog.amount:Get()))
			end
		end
		DialogInfo()
	end)
	dialog.allLink:SetPoint("RIGHT", dialog.noneLink, "LEFT", -6, 0)
	local rule = dialog.body:CreateTexture(nil, "ARTWORK")
	rule:SetHeight(1)
	rule:SetPoint("TOPLEFT", 18, -18)
	rule:SetPoint("TOPRIGHT", -18, -18)
	rule:SetColorTexture(1, 0.82, 0, 0.25)
	dialog.rows = {}
	for i = 1, REAGENT_ROWS do
		local row = CreateFrame("Frame", nil, dialog.body)
		row:SetHeight(REAGENT_ROW)
		row:SetPoint("TOPLEFT", 18, -24 - (i - 1) * REAGENT_ROW)
		row:SetPoint("RIGHT", -18, 0)
		row.icon = row:CreateTexture(nil, "ARTWORK")
		row.icon:SetSize(20, 20)
		row.icon:SetPoint("LEFT", 2, 0)
		row.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
		row.name = Text(row, "GameFontHighlight")
		row.name:SetPoint("LEFT", row.icon, "RIGHT", 8, 0)
		row.name:SetPoint("RIGHT", -130, 0)
		row.name:SetWordWrap(false)
		row.total = Text(row, "GameFontHighlightSmall", "LEFT")
		row.total:SetPoint("RIGHT", 0, 0)
		row.total:SetWidth(36)
		row.spin = Spinner(row, function()
			DialogInfo()
		end)
		row.spin:SetPoint("RIGHT", row.total, "LEFT", -26, 0)
		row:Hide()
		dialog.rows[i] = row
	end
	dialog.noReagents = Text(dialog.body, "GameFontDisableSmall")
	dialog.noReagents:SetPoint("TOPLEFT", 22, -30)
	dialog.noReagents:SetText("Reagents for this item aren't known yet.")
	dialog.noReagents:Hide()

	dialog.details = CreateFrame("Frame", nil, dialog.body)
	dialog.details:SetHeight(110)
	local payLabel = Label(dialog.details, "You pay")
	payLabel:SetPoint("TOPLEFT", 20, 0)
	dialog.gold = MoneyBox(dialog.details, 5, 64)
	dialog.gold:SetPoint("TOPLEFT", 136, 4)
	local goldIcon = dialog.details:CreateTexture(nil, "ARTWORK")
	goldIcon:SetSize(13, 13)
	goldIcon:SetPoint("LEFT", dialog.gold, "RIGHT", 3, 0)
	goldIcon:SetTexture("Interface\\MoneyFrame\\UI-GoldIcon")
	dialog.silver = MoneyBox(dialog.details, 2, 30)
	dialog.silver:SetPoint("LEFT", goldIcon, "RIGHT", 12, 0)
	local silverIcon = dialog.details:CreateTexture(nil, "ARTWORK")
	silverIcon:SetSize(13, 13)
	silverIcon:SetPoint("LEFT", dialog.silver, "RIGHT", 3, 0)
	silverIcon:SetTexture("Interface\\MoneyFrame\\UI-SilverIcon")

	local noteLabel = Label(dialog.details, "Note")
	noteLabel:SetPoint("TOPLEFT", 20, -34)
	dialog.note = CreateFrame("EditBox", nil, dialog.details, "InputBoxTemplate")
	dialog.note:SetHeight(20)
	dialog.note:SetPoint("TOPLEFT", 140, -30)
	dialog.note:SetPoint("RIGHT", -20, 0)
	dialog.note:SetAutoFocus(false)
	dialog.note:SetMaxLetters(60)

	local keepLabel = Label(dialog.details, "Keep it up for")
	keepLabel:SetPoint("TOPLEFT", 20, -68)
	dialog.duration = Button(dialog.details, "", 130, function(self)
		Menu(self, function(root)
			for _, d in ipairs(LI.Work.DURATIONS) do
				root:CreateRadio(d.name, function()
					return dialog.seconds == d.seconds
				end, function()
					dialog.seconds = d.seconds
					LI.Work.Settings().duration = d.seconds
					self:SetText(d.name)
				end)
			end
		end)
	end)
	dialog.duration:SetPoint("TOPLEFT", 134, -64)

	dialog.info = Text(dialog, "GameFontHighlightSmall")
	dialog.info:SetPoint("BOTTOMLEFT", 20, 46)
	dialog.info:SetWidth(320)
	dialog.info:SetSpacing(3)
	dialog.error = Text(dialog, "GameFontRedSmall")
	dialog.error:SetPoint("BOTTOMLEFT", dialog.info, "TOPLEFT", 0, 6)
	dialog.error:SetWidth(320)
	dialog.post = Button(dialog, "Post request", 150, function()
		WorkUI.Submit()
	end)
	dialog.post:SetPoint("BOTTOMRIGHT", -16, 12)
	dialog.cancel = Button(dialog, "Cancel", 90, function()
		dialog:Hide()
	end)
	dialog.cancel:SetPoint("RIGHT", dialog.post, "LEFT", -6, 0)
	dialog.body:Hide()
	dialog:Hide()
	LI.UI.Side(dialog)
end

function WorkUI.Dialog()
	return dialog
end

function WorkUI.OpenDialog(recipe)
	if not LI.ready then
		return
	end
	if not LI.UI.Main() then
		LI.UI.Open(LI.UI.TAB.work)
	end
	if not dialog then
		CreateDialog()
	end
	local book = LI.Book and LI.Book.Frame()
	if book then
		book:Hide()
	end
	dialog.search:SetText("")
	dialog.amount:Set(1)
	dialog.gold:SetText("")
	dialog.silver:SetText("")
	dialog.note:SetText("")
	dialog.seconds = LI.Work.Settings().duration
	dialog.duration:SetText(DurationName(dialog.seconds))
	SelectRecipe(recipe)
	ShowResults()
	dialog:Show()
end

function WorkUI.Submit()
	local req, err = LI.Work.Post({
		recipe = dialog.recipe,
		qty = dialog.amount:Get(),
		have = Have(),
		price = (dialog.gold:GetNumber() or 0) * 10000 + (dialog.silver:GetNumber() or 0) * 100,
		note = dialog.note:GetText(),
		duration = dialog.seconds,
	})
	if not req then
		dialog.error:SetText(err or "")
		return
	end
	Sound("IG_QUEST_LIST_COMPLETE")
	dialog:Hide()
	view = "mine"
	LI.UI.Open(LI.UI.TAB.work)
	local count, online = LI.Work.KnownCrafters(req.recipe)
	local name, icon = WorkUI.Name(req)
	WorkUI.Toast({
		icon = icon,
		head = "Request posted",
		title = name .. (req.qty > 1 and (" \195\151" .. req.qty) or ""),
		sub = count > 0 and string.format("%d %s on your list %s it, %d online", count, count == 1 and "crafter" or "crafters", count == 1 and "knows" or "know", online) or "Linked Inn users who can make it get a notice",
		onClick = function()
			view = "mine"
			LI.UI.Open(LI.UI.TAB.work)
		end,
	})
end

local function NewToast(req)
	local name, icon = WorkUI.Name(req)
	return {
		icon = icon,
		head = "Someone needs something you can make",
		title = name .. (req.qty > 1 and (" \195\151" .. req.qty) or ""),
		sub = string.format("%s  \194\183  %s  \194\183  %s", LI.ShortName(req.owner), WorkUI.Money(req.price), LI.Work.MATS[req.mats].name),
		sound = LI.Work.Settings().sound and "UI_EPICLOOT_TOAST" or nil,
		onClick = function()
			view = "foryou"
			LI.UI.Open(LI.UI.TAB.work)
		end,
	}
end

local function OfferToast(req, from)
	local name, icon = WorkUI.Name(req)
	return {
		icon = icon,
		head = "Someone can make it for you",
		title = name,
		sub = LI.ShortName(from) .. " offered. Click to whisper.",
		sound = LI.Work.Settings().sound and "UI_EPICLOOT_TOAST" or nil,
		onClick = function()
			Whisper(from, "Hi! About my request for " .. ItemLink(req) .. ":")
		end,
	}
end

LI.Listen("WorkNew", function(req)
	local s = LI.Work.Settings()
	if s.notify then
		WorkUI.Toast(NewToast(req))
	elseif s.sound then
		Sound("UI_EPICLOOT_TOAST")
	end
	if s.glow then
		LI.Fire("WorkGlow", true)
	end
end)

LI.Listen("WorkOffer", function(req, from)
	WorkUI.Toast(OfferToast(req, from))
end)

LI.Listen("WorkSeen", function()
	LI.Fire("WorkGlow", false)
end)

LI.Listen("WorkChanged", function()
	if page and page:IsShown() then
		LI.After(0.05, WorkUI.Refresh)
	end
end)
