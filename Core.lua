local ADDON, LI = ...

LI.ADDON = ADDON
local function ReadVersion()
	local getMetadata = (C_AddOns and C_AddOns.GetAddOnMetadata) or GetAddOnMetadata
	local ok, version = pcall(getMetadata, ADDON, "Version")
	if not ok or type(version) ~= "string" or version == "" or version:find("@", 1, true) then
		return "dev"
	end
	return (version:gsub("^v", ""))
end
LI.VERSION = ReadVersion()
LI.TITLE = "Linked Inn"
LI.ICON = "Interface\\Icons\\INV_Drink_05"
LI.WEBSITE = "github.com/sanredz/Linked-Inn"

local function Report(err)
	local handler = geterrorhandler and geterrorhandler()
	if handler then
		handler(err)
	end
end

function LI.SafeCall(fn, ...)
	local ok, err = pcall(fn, ...)
	if not ok then
		Report(err)
	end
	return ok
end

local eventFrame = CreateFrame("Frame")
local eventHandlers = {}

function LI.On(event, fn)
	local list = eventHandlers[event]
	if not list then
		if not pcall(eventFrame.RegisterEvent, eventFrame, event) then
			return false
		end
		list = {}
		eventHandlers[event] = list
	end
	table.insert(list, fn)
	return true
end

eventFrame:SetScript("OnEvent", function(_, event, ...)
	local list = eventHandlers[event]
	if not list then
		return
	end
	for i = 1, #list do
		LI.SafeCall(list[i], ...)
	end
end)

local callbacks = {}

function LI.Listen(name, fn)
	callbacks[name] = callbacks[name] or {}
	table.insert(callbacks[name], fn)
end

function LI.Fire(name, ...)
	local list = callbacks[name]
	if not list then
		return
	end
	for i = 1, #list do
		LI.SafeCall(list[i], ...)
	end
end

function LI.After(seconds, fn)
	if C_Timer and C_Timer.After then
		C_Timer.After(seconds, function()
			LI.SafeCall(fn)
		end)
	end
end

function LI.Every(seconds, fn)
	if C_Timer and C_Timer.NewTicker then
		return C_Timer.NewTicker(seconds, function()
			LI.SafeCall(fn)
		end)
	end
end

function LI.IsSecret(v)
	if not issecretvalue then
		return false
	end
	local ok, secret = pcall(issecretvalue, v)
	return ok and secret == true
end

function LI.Safe(v)
	if LI.IsSecret(v) then
		return nil
	end
	return v
end

local function OnlyIfOk(ok, ...)
	if not ok then
		return nil
	end
	return ...
end

function LI.Try(fn, ...)
	if type(fn) ~= "function" then
		return nil
	end
	return OnlyIfOk(pcall(fn, ...))
end

function LI.RealmName()
	local realm = GetNormalizedRealmName and LI.Safe(GetNormalizedRealmName())
	if not realm or realm == "" then
		realm = (LI.Safe(GetRealmName()) or ""):gsub("[%s%-]", "")
	end
	return realm
end

local surnames

function LI.Surnames()
	if surnames then
		return true
	end
	if RegionalUniqueNamesEnabled and LI.Safe(LI.Try(RegionalUniqueNamesEnabled)) then
		surnames = true
		return true
	end
	local _, second = LI.Try(UnitName, "player")
	second = LI.Safe(second)
	surnames = type(second) == "string" and second ~= "" or nil
	return surnames == true
end

local function SurnameSeparator()
	local consts = Constants and Constants.CharacterNameSeparatorConsts
	local sep = consts and consts.CHARACTERNAME_SURNAME_SEPARATOR
	return type(sep) == "string" and sep ~= "" and sep or " "
end

LI.realmOf = {}

function LI.FullName(name)
	if type(name) ~= "string" or name == "" then
		return nil
	end
	local base, realm = name:match("^(.+)%-([^%-]+)$")
	if not base then
		return name .. "-" .. LI.RealmName()
	end
	local mine = LI.RealmName()
	if realm ~= mine and mine ~= "" and base:find(SurnameSeparator(), 1, true) and LI.Surnames() then
		local key = base .. "-" .. mine
		LI.realmOf[key] = realm
		return key
	end
	return name
end

function LI.UnitKey(unit)
	local name, second = LI.Try(UnitName, unit)
	name, second = LI.Safe(name), LI.Safe(second)
	if type(name) ~= "string" or name == "" then
		return nil
	end
	if type(second) == "string" and second ~= "" then
		local sep = SurnameSeparator()
		if LI.Surnames() and not name:find(sep, 1, true) then
			name = name .. sep .. second
		else
			name = name .. "-" .. second
		end
	end
	return LI.FullName(name)
end

