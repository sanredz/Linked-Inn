local ADDON, LI = ...

local Orders = {}
LI.Orders = Orders

local ROWS = 8
local ROW_HEIGHT = 22
local WIDTH = 236
local panel, hookedForm, currentRecipe
local ONLINE = { 0.35, 0.95, 0.45 }
local SOFT = { 0.72, 0.68, 0.6 }

function Orders.Crafters(recipeID)
	local list = {}
	if type(recipeID) ~= "number" then
		return list
	end
	for key, c in pairs(LI.crafters or {}) do
		if key ~= LI.playerKey and type(c) == "table" and type(c.profs) == "table" and LI.Allowed(key) then
			for profKey, p in pairs(c.profs) do
				if type(p) == "table" and LI.KnowsRecipe(p, profKey, recipeID) then
					local status, seenAt = LI.Status(key)
					list[#list + 1] = { key = key, c = c, p = p, profKey = profKey, status = status, seen = seenAt or c.seen or 0 }
					break
				end
			end
		end
	end
	table.sort(list, function(a, b)
		local oa, ob = a.status == "online" and 1 or 0, b.status == "online" and 1 or 0
		if oa ~= ob then
			return oa > ob
		end
		local ra, rb = a.p.rank or 0, b.p.rank or 0
		if ra ~= rb then
			return ra > rb
		end
		if a.seen ~= b.seen then
			return a.seen > b.seen
		end
		return a.key < b.key
	end)
	return list
end

local function Personal(form)
	local box = form and form.OrderRecipientTarget
	return box ~= nil and box.IsShown ~= nil and box:IsShown()
end

local function Fill(entry)
	local form = hookedForm
	local box = form and form.OrderRecipientTarget
	if not entry or not box or not Personal(form) then
		if panel then
			panel.hint:SetTextColor(1, 0.82, 0)
		end
		return false
	end
	box:SetText(LI.WhisperTarget(entry.key) or "")
	if box.SetFocus then
		box:SetFocus()
	end
	if PlaySound and SOUNDKIT and SOUNDKIT.IG_MAINMENU_OPTION_CHECKBOX_ON then
		LI.Try(PlaySound, SOUNDKIT.IG_MAINMENU_OPTION_CHECKBOX_ON)
	end
	return true
end
Orders.Fill = Fill

function Orders.Panel()
	return panel
end

local function ShowTooltip(row)
	local entry = row.entry
	if not entry then
		return
	end
	GameTooltip:SetOwner(row, "ANCHOR_RIGHT")
	local color = LI.ClassColor(entry.c.class) or LI.COLOR.WHITE
	GameTooltip:SetText(LI.ShortName(entry.key), color[1], color[2], color[3])
	local p = entry.p
	local line = p.name or entry.profKey
	if p.rank and p.rank > 0 then
		line = string.format("%s %d/%d", line, p.rank, p.max or p.rank)
	end
	GameTooltip:AddLine(line, 1, 1, 1)
	if p.tier then
		GameTooltip:AddLine(p.tier, SOFT[1], SOFT[2], SOFT[3])
	end
	if entry.status == "online" then
		GameTooltip:AddLine("Online now", ONLINE[1], ONLINE[2], ONLINE[3])
	elseif entry.seen and entry.seen > 0 then
		GameTooltip:AddLine("Last seen " .. LI.Ago(entry.seen), SOFT[1], SOFT[2], SOFT[3])
	end
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine(Personal(hookedForm) and "Click to send this order to them" or "Choose a personal order first", 0.5, 0.5, 0.5)
	GameTooltip:AddLine("Right-click to whisper", 0.5, 0.5, 0.5)
	GameTooltip:Show()
end

local function Row(i)
	local row = panel.rows[i]
	if row then
		return row
	end
	row = CreateFrame("Button", nil, panel)
	row:SetSize(WIDTH - 24, ROW_HEIGHT)
	row:SetPoint("TOPLEFT", panel, "TOPLEFT", 12, -50 - (i - 1) * ROW_HEIGHT)
	row:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	row.hl = row:CreateTexture(nil, "HIGHLIGHT")
	row.hl:SetAllPoints()
	row.hl:SetColorTexture(1, 0.82, 0.3, 0.12)
	row.name = row:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
	row.name:SetPoint("LEFT", 4, 0)
	row.name:SetJustifyH("LEFT")
	row.state = row:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	row.state:SetPoint("RIGHT", -4, 0)
	row.state:SetJustifyH("RIGHT")
	row.name:SetPoint("RIGHT", row.state, "LEFT", -6, 0)
	row:SetScript("OnClick", function(self, button)
		if not self.entry then
			return
		end
		if button == "RightButton" then
			local link = currentRecipe and LI.db.recipes[currentRecipe] and LI.db.recipes[currentRecipe].n
			LI.Whisper(self.entry.key, link and ("Hi! Could you make " .. link .. "? I can send you a personal crafting order.") or "")
			return
		end
		Fill(self.entry)
	end)
	row:SetScript("OnEnter", ShowTooltip)
	row:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	panel.rows[i] = row
	return row
end

local function Build(parent)
	panel = CreateFrame("Frame", nil, parent)
	panel:SetSize(WIDTH, 100)
	panel:SetPoint("TOPLEFT", parent, "TOPRIGHT", 4, -64)
	panel:SetFrameStrata(parent.GetFrameStrata and parent:GetFrameStrata() or "HIGH")
	panel:SetClampedToScreen(true)
	if LI.Theme and LI.Theme.Wood then
		LI.Theme.Wood(panel)
	end
	panel.title = LI.Theme and LI.Theme.Title and LI.Theme.Title(panel, "Linked Inn", 16) or panel:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	panel.title:SetPoint("TOPLEFT", 14, -12)
	panel.sub = panel:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	panel.sub:SetPoint("TOPLEFT", panel.title, "BOTTOMLEFT", 0, -3)
	panel.hint = panel:CreateFontString(nil, "OVERLAY", "GameFontDisableSmall")
	panel.hint:SetJustifyH("LEFT")
	panel.hint:SetWidth(WIDTH - 28)
	panel.rows = {}
	panel:Hide()
	return panel
end

function Orders.Refresh(form)
	form = form or hookedForm
	if not panel or not form then
		return
	end
	local order = form.order
	local recipeID = type(order) == "table" and LI.Safe(order.spellID) or nil
	local committed = type(order) == "table" and order.orderID ~= nil
	currentRecipe = recipeID
	local list = (not committed and LI.ready) and Orders.Crafters(recipeID) or {}
	if #list == 0 or not (form.IsShown and form:IsShown()) then
		panel:Hide()
		return
	end
	local online = 0
	for _, e in ipairs(list) do
		if e.status == "online" then
			online = online + 1
		end
	end
	panel.sub:SetText(string.format("%d on your list can make this%s", #list, online > 0 and string.format(", |cff59f273%d online|r", online) or ""))
	local shown = math.min(#list, ROWS)
	for i = 1, shown do
		local row = Row(i)
		local e = list[i]
		row.entry = e
		local color = LI.ClassColor(e.c.class) or LI.COLOR.WHITE
		row.name:SetText(LI.ShortName(e.key))
		row.name:SetTextColor(color[1], color[2], color[3])
		if e.status == "online" then
			row.state:SetText("online")
			row.state:SetTextColor(ONLINE[1], ONLINE[2], ONLINE[3])
		else
			row.state:SetText(e.seen and e.seen > 0 and LI.ShortAgo(e.seen) or "")
			row.state:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
		end
		row:Show()
	end
	for i = shown + 1, #panel.rows do
		panel.rows[i].entry = nil
		panel.rows[i]:Hide()
	end
	panel.hint:ClearAllPoints()
	panel.hint:SetPoint("TOPLEFT", panel, "TOPLEFT", 14, -54 - shown * ROW_HEIGHT)
	panel.hint:SetText(Personal(form) and "Click a name to send them this order." or "Choose a personal order, then click a name.")
	panel.hint:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	panel:SetHeight(76 + shown * ROW_HEIGHT)
	panel:Show()
end

local function Hook()
	local frame = ProfessionsCustomerOrdersFrame
	local form = frame and frame.Form
	if hookedForm or not form or not hooksecurefunc or type(form.Init) ~= "function" then
		return hookedForm ~= nil
	end
	hookedForm = form
	Build(frame)
	hooksecurefunc(form, "Init", function(self)
		Orders.Refresh(self)
	end)
	if type(form.SetOrderRecipient) == "function" then
		hooksecurefunc(form, "SetOrderRecipient", function(self)
			Orders.Refresh(self)
		end)
	end
	if form.HookScript then
		form:HookScript("OnShow", function(self)
			Orders.Refresh(self)
		end)
		form:HookScript("OnHide", function()
			panel:Hide()
		end)
	end
	return true
end

if LI.RETAIL then
	LI.On("ADDON_LOADED", function(name)
		if name == "Blizzard_ProfessionsCustomerOrders" then
			Hook()
		end
	end)
	LI.Listen("Ready", function()
		Hook()
	end)
end
