local ADDON, LI = ...

local RECENT = 15 * 60
local ROSTER_EVERY = 90

local CHECK_VALID = 10 * 60
local CHECK_TIMEOUT = 5

local SIGHT_QUIET = 60
local HEARD_ONLINE = 20 * 60

local roster = {}
local offlineAt = {}
local checked = {}
local heardAt = {}
local whoCheck
local probing = {}

local function SetRoster(source, fullName, online)
	local key = LI.FullName(LI.Safe(fullName))
	if not key then
		return
	end
	local entry = roster[key] or {}
	roster[key] = entry
	entry[source] = online and true or false
	if online then
		LI.MarkSeen(key)
	end
end

local function ReadGuild()
	for key, entry in pairs(roster) do
		entry.guild = nil
	end
	if not IsInGuild or not LI.Safe(LI.Try(IsInGuild)) then
		return
	end
	local count = LI.Safe(LI.Try(GetNumGuildMembers)) or 0
	for i = 1, count do
		local name, _, _, _, _, _, _, _, online = LI.Try(GetGuildRosterInfo, i)
		if name then
			SetRoster("guild", name, LI.Safe(online))
		end
	end
	LI.Fire("StatusChanged")
end

local function ReadFriends()
	for key, entry in pairs(roster) do
		entry.friend = nil
	end
	local list = C_FriendList
	if not list then
		return
	end
	local count = LI.Safe(LI.Try(list.GetNumFriends)) or 0
	for i = 1, count do
		local info = LI.Try(list.GetFriendInfoByIndex, i)
		if type(info) == "table" and info.name then
			SetRoster("friend", info.name, LI.Safe(info.connected))
		end
	end
	LI.Fire("StatusChanged")
end

local function ReadGroup()
	for key, entry in pairs(roster) do
		entry.group = nil
	end
	local count = LI.Safe(LI.Try(GetNumGroupMembers)) or 0
	local prefix = (IsInRaid and LI.Safe(LI.Try(IsInRaid))) and "raid" or "party"
	for i = 1, count do
		local unit = prefix .. i
		local key = LI.UnitKey(unit)
		if key then
			local entry = roster[key] or {}
			roster[key] = entry
			entry.group = LI.Safe(LI.Try(UnitIsConnected, unit)) ~= false
			if entry.group then
				LI.MarkSeen(key)
			end
		end
	end
	LI.Fire("StatusChanged")
end

function LI.Status(key)
	local c = LI.crafters and LI.crafters[key]
	local seen = c and c.seen or nil
	if key == LI.playerKey then
		return "online", time()
	end
	local who = checked[key]
	local heard = heardAt[key]
	if heard and time() - heard <= HEARD_ONLINE then
		local gone = (who and not who.online and who.at >= heard) or (offlineAt[key] and offlineAt[key] >= heard)
		if not gone then
			return "online", seen
		end
	end
	local entry = roster[key]
	if entry then
		if entry.group or entry.guild or entry.friend then
			return "online", seen
		end
		if entry.group == false or entry.guild == false or entry.friend == false then
			return "offline", seen, true
		end
	end
	if who and time() - who.at <= CHECK_VALID then
		if who.online then
			return "online", seen
		end
		if not seen or seen <= who.at then
			return "offline", seen, true
		end
	end
	if offlineAt[key] and (not seen or offlineAt[key] >= seen) then
		return "offline", seen, true
	end
	if seen and time() - seen <= RECENT then
		return "recent", seen
	end
	return "offline", seen
end

function LI.MarkSeen(key, where)
	local c = LI.crafters and LI.crafters[key]
	if not c then
		return false
	end
	local fresh = offlineAt[key] ~= nil or time() - (c.seen or 0) >= SIGHT_QUIET
	c.seen = time()
	if where then
		c.where = where
	end
	offlineAt[key] = nil
	return fresh
end

function LI.NoteHeard(key)
	if not key then
		return
	end
	local fresh = not heardAt[key] or time() - heardAt[key] >= SIGHT_QUIET
	heardAt[key] = time()
	LI.MarkSeen(key)
	if fresh then
		LI.Fire("StatusChanged")
	end
end

function LI.Heard(key)
	return heardAt[key] ~= nil and time() - heardAt[key] <= HEARD_ONLINE
