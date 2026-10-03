local ADDON, LI = ...

local RECENT = 15 * 60
local ROSTER_EVERY = 90

local roster = {}
local offlineAt = {}

local function SetRoster(source, fullName, online)
	local key = LI.FullName(LI.Safe(fullName))
	if not key then
		return
	end
	local entry = roster[key] or {}
	roster[key] = entry
	entry[source] = online and true or false
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
	local entry = roster[key]
	if entry then
		if entry.group or entry.guild or entry.friend then
			return "online", seen
		end
		if entry.group == false or entry.guild == false or entry.friend == false then
			return "offline", seen
		end
	end
	if offlineAt[key] and (not seen or offlineAt[key] >= seen) then
		return "offline", seen
	end
	if seen and time() - seen <= RECENT then
		return "recent", seen
	end
	return "offline", seen
end

function LI.MarkSeen(key)
	local c = LI.crafters and LI.crafters[key]
	if c then
		c.seen = time()
		offlineAt[key] = nil
	end
end

local function NotFoundPattern()
	local fmt = ERR_CHAT_PLAYER_NOT_FOUND_S
	if type(fmt) ~= "string" then
		return nil
	end
	local escaped = fmt:gsub("([%(%)%.%%%+%-%*%?%[%]%^%$])", "%%%1")
	return "^" .. escaped:gsub("%%%%s", "(.+)") .. "$"
end

LI.On("CHAT_MSG_SYSTEM", function(msg)
	msg = LI.Safe(msg)
	if not LI.ready or type(msg) ~= "string" then
		return
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
end)

LI.NotFoundPattern = NotFoundPattern
