local ADDON, LI = ...

local WorkUI = {}
LI.WorkUI = WorkUI

local ROW = 50
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"
local SOFT = { 0.72, 0.68, 0.60 }
local GREEN = { 0.35, 0.95, 0.45 }
local GOLD = { 1, 0.82, 0 }
local VIEWS = {
	{ key = "foryou", name = "For you" },
	{ key = "all", name = "All requests" },
	{ key = "mine", name = "My requests" },
}

local page
local dialog
local toast
local toastQueue = {}
local toastBusy = false
local view = "foryou"

local function Text(parent, template, justify)
	local fs = parent:CreateFontString(nil, "OVERLAY", template or "GameFontHighlight")
	fs:SetJustifyH(justify or "LEFT")
	return fs
end

local function Button(parent, label, width, onClick)
	local button = CreateFrame("Button", nil, parent, "UIPanelButtonTemplate")
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
	local target = LI.WhisperTarget(key)
	if ChatFrameUtil and ChatFrameUtil.SendTell then
		ChatFrameUtil.SendTell(target)
	elseif ChatFrame_SendTell then
		ChatFrame_SendTell(target)
	else
		return
	end
	local box = ChatFrameUtil and ChatFrameUtil.GetActiveWindow and LI.Try(ChatFrameUtil.GetActiveWindow)
	if text and box and box.Insert then
		box:Insert(text)
	end
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
	end)
	toast:SetScript("OnEnter", function(self)
		self.hover = true
	end)
	toast:SetScript("OnLeave", function(self)
		self.hover = false
	end)
	toast:Hide()
end

