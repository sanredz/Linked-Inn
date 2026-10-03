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
		local total, online = 0, 0
		for key in pairs(LI.crafters) do
			total = total + 1
			if LI.Status(key) == "online" then
				online = online + 1
			end
		end
		GameTooltip:AddDoubleLine("Crafters remembered", tostring(total), 0.7, 0.7, 0.7, 1, 1, 1)
		GameTooltip:AddDoubleLine("Online now", tostring(online), 0.7, 0.7, 0.7, 1, 1, 1)
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
