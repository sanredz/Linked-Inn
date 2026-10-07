local ADDON, LI = ...

local ScanUI = {}
LI.ScanUI = ScanUI

local GREEN = { 0.35, 0.95, 0.45 }
local SOFT = { 0.72, 0.68, 0.6 }
local strip, badge, ticker
local ART = "Interface\\AddOns\\" .. ADDON .. "\\art\\"

local function Sound(kit)
	if PlaySound and SOUNDKIT and SOUNDKIT[kit] then
		LI.Try(PlaySound, SOUNDKIT[kit])
	end
end

local function Clock(seconds)
	seconds = math.max(0, math.floor(seconds))
	if seconds >= 3600 then
		return string.format("%d:%02d:%02d", math.floor(seconds / 3600), math.floor(seconds / 60) % 60, seconds % 60)
	end
	return string.format("%d:%02d", math.floor(seconds / 60), seconds % 60)
end

local function Pulse(tex)
	if not tex.CreateAnimationGroup then
		return
	end
	local group = tex:CreateAnimationGroup()
	if not group then
		return
	end
	group:SetLooping("BOUNCE")
	local fade = group:CreateAnimation("Alpha")
	fade:SetFromAlpha(1)
	fade:SetToAlpha(0.25)
	fade:SetDuration(0.8)
	tex.pulse = group
end

local function Dot(parent, size)
	local dot = parent:CreateTexture(nil, "OVERLAY")
	dot:SetSize(size, size)
	dot:SetTexture("Interface\\COMMON\\Indicator-Green")
	Pulse(dot)
	return dot
end

local function SetPulsing(tex, on)
	if not tex.pulse then
		return
	end
	if on and not tex.pulse:IsPlaying() then
		tex.pulse:Play()
	elseif not on and tex.pulse:IsPlaying() then
		tex.pulse:Stop()
		tex:SetAlpha(1)
	end
end

local function Switch(parent)
	local sw = CreateFrame("Button", nil, parent)
	sw:SetSize(82, 26)
	sw.track = LI.Slices(sw, ART .. "pill", "BACKGROUND", 26)
	sw.edge = LI.Slices(sw, ART .. "pill_edge", "BORDER", 26)
	sw.knob = sw:CreateTexture(nil, "ARTWORK")
	sw.knob:SetSize(20, 20)
	sw.knob:SetColorTexture(0.96, 0.9, 0.78, 1)
	if sw.CreateMaskTexture then
		local mask = sw:CreateMaskTexture()
		mask:SetAllPoints(sw.knob)
		mask:SetTexture(LI.Theme.ROUND_MASK, "CLAMPTOBLACKADDITIVE", "CLAMPTOBLACKADDITIVE")
		sw.knob:AddMaskTexture(mask)
	end
	sw.label = sw:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	function sw:Set(on)
		self.on = on
		self.knob:ClearAllPoints()
		self.label:ClearAllPoints()
		if on then
			self.knob:SetPoint("RIGHT", -4, 0)
			self.label:SetPoint("LEFT", 13, 0)
			self.label:SetText("ON")
			self.label:SetTextColor(1, 1, 1)
			self.track:SetVertexColor(0.2, 0.75, 0.3, self.hover and 1 or 0.9)
			self.edge:SetVertexColor(GREEN[1], GREEN[2], GREEN[3], 1)
		else
			self.knob:SetPoint("LEFT", 4, 0)
			self.label:SetPoint("RIGHT", -12, 0)
			self.label:SetText("OFF")
			self.label:SetTextColor(0.75, 0.72, 0.66)
			self.track:SetVertexColor(0.1, 0.1, 0.1, self.hover and 0.95 or 0.8)
			self.edge:SetVertexColor(LI.Theme.BRASS[1], LI.Theme.BRASS[2], LI.Theme.BRASS[3], self.hover and 1 or 0.75)
		end
	end
	sw:Set(false)
	return sw
end

local function Toggle()
	if LI.Scan.Active() then
		LI.Scan.Stop()
		Sound("IG_MAINMENU_OPTION_CHECKBOX_OFF")
	elseif LI.Scan.Start() then
		Sound("UI_PROFESSIONS_WINDOW_OPEN")
	end
	ScanUI.Refresh()
end

