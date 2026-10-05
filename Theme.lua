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
Theme.WOOD_TINT = { 0.4, 0.31, 0.23, 0.98 }
Theme.CARD_TINT = { 0.8, 0.68, 0.54, 0.96 }
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
		bgFile = Theme.WOOD,
		edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
		tile = true,
		tileSize = 200,
		edgeSize = 14,
		insets = { left = 3, right = 3, top = 3, bottom = 3 },
	})
	local c = Theme.CARD_TINT
	frame:SetBackdropColor(c[1], c[2], c[3], alpha or c[4])
	frame:SetBackdropBorderColor(Theme.BRASS[1], Theme.BRASS[2], Theme.BRASS[3], 0.85)
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

local function AtlasCoords(atlas)
	if not C_Texture or not C_Texture.GetAtlasInfo then
		return nil
	end
	local info = LI.Try(C_Texture.GetAtlasInfo, atlas)
	if type(info) ~= "table" or not (info.file or info.filename) or not info.leftTexCoord then
		return nil
	end
	return info
end

function Theme.FlippedAtlas(tex, atlas, horizontal, vertical)
	if not horizontal and not vertical then
		return Theme.SetAtlas(tex, atlas)
	end
	local info = AtlasCoords(atlas)
	if not info then
		return Theme.SetAtlas(tex, atlas)
	end
	tex:SetTexture(info.file or info.filename)
	local l, r, t, b = info.leftTexCoord, info.rightTexCoord, info.topTexCoord, info.bottomTexCoord
	if horizontal then
		l, r = r, l
	end
	if vertical then
		t, b = b, t
	end
	tex:SetTexCoord(l, r, t, b)
	return true
end

local WOOD_CORNER = "Garr_WoodFrameCorner"
local WOOD_TOP = "_Garr_WoodFrameTile-Top"
local WOOD_BOTTOM = "_Garr_WoodFrameTile-Bottom"
local WOOD_SIDE = "!Garr_WoodFrameTile-Left"
local WOOD_EDGE = 26
local WOOD_CORNER_SIZE = 50
local WOOD_OUT = 13