end

local function Sighted(unit)
	if not LI.ready or not unit then
		return
	end
	if not LI.Safe(LI.Try(UnitIsPlayer, unit)) then
		return
	end
	local key = LI.UnitKey(unit)
	if key then
		LI.NoteGuid(key, LI.Safe(LI.Try(UnitGUID, unit)))
	end
	if not key or key == LI.playerKey or not LI.crafters[key] then
		return
	end
	local zone = GetRealZoneText and LI.Safe(LI.Try(GetRealZoneText))
	if LI.MarkSeen(key, type(zone) == "string" and zone ~= "" and zone or nil) then
		LI.Fire("StatusChanged")
	end
end

LI.On("UPDATE_MOUSEOVER_UNIT", function()
	Sighted("mouseover")
end)
LI.On("PLAYER_TARGET_CHANGED", function()
	Sighted("target")
end)
LI.On("NAME_PLATE_UNIT_ADDED", function(unit)
	Sighted(LI.Safe(unit))
end)

local function NotFoundPattern()
	local fmt = ERR_CHAT_PLAYER_NOT_FOUND_S
	if type(fmt) ~= "string" then
		return nil
	end
	local escaped = fmt:gsub("([%(%)%.%%%+%-%*%?%[%]%^%$])", "%%%1")
	return "^" .. escaped:gsub("%%%%s", "(.+)") .. "$"
end

local function SameName(a, b)
	return type(a) == "string" and type(b) == "string" and LI.FullName(a):lower() == LI.FullName(b):lower()
end

local function ProbeLink(key)
	local c = LI.crafters and LI.crafters[key]
	local best
	for _, p in pairs(c and c.profs or {}) do
		if type(p.link) == "string" and (not best or (p.read or 0) > (best.read or 0)) then
			best = p
		end
	end
	return best and best.link
end

local function RecordCheck(key, found, area, quiet)
	local name = LI.ShortName(key)
	checked[key] = { online = found, at = time() }
	local c = LI.crafters and LI.crafters[key]
	if found then
		offlineAt[key] = nil
		if c then
			c.seen = time()
			if type(area) == "string" and area ~= "" then
				c.where = area
			end
		end
		if not quiet then
			LI.Print(LI.Colorize(name, LI.COLOR.GREEN) .. " is online" .. (type(area) == "string" and area ~= "" and (" in " .. area) or "") .. ".")
		end
	elseif not quiet then
		LI.Print(name .. " is offline.")
	end
	LI.Fire("StatusChanged")
end

local function FinishCheck(found, area)
	local job = whoCheck
	if not job then
		return
	end
	whoCheck = nil
	if found == nil then
		LI.Print("No answer from /who for " .. LI.ShortName(job.key) .. ". Try again in a moment.")
		return
	end
	RecordCheck(job.key, found, area)
end

function LI.ProbeResult(key, found)
	local probe = probing[key]
	if probe then
		probing[key] = nil
		RecordCheck(key, found, nil, probe.quiet)
	end
end

function LI.MarkOffline(key)
	if key and LI.crafters and LI.crafters[key] then
		offlineAt[key] = time()
		LI.Fire("StatusChanged")
	end
end


local function ReadWho()
	local job = whoCheck
	local list = C_FriendList
	if not job or not list then
		return
	end
	local count = LI.Safe(LI.Try(list.GetNumWhoResults))
	if type(count) ~= "number" then
		return
	end
	for i = 1, count do
		local info = LI.Try(list.GetWhoInfo, i)
		if type(info) == "table" and SameName(LI.Safe(info.fullName), job.key) then
			FinishCheck(true, LI.Safe(info.area))
			return
		end
	end
	FinishCheck(false)
end

