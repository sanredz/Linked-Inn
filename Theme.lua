local ADDON, LI = ...

local Theme = {}
LI.Theme = Theme

Theme.FONT = "Fonts\\MORPHEUS.TTF"
Theme.GOLD = { 1, 0.82, 0 }
Theme.BRASS = { 0.86, 0.66, 0.3 }
Theme.BRASS_DIM = { 0.55, 0.42, 0.18 }
Theme.CREAM = { 0.94, 0.88, 0.75 }
Theme.MUTED = { 0.66, 0.6, 0.5 }
Theme.WOOD = "Interface\\Collections\\CollectionsBackgroundTile"
Theme.WOOD_TINT = { 0.78, 0.66, 0.52, 0.97 }
Theme.CARD = { 0.07, 0.05, 0.035, 0.88 }
Theme.BUTTON = { 0.16, 0.11, 0.07, 0.92 }
Theme.BUTTON_DOWN = { 0.1, 0.07, 0.045, 0.95 }
Theme.HEADER_BAR = "Interface\\AchievementFrame\\UI-Achievement-RecentHeader"
Theme.ROUND_MASK = "Interface\\CharacterFrame\\TempPortraitAlphaMask"

local function Backdrop(frame)
	if frame.SetBackdrop then
		return true
	end
	if not (Mixin and BackdropTemplateMixin) then
		return false
	end
	Mixin(frame, BackdropTemplateMixin)
	if frame.OnBackdropLoaded then
		LI.Try(frame.OnBackdropLoaded, frame)
	end
	if frame.HookScript and frame.OnBackdropSizeChanged then
		frame:HookScript("OnSizeChanged", frame.OnBackdropSizeChanged)
	end
	return frame.SetBackdrop ~= nil
end
Theme.Backdrop = Backdrop

local function HideRegions(frame)
	if not frame or not frame.GetRegions then
		return
	end
	for _, region in ipairs({ frame:GetRegions() }) do
		if region and region.GetObjectType and region:GetObjectType() == "Texture" and region.Hide then
			region:Hide()
		end
	end
end

local function Hide(frame)
	if frame and frame.Hide then
		frame:Hide()
	end
end

function Theme.Wood(frame)
	if not Backdrop(frame) then
		return
	end
	frame:SetBackdrop({
		bgFile = Theme.WOOD,
		edgeFile = "Interface\\DialogFrame\\UI-DialogBox-Border",
		tile = true,
		tileSize = 200,
		edgeSize = 32,
		insets = { left = 8, right = 8, top = 8, bottom = 8 },
	})
	local w = Theme.WOOD_TINT
	frame:SetBackdropColor(w[1], w[2], w[3], w[4])
	frame:SetBackdropBorderColor(Theme.BRASS[1], Theme.BRASS[2], Theme.BRASS[3], 1)
end

function Theme.Card(frame, alpha)
	if not Backdrop(frame) then
		return
	end
	frame:SetBackdrop({
		bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
		edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
		tile = true,
		tileSize = 16,
		edgeSize = 14,
		insets = { left = 3, right = 3, top = 3, bottom = 3 },
	})
	local c = Theme.CARD
	frame:SetBackdropColor(c[1], c[2], c[3], alpha or c[4])
	frame:SetBackdropBorderColor(Theme.BRASS_DIM[1], Theme.BRASS_DIM[2], Theme.BRASS_DIM[3], 0.9)
end

function Theme.Title(parent, text, size)
	local fs = parent:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	fs:SetFont(Theme.FONT, size or 20, "")
	fs:SetTextColor(Theme.GOLD[1], Theme.GOLD[2], Theme.GOLD[3])
	fs:SetShadowColor(0, 0, 0, 1)
	fs:SetShadowOffset(1, -1)
	fs:SetText(text or "")
	return fs
end

function Theme.Skin(frame, title, opts)
	opts = opts or {}
	HideRegions(frame)
	Hide(frame.NineSlice)
	Hide(frame.Bg)
	Hide(frame.TopTileStreaks)
	Hide(frame.PortraitContainer)
	Hide(frame.portrait)
	if frame.TitleContainer then
		HideRegions(frame.TitleContainer)
		Hide(frame.TitleContainer.TitleText)
	end
	Hide(frame.TitleText)
	if frame.Inset then
		HideRegions(frame.Inset)
		Hide(frame.Inset.NineSlice)
		Hide(frame.Inset.Bg)
		if opts.card ~= false then
			Theme.Card(frame.Inset)
		end
	end
	Theme.Wood(frame)
	local close = frame.CloseButton or (frame.GetName and frame:GetName() and _G[frame:GetName() .. "CloseButton"])
	if close and close.ClearAllPoints then
		close:ClearAllPoints()
		close:SetPoint("TOPRIGHT", frame, "TOPRIGHT", -4, -4)
	end
	if title then
		frame.themeTitle = Theme.Title(frame, title, opts.titleSize or 20)
		frame.themeTitle:SetPoint("TOP", frame, "TOP", 0, opts.titleY or -14)
	end
	return frame