function Theme.WoodFrame(frame)
	local probe = frame:CreateTexture(nil, "BORDER", nil, 6)
	if not Theme.SetAtlas(probe, WOOD_CORNER) then
		probe:Hide()
		return false
	end
	local parts = {}
	local function Corner(tex, point, x, y, h, v)
		Theme.FlippedAtlas(tex, WOOD_CORNER, h, v)
		tex:SetSize(WOOD_CORNER_SIZE, WOOD_CORNER_SIZE)
		tex:SetPoint(point, frame, point, x, y)
		parts[#parts + 1] = tex
		return tex
	end
	local tl = Corner(probe, "TOPLEFT", -WOOD_OUT, WOOD_OUT, false, false)
	local tr = Corner(frame:CreateTexture(nil, "BORDER", nil, 6), "TOPRIGHT", WOOD_OUT, WOOD_OUT, true, false)
	local bl = Corner(frame:CreateTexture(nil, "BORDER", nil, 6), "BOTTOMLEFT", -WOOD_OUT, -WOOD_OUT, false, true)
	local br = Corner(frame:CreateTexture(nil, "BORDER", nil, 6), "BOTTOMRIGHT", WOOD_OUT, -WOOD_OUT, true, true)
	local function Edge(atlas, horiz)
		local tex = frame:CreateTexture(nil, "BORDER", nil, 5)
		Theme.SetAtlas(tex, atlas)
		if horiz and tex.SetHorizTile then
			tex:SetHorizTile(true)
		elseif not horiz and tex.SetVertTile then
			tex:SetVertTile(true)
		end
		parts[#parts + 1] = tex
		return tex
	end
	local top = Edge(WOOD_TOP, true)
	top:SetPoint("TOPLEFT", tl, "TOPRIGHT", 0, 0)
	top:SetPoint("TOPRIGHT", tr, "TOPLEFT", 0, 0)
	top:SetHeight(WOOD_EDGE)
	local bottom = Edge(WOOD_BOTTOM, true)
	bottom:SetPoint("BOTTOMLEFT", bl, "BOTTOMRIGHT", 0, 0)
	bottom:SetPoint("BOTTOMRIGHT", br, "BOTTOMLEFT", 0, 0)
	bottom:SetHeight(WOOD_EDGE)
	local left = Edge(WOOD_SIDE, false)
	left:SetPoint("TOPLEFT", tl, "BOTTOMLEFT", 0, 0)
	left:SetPoint("BOTTOMLEFT", bl, "TOPLEFT", 0, 0)
	left:SetWidth(WOOD_EDGE)
	local right = Edge(WOOD_SIDE, false)
	right:SetPoint("TOPRIGHT", tr, "BOTTOMRIGHT", 0, 0)
	right:SetPoint("BOTTOMRIGHT", br, "TOPRIGHT", 0, 0)
	right:SetWidth(WOOD_EDGE)
	frame.woodFrame = parts
	return true
end

local PARCH_END = "GarrMission_ParchmentHeader-End"
local PARCH_MID = "_GarrMission_ParchmentHeader-Mid"

function Theme.Parchment(parent, fontString, width)
	local left = parent:CreateTexture(nil, "BACKGROUND", nil, 3)
	if not Theme.SetAtlas(left, PARCH_END) then
		left:Hide()
		return nil
	end
	local h = 34
	left:SetSize(h * 65 / 41, h)
	left:SetPoint("LEFT", fontString, "LEFT", -22, 0)
	local right = parent:CreateTexture(nil, "BACKGROUND", nil, 3)
	Theme.FlippedAtlas(right, PARCH_END, true, false)
	right:SetSize(h * 65 / 41, h)
	right:SetPoint("LEFT", fontString, "LEFT", width - 22 - h * 65 / 41, 0)
	local mid = parent:CreateTexture(nil, "BACKGROUND", nil, 3)
	Theme.SetAtlas(mid, PARCH_MID)
	if mid.SetHorizTile then
		mid:SetHorizTile(true)
	end
	mid:SetPoint("TOPLEFT", left, "TOPRIGHT", 0, 0)
	mid:SetPoint("BOTTOMRIGHT", right, "BOTTOMLEFT", 0, 0)
	fontString:SetTextColor(0.28, 0.17, 0.07)
	fontString:SetShadowColor(0, 0, 0, 0)
	return { left, mid, right }
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
	if Theme.WoodFrame(frame) and frame.SetBackdropBorderColor then
		frame:SetBackdropBorderColor(0, 0, 0, 0)
	end
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

Theme.PROFESSION_ART = {
	alchemy = true, blacksmithing = true, cooking = true, enchanting = true, engineering = true, fishing = true,
	herbalism = true, inscription = true, jewelcrafting = true, leatherworking = true, mining = true,
	skinning = true, tailoring = true,
}

function Theme.SetAtlas(tex, atlas)
	if not tex or not atlas or not tex.SetAtlas then
		return false
	end
	return pcall(tex.SetAtlas, tex, atlas, false) and true or false
end

function Theme.ProfessionArt(tex, profKey)
	local name = Theme.PROFESSION_ART[profKey or ""] and ("professions-recipe-background-" .. profKey) or "professions-recipe-background"
	if Theme.SetAtlas(tex, name) or Theme.SetAtlas(tex, "professions-recipe-background") then
		tex:Show()
		return true
	end
	tex:Hide()
	return false
end

function Theme.Crest(frame, atlas, width)
	local crest = frame:CreateTexture(nil, "ARTWORK", nil, 7)
	if not Theme.SetAtlas(crest, atlas) then
		crest:Hide()
		return nil
	end
	local w = width or (frame:GetWidth() + 24)
	crest:SetSize(w, w * 108 / 527)
	crest:SetPoint("BOTTOM", frame, "TOP", 0, -8)
	return crest
end

function Theme.Filigree(parent, anchor, side)
	local tex = parent:CreateTexture(nil, "ARTWORK")
	if not Theme.SetAtlas(tex, "Banner-SmallFiligree") then
		tex:Hide()
		return nil
	end
	tex:SetSize(61, 19)
	tex:SetVertexColor(1, 0.86, 0.5, 0.95)
	if side == "LEFT" then
		tex:SetPoint("RIGHT", anchor, "LEFT", -8, -2)
		tex:SetTexCoord(1, 0, 0, 1)
	else
		tex:SetPoint("LEFT", anchor, "RIGHT", 8, -2)
	end
	return tex
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