function LI.PlayerKey()
	return LI.UnitKey("player")
end

function LI.ShortName(fullName)
	if type(fullName) ~= "string" then
		return "?"
	end
	local realm = "-" .. LI.RealmName()
	if fullName:sub(-#realm) == realm then
		return fullName:sub(1, -#realm - 1)
	end
	return fullName
end
LI.WhisperTarget = LI.ShortName

function LI.Whisper(key, text)
	local target = LI.WhisperTarget(key)
	if not target then
		return false
	end
	local util = ChatFrameUtil
	text = text or ""
	if text ~= "" and util and util.SendTellWithMessage then
		if pcall(util.SendTellWithMessage, target, text) then
			return true
		end
	end
	if util and util.SendTell then
		LI.Try(util.SendTell, target)
	elseif ChatFrame_SendTell then
		LI.Try(ChatFrame_SendTell, target)
	else
		return false
	end
	if text ~= "" then
		local box = util and util.GetActiveWindow and LI.Try(util.GetActiveWindow)
		box = box or (ChatEdit_GetActiveWindow and LI.Try(ChatEdit_GetActiveWindow))
		if box and box.Insert then
			box:Insert(text)
		end
	end
	return true
end

local myServer

function LI.OtherServer(guid)
	local server = type(guid) == "string" and guid:match("^Player%-(%d+)%-")
	if not server then
		return false
	end
	if not myServer then
		local mine = LI.Safe(LI.Try(UnitGUID, "player"))
		myServer = type(mine) == "string" and mine:match("^Player%-(%d+)%-") or nil
	end
	return myServer ~= nil and server ~= myServer
end

LI.COLOR = {
	GOLD = { 1.00, 0.82, 0.00 },
	GREEN = { 0.30, 0.92, 0.40 },
	RED = { 1.00, 0.35, 0.35 },
	GRAY = { 0.60, 0.60, 0.60 },
	WHITE = { 1.00, 1.00, 1.00 },
	TAN = { 0.90, 0.78, 0.55 },
}

function LI.Hex(color)
	local function Channel(v)
		return math.floor(v * 255 + 0.5)
	end
	return string.format("ff%02x%02x%02x", Channel(color[1]), Channel(color[2]), Channel(color[3]))
end

function LI.Colorize(text, color)
	return "|c" .. LI.Hex(color) .. tostring(text) .. "|r"
end

function LI.Duration(seconds)
	seconds = math.max(0, math.floor(tonumber(seconds) or 0))
	local d = math.floor(seconds / 86400)
	local h = math.floor(seconds % 86400 / 3600)
	local m = math.floor(seconds % 3600 / 60)
	if d > 0 then
		return string.format("%dd %dh", d, h)
	elseif h > 0 then
		return string.format("%dh %dm", h, m)
	elseif m > 0 then
		return string.format("%dm", m)
	end
	return string.format("%ds", seconds)
end

function LI.Ago(timestamp)
	if not timestamp then
		return "never"
	end
	local seconds = time() - timestamp
	if seconds < 60 then
		return "just now"
	end
	return LI.Duration(seconds) .. " ago"
end

function LI.ShortAgo(timestamp)
	if not timestamp then
		return "?"
	end
	local seconds = math.max(0, time() - timestamp)
	if seconds < 60 then
		return "now"
	elseif seconds < 3600 then
		return math.floor(seconds / 60) .. "m"
	elseif seconds < 86400 then
		return math.floor(seconds / 3600) .. "h"
	elseif seconds < 14 * 86400 then
		return math.floor(seconds / 86400) .. "d"
	end
	return math.floor(seconds / (7 * 86400)) .. "w"
end

function LI.Date(timestamp)
	return date("%Y-%m-%d", timestamp or time())
end

function LI.Print(msg)
	if DEFAULT_CHAT_FRAME then
		DEFAULT_CHAT_FRAME:AddMessage(LI.Colorize(LI.TITLE .. ":", LI.COLOR.GOLD) .. " " .. tostring(msg))
	end
end

function LI.Copy(value)
	if type(value) ~= "table" then
		return value
	end
	local out = {}
	for k, v in pairs(value) do
		out[k] = LI.Copy(v)
	end
	return out
end

function LI.Trim(text)
	return ((tostring(text or "")):gsub("^%s+", ""):gsub("%s+$", ""))
end

function LI.ClassColor(classFile)
	if type(classFile) ~= "string" then
		return nil
	end
	local color = C_ClassColor and LI.Try(C_ClassColor.GetClassColor, classFile)
	if color and color.r then
		return { color.r, color.g, color.b }
	end
	local raid = RAID_CLASS_COLORS and RAID_CLASS_COLORS[classFile]
	if raid then
		return { raid.r, raid.g, raid.b }
	end
	return nil
end