end

function Theme.Button(btn)
	if not btn or btn.themed then
		return btn
	end
	btn.themed = true
	for _, key in ipairs({ "Left", "Middle", "Right", "LeftSeparator", "RightSeparator" }) do
		Hide(btn[key])
	end
	if btn.GetNormalTexture then
		local t = btn:GetNormalTexture()
		if t then t:SetAlpha(0) end
		t = btn.GetPushedTexture and btn:GetPushedTexture()
		if t then t:SetAlpha(0) end
		t = btn.GetHighlightTexture and btn:GetHighlightTexture()
		if t then t:SetAlpha(0) end
		t = btn.GetDisabledTexture and btn:GetDisabledTexture()
		if t then t:SetAlpha(0) end
	end
	if not Backdrop(btn) then
		return btn
	end
	btn:SetBackdrop({
		bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
		edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
		tile = true,
		tileSize = 16,
		edgeSize = 12,
		insets = { left = 3, right = 3, top = 3, bottom = 3 },
	})
	local function Paint(self, hover, down)
		local bg = down and Theme.BUTTON_DOWN or Theme.BUTTON
		self:SetBackdropColor(bg[1], bg[2], bg[3], bg[4])
		local enabled = not self.IsEnabled or self:IsEnabled()
		local b = Theme.BRASS
		self:SetBackdropBorderColor(b[1], b[2], b[3], (hover and enabled) and 1 or 0.6)
		local fs = self.GetFontString and self:GetFontString()
		if fs then
			if not enabled then
				fs:SetTextColor(0.5, 0.46, 0.4)
			elseif hover then
				fs:SetTextColor(1, 1, 1)
			else
				fs:SetTextColor(Theme.GOLD[1], Theme.GOLD[2], Theme.GOLD[3])
			end
		end
	end
	Paint(btn)
	btn:HookScript("OnEnter", function(self) Paint(self, true) end)
	btn:HookScript("OnLeave", function(self) Paint(self, false) end)
	btn:HookScript("OnMouseDown", function(self) Paint(self, true, true) end)
	btn:HookScript("OnMouseUp", function(self) Paint(self, self.IsMouseOver and self:IsMouseOver()) end)
	btn:HookScript("OnEnable", function(self) Paint(self) end)
	btn:HookScript("OnDisable", function(self) Paint(self) end)
	return btn
end

function Theme.HeaderBar(parent)
	local bar = parent:CreateTexture(nil, "BACKGROUND", nil, 1)
	bar:SetTexture(Theme.HEADER_BAR)
	bar:SetTexCoord(0, 1, 0, 0.71875)
	bar:SetVertexColor(1, 0.92, 0.8, 0.85)
	return bar
end

function Theme.Emblem(parent, size, icon)
	local e = CreateFrame("Frame", nil, parent)
	e:SetSize(size, size)
	local outer = e:CreateTexture(nil, "BACKGROUND")
	outer:SetAllPoints()
	outer:SetColorTexture(0.12, 0.08, 0.04, 1)
	local ring = e:CreateTexture(nil, "BORDER")
	ring:SetPoint("TOPLEFT", 2, -2)
	ring:SetPoint("BOTTOMRIGHT", -2, 2)
	ring:SetColorTexture(Theme.BRASS[1], Theme.BRASS[2], Theme.BRASS[3], 1)
	local art = e:CreateTexture(nil, "ARTWORK")
	art:SetPoint("TOPLEFT", 6, -6)
	art:SetPoint("BOTTOMRIGHT", -6, 6)
	art:SetTexture(icon or LI.ICON)
	if e.CreateMaskTexture then
		for _, tex in ipairs({ outer, ring, art }) do
			local mask = e:CreateMaskTexture()
			mask:SetAllPoints(tex)
			mask:SetTexture(Theme.ROUND_MASK, "CLAMPTOBLACKADDITIVE", "CLAMPTOBLACKADDITIVE")
			tex:AddMaskTexture(mask)
		end
	end
	e.art = art
	return e
end