function LI.CheckOnline(key)
	local list = C_FriendList
	if not key or not list or not list.SendWho then
		return false
	end
	if LI.IsChecking(key) then
		return false
	end
	local link = ProbeLink(key)
	if link and LI.Reader and LI.Reader.Probe(key, link) then
		probing[key] = { quiet = false, at = GetTime() }
		LI.Fire("StatusChanged")
		return true
	end
	if whoCheck then
		LI.Print("Still checking " .. LI.ShortName(whoCheck.key) .. ".")
		return false
	end
	local name = LI.ShortName(key)
	local query = name
	if C_NameUtil and C_NameUtil.ReplaceSurnameSeparatorWithLinkSeparator then
		query = LI.Safe(LI.Try(C_NameUtil.ReplaceSurnameSeparatorWithLinkSeparator, name)) or name
	end
	local tag = type(WHO_TAG_EXACT) == "string" and WHO_TAG_EXACT or "n-"
	local origin = Enum and Enum.SocialWhoOrigin and Enum.SocialWhoOrigin.Item
	local job = { key = key }
	whoCheck = job
	local ok = pcall(list.SendWho, tag .. query, origin)
	if not ok then
		whoCheck = nil
		LI.Print("Couldn't check " .. name .. " right now.")
		return false
	end
	LI.After(CHECK_TIMEOUT, function()
		if whoCheck == job then
			FinishCheck(nil)
			LI.Fire("StatusChanged")
		end
	end)
	return true
end

function LI.ProbeOnline(key)
	if not key or key == LI.playerKey or LI.IsChecking(key) then
		return false
	end
	local link = ProbeLink(key)
	if link and LI.Reader and LI.Reader.Probe(key, link) then
		probing[key] = { quiet = true, at = GetTime() }
		LI.Fire("StatusChanged")
		return true
	end
	return false
end

local CHECK_STUCK = 6
local CHECK_GIVEUP = 20

function LI.IsChecking(key)
	local probe = probing[key]
	if probe then
		local age = GetTime() - (probe.at or 0)
		local reader = LI.Reader
		local active = reader and (reader.Busy(key) or reader.Queued(key))
		if (age > CHECK_STUCK and not active) or age > CHECK_GIVEUP then
			probing[key] = nil
			probe = nil
			if reader and reader.Drop then
				reader.Drop(key)
			end
			LI.Log(string.format("No answer when checking %s", LI.ShortName(key)))
			LI.After(0, function()
				LI.Fire("StatusChanged")
			end)
		end
	end
	return probe ~= nil or (whoCheck ~= nil and whoCheck.key == key)
end

LI.On("CHAT_MSG_SYSTEM", function(msg)
	msg = LI.Safe(msg)
	if not LI.ready or type(msg) ~= "string" then
		return
	end
	if whoCheck then
		local name = LI.ShortName(whoCheck.key)
		if msg:find(name, 1, true) then
			FinishCheck(true, msg:match("%s%-%s([^%-]+)$"))
			return
		end
		local total = type(WHO_NUM_RESULTS) == "string" and WHO_NUM_RESULTS:match(";%s*(.-)$")
		local count = tonumber(msg:match("^(%d+)%s"))
		if count and total and total ~= "" and msg:find(total, 1, true) then
			if count == 0 then
				FinishCheck(false)
			else
				LI.After(0.2, ReadWho)
			end
			return
		end
	end
	local pattern = NotFoundPattern()
	local name = pattern and msg:match(pattern)
	if name then
		local key = LI.FullName(name)
		if key and LI.crafters[key] then
			offlineAt[key] = time()
			LI.Fire("StatusChanged")
		end
	end
end)

LI.On("WHO_LIST_UPDATE", function()
	LI.After(0.1, ReadWho)
end)

LI.On("GUILD_ROSTER_UPDATE", ReadGuild)
LI.On("FRIENDLIST_UPDATE", ReadFriends)
LI.On("GROUP_ROSTER_UPDATE", ReadGroup)

local function RequestRoster()
	if C_GuildInfo and C_GuildInfo.GuildRoster then
		LI.Try(C_GuildInfo.GuildRoster)
	elseif GuildRoster then
		LI.Try(GuildRoster)
	end
	if C_FriendList and C_FriendList.ShowFriends then
		LI.Try(C_FriendList.ShowFriends)
	end
end

LI.Listen("Ready", function()
	ReadGuild()
	ReadFriends()
	ReadGroup()
	LI.After(5, RequestRoster)
	LI.Every(ROSTER_EVERY, RequestRoster)
	LI.Every(1, function()
		for key in pairs(probing) do
			LI.IsChecking(key)
		end
	end)
end)

LI.NotFoundPattern = NotFoundPattern