local function Detail()
	local found = LI.Scan.Found()
	local parts = { found == 1 and "1 crafter found" or (found .. " crafters found"), Clock(time() - (LI.Scan.Since() or time())) }
	parts[#parts + 1] = LI.Scan.StopsInCity() and "stops when you leave the city" or "stops if you enter combat"
	return table.concat(parts, "  ·  "), found
end

local function PaintStrip()
	if not strip then
		return
	end
	local on = LI.Scan.Active()
	if strip.SetBackdropColor then
		if on then
			strip:SetBackdropColor(0.08, 0.22, 0.1, 0.95)
			strip:SetBackdropBorderColor(GREEN[1], GREEN[2], GREEN[3], 0.9)
		else
			strip:SetBackdropColor(0.14, 0.09, 0.05, 0.9)
			strip:SetBackdropBorderColor(LI.Theme.BRASS[1], LI.Theme.BRASS[2], LI.Theme.BRASS[3], 0.85)
		end
	end
	strip.glow:SetShown(on)
	SetPulsing(strip.glow, on)
	strip.dot:SetShown(on)
	SetPulsing(strip.dot, on)
	strip.icon:SetShown(not on)
	if on then
		strip.head:SetText("Scanning for crafters")
		strip.head:SetTextColor(GREEN[1], GREEN[2], GREEN[3])
		strip.sub:SetText((Detail()))
	else
		strip.head:SetText("Crafter scan is off")
		strip.head:SetTextColor(LI.Theme.GOLD[1], LI.Theme.GOLD[2], LI.Theme.GOLD[3])
		strip.sub:SetText(LI.InCity() and "Switch it on to check everyone around you. The game hitches a little while it's on." or "Switch it on in a busy city to gather crafters. The game hitches a little while it's on.")
	end
	strip.button:Set(on)
end

function ScanUI.Attach(main)
	if strip or not LI.Scan.Needed() then
		return strip
	end
	strip = CreateFrame("Frame", nil, main)
	strip:SetPoint("TOPLEFT", main, "TOPLEFT", 16, -64)
	strip:SetPoint("TOPRIGHT", main, "TOPRIGHT", -14, -64)
	strip:SetHeight(LI.STRIP - 6)
	if LI.Theme.Backdrop(strip) then
		strip:SetBackdrop({
			bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
			edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
			tile = true,
			tileSize = 16,
			edgeSize = 12,
			insets = { left = 3, right = 3, top = 3, bottom = 3 },
		})
	end
	strip.glow = strip:CreateTexture(nil, "BORDER")
	strip.glow:SetPoint("TOPLEFT", 3, -3)
	strip.glow:SetPoint("BOTTOMRIGHT", -3, 3)
	strip.glow:SetColorTexture(GREEN[1], GREEN[2], GREEN[3], 0.12)
	Pulse(strip.glow)
	strip.icon = strip:CreateTexture(nil, "ARTWORK")
	strip.icon:SetSize(26, 26)
	strip.icon:SetPoint("LEFT", 8, 0)
	strip.icon:SetTexture("Interface\\Icons\\INV_Misc_Spyglass_03")
	strip.dot = Dot(strip, 18)
	strip.dot:SetPoint("CENTER", strip.icon, "CENTER")
	strip.head = strip:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	strip.head:SetPoint("TOPLEFT", strip.icon, "TOPRIGHT", 10, 1)
	strip.head:SetJustifyH("LEFT")
	strip.sub = strip:CreateFontString(nil, "OVERLAY", "GameFontHighlightSmall")
	strip.sub:SetPoint("TOPLEFT", strip.head, "BOTTOMLEFT", 0, -2)
	strip.sub:SetJustifyH("LEFT")
	strip.sub:SetTextColor(SOFT[1], SOFT[2], SOFT[3])
	strip.button = Switch(strip)
	strip.button:SetPoint("RIGHT", -8, 0)
	strip.button:SetScript("OnClick", Toggle)
	strip.sub:SetPoint("RIGHT", strip.button, "LEFT", -10, 0)
	strip.button:SetScript("OnEnter", function(self)
		self.hover = true
		self:Set(LI.Scan.Active())
		GameTooltip:SetOwner(self, "ANCHOR_BOTTOMLEFT")
		GameTooltip:SetText(LI.Scan.Active() and "Click to stop scanning" or "Click to start scanning", 1, 0.82, 0)
		GameTooltip:AddLine(LI.Scan.Active() and "Stops checking the people around you. Everyone found so far stays on your list." or "Checks everyone around you and every profession linked in chat, with friendly nameplates on so nobody is missed. Loading professions makes the game hitch a little, so switch it on when you're gathering crafters and off when you're done.", 1, 1, 1, true)
		GameTooltip:AddLine("/li scan does the same.", 0.6, 0.6, 0.6)
		GameTooltip:Show()
	end)
	strip.button:SetScript("OnLeave", function(self)
		self.hover = false
		self:Set(LI.Scan.Active())
		GameTooltip:Hide()
	end)
	main:HookScript("OnShow", ScanUI.Refresh)
	main:HookScript("OnHide", ScanUI.Refresh)
	PaintStrip()
	return strip
end

local function SaveBadge()
	if not badge then
		return
	end
	local point, _, relPoint, x, y = badge:GetPoint(1)
	LI.settings.scanBadge = { point = point, rel = relPoint, x = x, y = y }
end

local function Badge()
	if badge then
		return badge
	end
	badge = CreateFrame("Button", "LinkedInnScanBadge", UIParent)
	badge:SetSize(230, 30)
	badge:SetFrameStrata("MEDIUM")
	badge:SetClampedToScreen(true)
	local pos = LI.settings.scanBadge
	if type(pos) == "table" and pos.point then
		badge:SetPoint(pos.point, UIParent, pos.rel or pos.point, pos.x or 0, pos.y or 0)
	else
		badge:SetPoint("TOP", UIParent, "TOP", 0, -110)
	end
	badge:SetMovable(true)
	badge:EnableMouse(true)
	badge:RegisterForDrag("LeftButton")
	badge:RegisterForClicks("LeftButtonUp")
	badge:SetScript("OnDragStart", badge.StartMoving)
	badge:SetScript("OnDragStop", function(self)
		self:StopMovingOrSizing()
		SaveBadge()
	end)
	if LI.Theme.Backdrop(badge) then
		badge:SetBackdrop({
			bgFile = "Interface\\Tooltips\\UI-Tooltip-Background",
			edgeFile = "Interface\\Tooltips\\UI-Tooltip-Border",
			tile = true,
			tileSize = 16,
			edgeSize = 12,
			insets = { left = 3, right = 3, top = 3, bottom = 3 },
		})
		badge:SetBackdropColor(0.08, 0.2, 0.1, 0.92)
		badge:SetBackdropBorderColor(GREEN[1], GREEN[2], GREEN[3], 0.9)
	end
	badge.dot = Dot(badge, 14)
	badge.dot:SetPoint("LEFT", 9, 0)
	badge.text = badge:CreateFontString(nil, "OVERLAY", "GameFontNormalSmall")
	badge.text:SetPoint("LEFT", badge.dot, "RIGHT", 7, 0)
	badge.text:SetTextColor(GREEN[1], GREEN[2], GREEN[3])
	badge.close = CreateFrame("Button", nil, badge, "UIPanelCloseButton")
	badge.close:SetSize(22, 22)
	badge.close:SetPoint("RIGHT", -3, 0)
	badge.close:SetScript("OnClick", function()
		LI.Scan.Stop()
		Sound("IG_MAINMENU_OPTION_CHECKBOX_OFF")
	end)
	badge.close:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
		GameTooltip:SetText("Stop scanning", 1, 0.82, 0)
		GameTooltip:Show()
	end)
	badge.close:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	badge:SetScript("OnClick", function()
		if LI.UI and LI.UI.Open then
			LI.UI.Open()
		end
	end)
	badge:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
		GameTooltip:SetText("Linked Inn is scanning", 1, 0.82, 0)
		GameTooltip:AddLine((Detail()), 1, 1, 1, true)
		GameTooltip:AddLine("Click to open Linked Inn, drag to move.", 0.6, 0.6, 0.6)
		GameTooltip:Show()
	end)
	badge:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	badge:Hide()
	return badge
end

function ScanUI.Refresh()
	PaintStrip()
	local active = LI.Scan.Active()
	local main = LI.UI and LI.UI.Main and LI.UI.Main()
	local mainShown = main and main:IsShown()
	if active and not mainShown then
		local b = Badge()
		local found = LI.Scan.Found()
		b.text:SetText(string.format("Linked Inn scanning  ·  %d found  ·  %s", found, Clock(time() - (LI.Scan.Since() or time()))))
		b:SetWidth(math.max(200, (b.text:GetStringWidth() or 150) + 56))
		b:Show()
		SetPulsing(b.dot, true)
	elseif badge then
		SetPulsing(badge.dot, false)
		badge:Hide()
	end
	if active and not ticker then
		ticker = true
		local function Tick()
			if LI.Scan.Active() then
				ScanUI.Refresh()
				LI.After(1, Tick)
			else
				ticker = false
			end
		end
		LI.After(1, Tick)
	end
end

function ScanUI.Strip()
	return strip
end

LI.Listen("StatusChanged", ScanUI.Refresh)
