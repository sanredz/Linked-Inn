local ADDON, LI = ...

local Bridge = {}
LI.Bridge = Bridge

local FOREVER_PROJECT = 18
local FRIENDS_TTL = 60
local MAX_FRIENDS = 15
local MAX_HOPS = 3
local SHARE_EVERY = 20
local RESEND = 30 * 60
local CHANNEL_LINE = 250
local BNET_CHUNK = 1500
local MAX_CHUNKS = 40
local CHANNEL_MAX_CHUNKS = 12
local HOLD_MIN, HOLD_MAX = 2, 8
local BUFFER_TTL = 90
local MAX_BUFFERS = 30
local SEEN_TTL = 30 * 60

local friends, friendsAt = nil, nil
local sent = {}
local seen = {}
local onChannel = {}
local holds = {}
local buffers = {}

local function Now()
	return GetTime()
end

local function Stats()
	local sync = LI.test.sync
	sync.bridge = type(sync.bridge) == "table" and sync.bridge or { sent = 0, got = 0, forwarded = 0, cancelled = 0 }
	return sync.bridge
end

local function Active()
	return LI.ready and LI.settings and not LI.settings.guildOnly and LI.Sync ~= nil
end

local function FactionCode(faction)
	if faction == "Alliance" then
		return "A"
	elseif faction == "Horde" then
		return "H"
	end
	return nil
end

local function MyFaction()
	return FactionCode(LI.Safe(LI.Try(UnitFactionGroup, "player")))
end

local function RealmKey(realm)
	if type(realm) ~= "string" or realm == "" then
		return nil
	end
	return (realm:lower():gsub("[%s%-']", ""))
end

local function RealmBase(realm)
	local key = RealmKey(realm)
	return key and (key:gsub("%d+$", "")) or nil
end

function Bridge.IsForever(projectID)
	if projectID == nil or projectID == FOREVER_PROJECT then
		return true
	end
	return WOW_PROJECT_ID ~= nil and WOW_PROJECT_ID ~= 1 and projectID == WOW_PROJECT_ID
end

local function FromGame(game)
	if type(game) ~= "table" then
		return nil
	end
	local id = LI.Safe(game.gameAccountID)
	local name = LI.Safe(game.characterName)
	if not id or LI.Safe(game.isOnline) == false or LI.Safe(game.clientProgram) ~= "WoW" then
		return nil
	end
	if not Bridge.IsForever(LI.Safe(game.wowProjectID)) or LI.Safe(game.isInCurrentRegion) == false then
		return nil
	end
	if type(name) ~= "string" or not name:find("%S %S") then
		return nil
	end
	local key = LI.FullName(name)
	if not key or key == LI.playerKey then
		return nil
	end
	return { id = id, key = key, faction = FactionCode(LI.Safe(game.factionName)), realm = LI.Safe(game.realmName) }
end
Bridge.FromGame = FromGame

local function Usable(f)
	local mine = MyFaction()
	if f.faction and mine and f.faction ~= mine then
		return false
	end
	local base = RealmBase(f.realm)
	local myBase = RealmBase(LI.RealmName())
	if base and myBase and base ~= myBase then
		return false
	end
	return true
end

