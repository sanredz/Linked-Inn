local ADDON, LI = ...

local Broker = {}
LI.Broker = Broker

local NAME = "Linked Inn"
local object
local pending = false

local function Listed()
	local n = 0
	for key, c in pairs(LI.crafters or {}) do
		if key ~= LI.playerKey and LI.IsListed(c) then
			n = n + 1
		end
	end
	return n
end

local function Text()
	if LI.Scan and LI.Scan.Active() then
		return string.format("Scanning · %d", LI.Scan.Found())
	end
	local n = Listed()
	return n == 1 and "1 crafter" or string.format("%d crafters", n)
end

function Broker.Update()
	if not object then
		return
	end
	object.text = Text()
end

local function Later()
	if pending or not object then
		return
	end
	pending = true
	LI.After(1, function()
		pending = false
		Broker.Update()
	end)
end

local function OnClick(_, button)
	if not LI.ready then
		return
	end
	if button == "RightButton" then
		if LI.Settings then
			LI.Settings.Toggle()
		end
	elseif button == "LeftButton" and IsShiftKeyDown and IsShiftKeyDown() and LI.Scan and LI.Scan.Needed() then
		LI.Scan.Toggle()
	elseif LI.UI then
		LI.UI.Toggle()
	end
end

local function OnTooltipShow(tip)
	if not tip or not tip.AddLine then
		return
	end
	tip:AddLine(NAME, 1, 0.82, 0)
	tip:AddLine(Text(), 1, 1, 1)
	tip:AddLine(" ")
	tip:AddLine("Click to open Linked Inn", 0.6, 0.6, 0.6)
	tip:AddLine("Right-click for settings", 0.6, 0.6, 0.6)
	if LI.Scan and LI.Scan.Needed() then
		tip:AddLine(LI.Scan.Active() and "Shift-click to stop scanning" or "Shift-click to start scanning", 0.6, 0.6, 0.6)
	end
end

function Broker.Register()
	if object then
		return object
	end
	local lib = LibStub and LibStub("LibDataBroker-1.1", true)
	if not lib or type(lib.NewDataObject) ~= "function" then
		return nil
	end
	object = lib:NewDataObject(NAME, {
		type = "data source",
		label = NAME,
		text = Text(),
		icon = LI.ICON,
		OnClick = OnClick,
		OnTooltipShow = OnTooltipShow,
	})
	return object
end

LI.Listen("Ready", Broker.Register)
LI.On("ADDON_LOADED", function()
	if LI.ready and not object then
		Broker.Register()
	end
end)
LI.Listen("CraftersChanged", Later)
LI.Listen("StatusChanged", Later)