local function ShowNext()
	if toastBusy or #toastQueue == 0 then
		return
	end
	toastBusy = true
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
		if not toast.done and (toast.hover and GetTime() - shown < 20) then
			LI.After(1, Close)
			return
		end
		if not toast.done and toast.fade then
			toast.fade:Play()
		end
		LI.After(0.5, function()
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
		local c = LI.crafters[req.owner]
		local color = LI.ClassColor(c and c.class) or LI.COLOR.WHITE
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
	local lines = LI.Book and LI.Book.ReagentLines(LI.db.recipes[req.recipe] or {}) or {}
	if #lines > 0 then
		GameTooltip:AddLine(" ")
		GameTooltip:AddLine("Reagents", 1, 0.82, 0)
		for _, line in ipairs(lines) do
			GameTooltip:AddLine(line, 1, 1, 1)
		end
	end
	GameTooltip:AddLine(" ")
	if row.mine then
		GameTooltip:AddDoubleLine("Quantity", tostring(req.qty), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Offering", WorkUI.Money(req.price), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Expires", Left(req), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddLine(" ")
		GameTooltip:AddLine("Click to see who can make it   Right-click for offers", 0.5, 0.5, 0.5)
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
			local any = false
			for key in pairs(req.offers or {}) do
				any = true
				root:CreateButton("Whisper " .. LI.ShortName(key), function()
					Whisper(key, "Hi! About my request for " .. ItemLink(req) .. ":")
				end)
			end
			if not any and root.CreateTitle then
				root:CreateTitle("No offers yet")
			end
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
	row.edge:SetPoint("LEFT", 13, 0)
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
	row.state:SetPoint("BOTTOMRIGHT", -12, 9)
	row.offer = Button(row, "I can make it", 104, function(self)
		local req = self:GetParent().req
		if req and LI.Work.Offer(req.key) then
			Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
		end
	end)
	row.offer:SetHeight(20)
	row.offer:SetPoint("BOTTOMRIGHT", -8, 5)
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

function WorkUI.SettingsMenu(owner)
	local s = LI.Work.Settings()
	Menu(owner, function(root)
		if root.CreateTitle then
			root:CreateTitle("Requests you can make")
		end
		root:CreateCheckbox("Pop up a notice", function() return s.notify end, function() s.notify = not s.notify end)
		root:CreateCheckbox("Play a sound", function() return s.sound end, function() s.sound = not s.sound end)
		root:CreateCheckbox("Make the minimap button glow", function() return s.glow end, function() s.glow = not s.glow end)
		root:CreateCheckbox("Only when they have all mats", function() return s.allMats end, function()
			s.allMats = not s.allMats
			WorkUI.Refresh()
		end)
		local prices = root:CreateButton("Minimum price")
		if prices then
			for _, copper in ipairs(LI.Work.MIN_PRICES) do
				prices:CreateRadio(copper == 0 and "Any price" or WorkUI.Money(copper), function()
					return (s.minPrice or 0) == copper
				end, function()
					s.minPrice = copper
					WorkUI.Refresh()
				end)
			end
		end
		local mine = MyProfessions()
		if #mine > 0 then
			local profs = root:CreateButton("Professions")
			if profs then
				for _, prof in ipairs(mine) do
					profs:CreateCheckbox(prof.name, function()
						return not next(s.profs) or s.profs[prof.key] == true
					end, function()
						if not next(s.profs) then
							for _, other in ipairs(mine) do
								s.profs[other.key] = true
							end
						end
						s.profs[prof.key] = not s.profs[prof.key] or nil
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
					end)
				end
			end
		end
	end)
end

function WorkUI.Build(parent)
	page = parent
	ViewButtons(page)
	page.post = Button(page, "Post a request", 128, function()
		WorkUI.OpenDialog()
	end)
	page.post:SetPoint("TOPRIGHT", -36, -8)
	page.gear = CreateFrame("Button", nil, page)
	page.gear:SetSize(20, 20)
	page.gear:SetPoint("LEFT", page.post, "RIGHT", 6, 0)
	page.gear.icon = page.gear:CreateTexture(nil, "ARTWORK")
	page.gear.icon:SetAllPoints()
	page.gear.icon:SetTexture("Interface\\Buttons\\UI-OptionsButton")
	page.gear:SetHighlightTexture("Interface\\Buttons\\UI-Common-MouseHilight", "ADD")
	page.gear:SetScript("OnClick", function(self)
		WorkUI.SettingsMenu(self)
	end)
	page.gear:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_TOP")
		GameTooltip:SetText("Notifications", 1, 0.82, 0)
		GameTooltip:Show()
	end)
	page.gear:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
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
	listView:SetElementExtent(ROW)
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
		local source = view == "foryou" and foryou or LI.Work.Received(false)
		for i, req in ipairs(source) do
			list[#list + 1] = { req = req, index = i }
		end
	end
	page.list:SetDataProvider(CreateDataProvider(list), ScrollBoxConstants and ScrollBoxConstants.RetainScrollPosition)
	page.empty:SetShown(#list == 0)
	if #list == 0 then
		if view == "foryou" then
			page.emptyHead:SetText("Nothing for you right now")
			page.emptyText:SetText("When a Linked Inn user asks for something you can craft, it shows up here and you get a notice.")
		elseif view == "all" then
			page.emptyHead:SetText("No open requests")
			page.emptyText:SetText("Requests from other Linked Inn users appear here while they're online.")
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

local function Label(parent, text, y)
	local fs = Text(parent, "GameFontNormal")
	fs:SetPoint("TOPLEFT", 20, y)
	fs:SetText(text)
	return fs
end

local function DialogInfo()
	if not dialog.recipe then
		dialog.info:SetText("")
		return
	end
	local count, online = LI.Work.KnownCrafters(dialog.recipe)
	if count == 0 then
		dialog.info:SetText("Nobody on your list knows this yet. Linked Inn users who can make it still get a notice.")
	else
		dialog.info:SetText(string.format("%d %s on your list %s it%s.", count, count == 1 and "crafter" or "crafters", count == 1 and "knows" or "know", online > 0 and string.format(", |cff59f273%d online|r", online) or ""))
	end
end

local function SelectRecipe(id)
	dialog.recipe = id
	local meta = id and LI.db.recipes[id]
	dialog.pick:SetShown(meta ~= nil)
	dialog.search:SetShown(meta == nil)
	for _, r in ipairs(dialog.results) do
		r:Hide()
	end
	if meta then
		dialog.pick.icon:SetTexture(meta.i or "Interface\\Icons\\INV_Misc_QuestionMark")
		dialog.pick.name:SetText(meta.n or "?")
		local color = Quality(meta.item) or { 1, 1, 1 }
		dialog.pick.name:SetTextColor(color[1], color[2], color[3])
	end
	dialog.post:SetEnabled(meta ~= nil)
	dialog.error:SetText("")
	DialogInfo()
end

local function ShowResults()
	local found = SearchItems(dialog.search:GetText())
	for i, r in ipairs(dialog.results) do
		local hit = found[i]
		r.id = hit and hit.id
		if hit then
			r.icon:SetTexture(hit.meta.i or "Interface\\Icons\\INV_Misc_QuestionMark")
			r.name:SetText(hit.meta.n)
			r.prof:SetText(LI.PROFESSION_NAMES[hit.meta.p or ""] or "")
			r:Show()
		else
			r:Hide()
		end
	end
	dialog.noResults:SetShown(#found == 0 and LI.Trim(dialog.search:GetText() or "") ~= "")
end

local function SetMats(key)
	dialog.mats = key
	for _, b in ipairs(dialog.matButtons) do
		if b.key == key then
			b:LockHighlight()
			b:GetFontString():SetTextColor(1, 1, 1)
		else
			b:UnlockHighlight()
			b:GetFontString():SetTextColor(GOLD[1], GOLD[2], GOLD[3])
		end
	end
end

local function DurationName(seconds)
	for _, d in ipairs(LI.Work.DURATIONS) do
		if d.seconds == seconds then
			return d.name
		end
	end
	return LI.Duration(seconds)
end

local function NumberBox(parent, width, letters)
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
	dialog:SetSize(360, 580)
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

	Label(dialog, "What do you need made?", -36)
	dialog.search = CreateFrame("EditBox", nil, dialog, "SearchBoxTemplate")
	dialog.search:SetSize(316, 22)
	dialog.search:SetPoint("TOPLEFT", 24, -56)
	if dialog.search.Instructions then
		dialog.search.Instructions:SetText("Type an item name")
	end
	dialog.search:SetScript("OnTextChanged", function(self)
		if SearchBoxTemplate_OnTextChanged then
			pcall(SearchBoxTemplate_OnTextChanged, self)
		end
		ShowResults()
	end)
	dialog.results = {}
	for i = 1, 6 do
		local r = CreateFrame("Button", nil, dialog)
		r:SetSize(316, 24)
		r:SetPoint("TOPLEFT", 24, -80 - (i - 1) * 24)
		r.hl = r:CreateTexture(nil, "HIGHLIGHT")
		r.hl:SetAllPoints()
		r.hl:SetColorTexture(1, 0.82, 0.3, 0.12)
		r.icon = r:CreateTexture(nil, "ARTWORK")
		r.icon:SetSize(20, 20)
		r.icon:SetPoint("LEFT", 2, 0)
		r.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
		r.name = Text(r, "GameFontHighlight")
		r.name:SetPoint("LEFT", r.icon, "RIGHT", 8, 0)
		r.name:SetPoint("RIGHT", -90, 0)
		r.name:SetWordWrap(false)
		r.prof = Text(r, "GameFontDisableSmall", "RIGHT")
		r.prof:SetPoint("RIGHT", -4, 0)
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
	dialog.noResults:SetPoint("TOPLEFT", 28, -86)
	dialog.noResults:SetText("No recipe by that name in your list yet.")
	dialog.noResults:Hide()

	dialog.pick = CreateFrame("Frame", nil, dialog)
	dialog.pick:SetSize(316, 44)
	dialog.pick:SetPoint("TOPLEFT", 24, -56)
	dialog.pick.edge = dialog.pick:CreateTexture(nil, "BORDER")
	dialog.pick.edge:SetSize(42, 42)
	dialog.pick.edge:SetPoint("LEFT")
	dialog.pick.edge:SetColorTexture(0, 0, 0, 0.85)
	dialog.pick.icon = dialog.pick:CreateTexture(nil, "ARTWORK")
	dialog.pick.icon:SetSize(40, 40)
	dialog.pick.icon:SetPoint("CENTER", dialog.pick.edge, "CENTER")
	dialog.pick.icon:SetTexCoord(0.07, 0.93, 0.07, 0.93)
	dialog.pick.name = Text(dialog.pick, "GameFontNormalLarge")
	dialog.pick.name:SetPoint("LEFT", dialog.pick.edge, "RIGHT", 10, 6)
	dialog.pick.name:SetPoint("RIGHT", -4, 0)
	dialog.pick.name:SetWordWrap(false)
	dialog.pick.change = CreateFrame("Button", nil, dialog.pick)
	dialog.pick.change:SetSize(60, 16)
	dialog.pick.change:SetPoint("TOPLEFT", dialog.pick.name, "BOTTOMLEFT", 0, -3)
	dialog.pick.change.text = Text(dialog.pick.change, "GameFontNormalSmall")
	dialog.pick.change.text:SetPoint("LEFT")
	dialog.pick.change.text:SetText("Change")
	dialog.pick.change:SetScript("OnClick", function()
		SelectRecipe(nil)
		dialog.search:SetText("")
		ShowResults()
	end)
	dialog.pick:Hide()

	local y = -236
	Label(dialog, "How many?", y)
	dialog.minus = Button(dialog, "-", 24, function()
		dialog.qty:SetNumber(math.max(1, (dialog.qty:GetNumber() or 1) - 1))
	end)
	dialog.minus:SetPoint("TOPLEFT", 160, y + 4)
	dialog.qty = NumberBox(dialog, 36, 2)
	dialog.qty:SetPoint("LEFT", dialog.minus, "RIGHT", 10, 0)
	dialog.plus = Button(dialog, "+", 24, function()
		dialog.qty:SetNumber(math.min(99, (dialog.qty:GetNumber() or 0) + 1))
	end)
	dialog.plus:SetPoint("LEFT", dialog.qty, "RIGHT", 6, 0)

	y = y - 40
	Label(dialog, "Materials", y)
	dialog.matButtons = {}
	local prev
	for _, key in ipairs({ "all", "some", "none" }) do
		local b = Button(dialog, LI.Work.MATS[key].short, 98, function(self)
			Sound("IG_MAINMENU_OPTION_CHECKBOX_ON")
			SetMats(self.key)
		end)
		b.key = key
		if prev then
			b:SetPoint("LEFT", prev, "RIGHT", 4, 0)
		else
			b:SetPoint("TOPLEFT", 24, y - 18)
		end
		dialog.matButtons[#dialog.matButtons + 1] = b
		prev = b
	end

	y = y - 66
	Label(dialog, "You pay", y)
	dialog.gold = NumberBox(dialog, 60, 5)
	dialog.gold:SetPoint("TOPLEFT", 160, y + 3)
	local goldIcon = dialog:CreateTexture(nil, "ARTWORK")
	goldIcon:SetSize(14, 14)
	goldIcon:SetPoint("LEFT", dialog.gold, "RIGHT", 4, 0)
	goldIcon:SetTexture("Interface\\MoneyFrame\\UI-GoldIcon")
	dialog.silver = NumberBox(dialog, 36, 2)
	dialog.silver:SetPoint("LEFT", goldIcon, "RIGHT", 12, 0)
	local silverIcon = dialog:CreateTexture(nil, "ARTWORK")
	silverIcon:SetSize(14, 14)
	silverIcon:SetPoint("LEFT", dialog.silver, "RIGHT", 4, 0)
	silverIcon:SetTexture("Interface\\MoneyFrame\\UI-SilverIcon")

	y = y - 40
	Label(dialog, "Note", y)
	dialog.note = CreateFrame("EditBox", nil, dialog, "InputBoxTemplate")
	dialog.note:SetSize(306, 20)
	dialog.note:SetPoint("TOPLEFT", 30, y - 18)
	dialog.note:SetAutoFocus(false)
	dialog.note:SetMaxLetters(60)

	y = y - 66
	Label(dialog, "Keep it up for", y)
	dialog.duration = Button(dialog, "", 120, function(self)
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
	dialog.duration:SetPoint("TOPLEFT", 160, y + 4)

	dialog.info = Text(dialog, "GameFontHighlightSmall")
	dialog.info:SetPoint("BOTTOMLEFT", 20, 74)
	dialog.info:SetWidth(320)
	dialog.info:SetSpacing(2)
	dialog.error = Text(dialog, "GameFontRedSmall")
	dialog.error:SetPoint("BOTTOMLEFT", 20, 44)
	dialog.error:SetWidth(320)
	dialog.post = Button(dialog, "Post request", 150, function()
		WorkUI.Submit()
	end)
	dialog.post:SetPoint("BOTTOMRIGHT", -16, 14)
	dialog.cancel = Button(dialog, "Cancel", 90, function()
		dialog:Hide()
	end)
	dialog.cancel:SetPoint("RIGHT", dialog.post, "LEFT", -6, 0)
	dialog:Hide()
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
	dialog.qty:SetNumber(1)
	dialog.gold:SetText("")
	dialog.silver:SetText("")
	dialog.note:SetText("")
	dialog.seconds = LI.Work.Settings().duration
	dialog.duration:SetText(DurationName(dialog.seconds))
	SetMats("all")
	SelectRecipe(recipe)
	ShowResults()
	dialog:Show()
end

function WorkUI.Submit()
	local req, err = LI.Work.Post({
		recipe = dialog.recipe,
		qty = dialog.qty:GetNumber(),
		mats = dialog.mats,
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

LI.Listen("WorkNew", function(req)
	local s = LI.Work.Settings()
	local name, icon = WorkUI.Name(req)
	if s.notify then
		WorkUI.Toast({
			icon = icon,
			head = "Someone needs something you can make",
			title = name .. (req.qty > 1 and (" \195\151" .. req.qty) or ""),
			sub = string.format("%s  \194\183  %s  \194\183  %s", LI.ShortName(req.owner), WorkUI.Money(req.price), LI.Work.MATS[req.mats].name),
			sound = s.sound and "UI_EPICLOOT_TOAST" or nil,
			onClick = function()
				view = "foryou"
				LI.UI.Open(LI.UI.TAB.work)
			end,
		})
	elseif s.sound then
		Sound("UI_EPICLOOT_TOAST")
	end
	if s.glow then
		LI.Fire("WorkGlow", true)
	end
end)

LI.Listen("WorkOffer", function(req, from)
	local name, icon = WorkUI.Name(req)
	WorkUI.Toast({
		icon = icon,
		head = "Someone can make it for you",
		title = name,
		sub = LI.ShortName(from) .. " offered. Click to whisper.",
		sound = LI.Work.Settings().sound and "UI_EPICLOOT_TOAST" or nil,
		onClick = function()
			Whisper(from, "Hi! About my request for " .. ItemLink(req) .. ":")
		end,
	})
end)

LI.Listen("WorkSeen", function()
	LI.Fire("WorkGlow", false)
end)

LI.Listen("WorkChanged", function()
	if page and page:IsShown() then
		LI.After(0.05, WorkUI.Refresh)
	end
end)