function Bridge.Friends()
	if friends and Now() - friendsAt < FRIENDS_TTL then
		return friends
	end
	local list = {}
	local count = BNGetNumFriends and LI.Safe(LI.Try(BNGetNumFriends)) or 0
	local api = C_BattleNet
	for i = 1, (type(count) == "number" and count or 0) do
		local accounts = api and api.GetFriendNumGameAccounts and LI.Safe(LI.Try(api.GetFriendNumGameAccounts, i)) or 0
		for j = 1, (type(accounts) == "number" and accounts or 0) do
			local f = FromGame(LI.Try(api.GetFriendGameAccountInfo, i, j))
			if f and Usable(f) then
				local myRealm = RealmKey(LI.RealmName())
				f.sameHalf = f.realm ~= nil and myRealm ~= nil and RealmKey(f.realm) == myRealm
				list[#list + 1] = f
			end
			if #list >= MAX_FRIENDS then
				break
			end
		end
		if #list >= MAX_FRIENDS then
			break
		end
	end
	friends, friendsAt = list, Now()
	return list
end

function Bridge.Forget()
	friends = nil
end

local function OtherHalfInGroup()
	local count = LI.Safe(LI.Try(GetNumGroupMembers)) or 0
	if count == 0 then
		return nil
	end
	local raid = IsInRaid and LI.Safe(LI.Try(IsInRaid))
	local prefix = raid and "raid" or "party"
	local mine = LI.Sync.MySid()
	for i = 1, count do
		local guid = LI.Safe(LI.Try(UnitGUID, prefix .. i))
		local sid = LI.Sync.SidOf(guid)
		if sid and mine and sid ~= mine then
			return raid and "RAID" or "PARTY"
		end
	end
	return nil
end

local function Lines(card, hops, limit)
	local name = LI.ShortName(card.origin)
	local head = string.format("C1|%s|%d|%s|%s|%s|", name, hops, card.faction, card.class or "", card.ver)
	local size = limit or math.max(20, CHANNEL_LINE - #head - 6)
	local total = math.max(1, math.ceil(#card.payload / size))
	if total > MAX_CHUNKS then
		return nil
	end
	local B36 = LI.Sync.B36
	local out = {}
	for i = 1, total do
		out[i] = head .. B36(i) .. "|" .. B36(total) .. "|" .. card.payload:sub((i - 1) * size + 1, i * size)
	end
	return out
end
Bridge.Lines = Lines

local function Send(card, hops, chatType, target)
	local lines = Lines(card, hops, chatType == "BNET" and BNET_CHUNK or nil)
	if not lines or (chatType == "CHANNEL" and #lines > CHANNEL_MAX_CHUNKS) then
		return false
	end
	for _, line in ipairs(lines) do
		LI.Sync.Enqueue("relay", line, chatType, target)
	end
	Stats().sent = Stats().sent + 1
	return true
end

local function Cards()
	local faction = MyFaction()
	if not faction then
		return {}
	end
	local out = {}
	local own = LI.Sync.OwnCard()
	if own then
		own.faction = faction
		own.hops = 1
		out[#out + 1] = own
	end
	for _, key in ipairs(LI.Sync.LivePeers()) do
		local cached = LI.Sync.Cached(key)
		local c = LI.crafters[key]
		if cached and c and c.li and c.sharedVer == cached.ver then
			out[#out + 1] = { origin = key, ver = cached.ver, payload = cached.payload, class = c.class, faction = faction, hops = 2 }
		end
	end
	return out
end

local function Due(target, card)
	local list = sent[target]
	local last = list and list[card.origin]
	return not last or last.ver ~= card.ver or Now() - last.at >= RESEND
end

local function Mark(target, card)
	sent[target] = sent[target] or {}
	sent[target][card.origin] = { ver = card.ver, at = Now() }
end

function Bridge.Share()
	if not Active() then
		return 0
	end
	local cards = Cards()
	if #cards == 0 then
		return 0
	end
	local count = 0
	for _, f in ipairs(Bridge.Friends()) do
		if not f.sameHalf then
			for _, card in ipairs(cards) do
				if card.origin ~= f.key and Due(f.key, card) and Send(card, card.hops, "BNET", f.id) then
					Mark(f.key, card)
					count = count + 1
				end
			end
		end
	end
	local route = OtherHalfInGroup()
	if route then
		for _, card in ipairs(cards) do
			if Due(route, card) and Send(card, card.hops, route) then
				Mark(route, card)
				count = count + 1
			end
		end
	end
	return count
end

local function Hold(card, hops)
	local id = card.origin:lower() .. "|" .. card.ver
	if holds[id] or hops > MAX_HOPS or not (LI.Sync.IsJoined and LI.Sync.IsJoined()) then
		return
	end
	holds[id] = true
	local started = Now()
	LI.After(HOLD_MIN + math.random() * (HOLD_MAX - HOLD_MIN), function()
		holds[id] = nil
		if (onChannel[id] or -1) >= started then
			Stats().cancelled = Stats().cancelled + 1
			return
		end
		if Active() and Send(card, hops, "CHANNEL") then
			Stats().forwarded = Stats().forwarded + 1
		end
	end)
end

local function Parse(text)
	local name, hops, faction, class, ver, i, n, chunk = text:match("^C1|([^|]+)|(%d+)|([AH])|(%u*)|(%w+)|(%w+)|(%w+)|([^|]*)$")
	if not name then
		return nil
	end
	local FromB36 = LI.Sync.FromB36
	i, n, hops = FromB36(i), FromB36(n), tonumber(hops)
	if not i or not n or not hops or not FromB36(ver) then
		return nil
	end
	if hops < 1 or hops > MAX_HOPS or n < 1 or n > MAX_CHUNKS or i < 1 or i > n or #chunk > BNET_CHUNK then
		return nil
	end
	return { name = name, hops = hops, faction = faction, class = class ~= "" and class or nil, ver = ver, i = i, n = n, chunk = chunk }
end
Bridge.Parse = Parse

local function Assemble(origin, card)
	local id = origin:lower() .. "|" .. card.ver .. "|" .. card.n
	local buf = buffers[id]
	if not buf then
		local count = 0
		for k, b in pairs(buffers) do
			if Now() - b.at > BUFFER_TTL then
				buffers[k] = nil
			else
				count = count + 1
			end
		end
		if count >= MAX_BUFFERS then
			return nil
		end
		buf = { parts = {}, got = 0 }
		buffers[id] = buf
	end
	buf.at = Now()
	if not buf.parts[card.i] then
		buf.parts[card.i] = card.chunk
		buf.got = buf.got + 1
	end
	if buf.got < card.n then
		return nil
	end
	buffers[id] = nil
	return table.concat(buf.parts)
end

function Bridge.OnCard(from, text, transport)
	if not Active() or type(text) ~= "string" then
		return
	end
	local card = Parse(text)
	if not card or card.faction ~= MyFaction() then
		return
	end
	local origin = LI.FullName(card.name)
	if not origin or origin == LI.playerKey or not LI.Allowed(origin) then
		return
	end
	local id = origin:lower() .. "|" .. card.ver
	if transport == "CHANNEL" then
		onChannel[id] = Now()
	end
	local c = LI.crafters[origin]
	if seen[id] or (c and c.sharedVer == card.ver) then
		seen[id] = seen[id] or Now()
		return
	end
	local payload = Assemble(origin, card)
	if not payload then
		return
	end
	seen[id] = Now()
	local via = transport == "BNET" and "a Battle.net friend" or transport == "CHANNEL" and "another Linked Inn user" or "your group"
	if not LI.Sync.ApplyCard(origin, card.ver, payload, card.class, via) then
		return
	end
	Stats().got = Stats().got + 1
	if transport ~= "CHANNEL" then
		Hold({ origin = origin, ver = card.ver, payload = payload, class = card.class, faction = card.faction }, card.hops + 1)
	end
end

function Bridge.OnBNet(prefix, text, senderID)
	if prefix ~= LI.Sync.PREFIX or type(text) ~= "string" or not Active() then
		return
	end
	local info = C_BattleNet and C_BattleNet.GetGameAccountInfoByID and LI.Try(C_BattleNet.GetGameAccountInfoByID, senderID)
	local f = FromGame(info)
	if not f or not Usable(f) or not LI.Sync.Allow(f.key) then
		return
	end
	local sync = LI.test.sync
	sync.rx = type(sync.rx) == "table" and sync.rx or {}
	sync.rx.BNET = (sync.rx.BNET or 0) + 1
	if text:sub(1, 3) == "C1|" then
		Bridge.OnCard(f.key, text, "BNET")
	end
end

function Bridge.Status()
	local s = Stats()
	local all, other = 0, 0
	for _, f in ipairs(Bridge.Friends()) do
		all = all + 1
		if not f.sameHalf then
			other = other + 1
		end
	end
	return string.format("Bridge: %d Battle.net friends in Forever (%d on the other half); %d cards sent, %d received, %d passed on, %d not needed", all, other, s.sent, s.got, s.forwarded, s.cancelled)
end

local function Clean()
	local now = Now()
	for id, at in pairs(seen) do
		if now - at > SEEN_TTL then
			seen[id] = nil
		end
	end
	for id, at in pairs(onChannel) do
		if now - at > SEEN_TTL then
			onChannel[id] = nil
		end
	end
end

LI.On("BN_CHAT_MSG_ADDON", function(prefix, text, _, senderID)
	Bridge.OnBNet(LI.Safe(prefix), LI.Safe(text), LI.Safe(senderID))
end)

LI.On("BN_FRIEND_INFO_CHANGED", function()
	friends = nil
end)

LI.On("GROUP_ROSTER_UPDATE", function()
	if LI.ready then
		LI.After(3, Bridge.Share)
	end
end)

LI.Listen("Ready", function()
	Stats()
	LI.Every(SHARE_EVERY, function()
		Bridge.Share()
		Clean()
	end)
end)
