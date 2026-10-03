local ADDON, LI = ...

local button

local function Radius()
	local width = Minimap and Minimap:GetWidth() or 140
	return width / 2 + 5
end

local function Place()
	local angle = math.rad(LI.settings.minimap.angle or 200)
	local r = Radius()
	button:ClearAllPoints()
	button:SetPoint("CENTER", Minimap, "CENTER", math.cos(angle) * r, math.sin(angle) * r)
end

local function DragUpdate()
	local mx, my = Minimap:GetCenter()
	local scale = Minimap:GetEffectiveScale()
	local cx, cy = GetCursorPosition()
	cx, cy = cx / scale, cy / scale
	LI.settings.minimap.angle = math.floor(math.deg(math.atan2(cy - my, cx - mx)) % 360)
	Place()
end

local function ShowTooltip(self)
	GameTooltip:SetOwner(self, "ANCHOR_LEFT")
	GameTooltip:SetText(LI.TITLE, 1, 0.82, 0)
	if LI.ready then
		local total = 0
		for key in pairs(LI.crafters) do
			if key ~= LI.playerKey then
				total = total + 1
			end
		end
		GameTooltip:AddDoubleLine("Crafters remembered", tostring(total), 0.7, 0.7, 0.7, 1, 1, 1)
		local unseen = LI.Work.UnseenCount()
		if unseen > 0 then
			GameTooltip:AddLine(" ")
			GameTooltip:AddLine(string.format("%d new %s you can make", unseen, unseen == 1 and "request" or "requests"), 0.35, 0.95, 0.45)
		end
	end
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine("Click: open   Right-click: test   Drag: move", 0.5, 0.5, 0.5)
	GameTooltip:Show()
end

local function Create()
	if button or not Minimap then
		return
	end
	button = CreateFrame("Button", "LinkedInnMinimapButton", Minimap)
	button:SetSize(31, 31)
	button:SetFrameStrata("MEDIUM")
	button:SetFrameLevel(Minimap:GetFrameLevel() + 8)
	button:SetHighlightTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight")
	button:RegisterForClicks("LeftButtonUp", "RightButtonUp")
	button:RegisterForDrag("LeftButton")

	local background = button:CreateTexture(nil, "BACKGROUND")
	background:SetSize(20, 20)
	background:SetTexture("Interface\\Minimap\\UI-Minimap-Background")
	background:SetPoint("TOPLEFT", 7, -5)

	local icon = button:CreateTexture(nil, "ARTWORK")
	icon:SetSize(18, 18)
	icon:SetTexture(LI.ICON)
	icon:SetTexCoord(0.05, 0.95, 0.05, 0.95)
	icon:SetPoint("TOPLEFT", 7, -6)

	local glow = button:CreateTexture(nil, "OVERLAY", nil, 2)
	glow:SetTexture("Interface\\Minimap\\UI-Minimap-ZoomButton-Highlight")
	glow:SetBlendMode("ADD")
	glow:SetVertexColor(0.4, 1, 0.5)
	glow:SetSize(36, 36)
	glow:SetPoint("CENTER", icon, "CENTER")
	glow:Hide()
	button.glow = glow
	button.pulse = glow:CreateAnimationGroup()
	if button.pulse then
		local fade = button.pulse:CreateAnimation("Alpha")
		if fade then
			fade:SetFromAlpha(0.2)
			fade:SetToAlpha(1)
			fade:SetDuration(0.7)
		end
		button.pulse:SetLooping("BOUNCE")
	end

	local border = button:CreateTexture(nil, "OVERLAY")
	border:SetSize(50, 50)
	border:SetTexture("Interface\\Minimap\\MiniMap-TrackingBorder")
	border:SetPoint("TOPLEFT")

	button:SetScript("OnMouseDown", function()
		icon:SetPoint("TOPLEFT", 8, -7)
	end)
	button:SetScript("OnMouseUp", function()
		icon:SetPoint("TOPLEFT", 7, -6)
	end)
	button:SetScript("OnClick", function(_, mouseButton)
		if mouseButton == "RightButton" then
			LI.UI.Open(LI.UI.TAB.test)
		elseif LI.Work.UnseenCount() > 0 then
			LI.WorkUI.SetView("foryou")
			LI.UI.Open(LI.UI.TAB.work)
		else
			LI.UI.Toggle()
		end
	end)
	button:SetScript("OnDragStart", function(self)
		self:LockHighlight()
		self:SetScript("OnUpdate", DragUpdate)
		GameTooltip:Hide()
	end)
	button:SetScript("OnDragStop", function(self)
		self:SetScript("OnUpdate", nil)
		self:UnlockHighlight()
		icon:SetPoint("TOPLEFT", 7, -6)
	end)
	button:SetScript("OnEnter", ShowTooltip)
	button:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)

	Place()
end

LI.Listen("Ready", Create)

LI.Listen("WorkGlow", function(on)
	if not button or not button.glow then
		return
	end
	button.glow:SetShown(on and true or false)
	if button.pulse then
		if on then
			button.pulse:Play()
		else
			button.pulse:Stop()
		end
	end
end)
