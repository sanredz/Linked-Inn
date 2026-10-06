local ADDON, LI = ...

local Sync = {}
LI.Sync = Sync
Sync.session = { sent = 0, failed = 0, throttled = 0 }

local PREFIX = "LinkedInn"
local CHANNEL = "LinkedInnSync"
local JOIN_DELAY = 1
local JOIN_DEFER = 2
local JOIN_DEFER_MAX = 15
local JOIN_WAIT = 15
local JOIN_RETRY = 30
local FIRST_HELLO = 1
local SECOND_HELLO = 15
local HELLO_EVERY = 12 * 60
local HELLO_JITTER = 3 * 60
local CHANGE_HELLO = 10
local CHANGE_GAP = 120
local TICK_EVERY = 1
local SEND_GAP = 0.2
local CHANNEL_GAP = 1
local BYTES_PER_SEC = 1000
local BYTES_BURST = 2000
local THROTTLE_PAUSE = 1
local ANSWER_WAIT = 1
local ANSWER_GAP = 5
local ASK_GAP = 120
local ASK_MAX = 30
local BROADCAST_ASKERS = 3
local CHUNK = 200
local MAX_CHUNKS = 40
local MAX_PROFS = 8
local MAX_IDS = 1500
local RATE_WINDOW = 60
local RATE_MAX = 60
local BUFFER_TTL = 90
local MAX_BUFFERS = 20
local LINK_LIVE = 20 * 60
local SEEN_TTL = 10 * 60
local DISCOVER_AGAIN = 24 * 3600
local LINK_HELLO_GAP = 60
local WHISPER_MEMORY = 15
local RELAY = { H1 = true, R1 = true, X1 = true }
local SHARED = { GUILD = true, PARTY = true, RAID = true }
local SEND_RANK = { ask = 1, hello = 1, ping = 1, pong = 1, work = 2, data = 3, relay = 3, discover = 4 }

local queue = {}
local channelName
local joined = false
local nextHello
local GREET_GAP = 20
local REPLY_GAP = 5
local sessionHeard = {}
local lastGreet = -GREET_GAP
local lastChangeHello = 0
local answerAt
local lastAnswer = 0
local asked = {}
local buffers = {}
local rates = {}
local peers = {}
local seenMsgs = {}
local whispered = {}
local firstFrom = {}
local linkSig = ""
local lastLinkHello = -LINK_HELLO_GAP
local mySid

local function Now()
	return GetTime()
end

local function B36(n)
	n = math.floor(tonumber(n) or 0)
	if n <= 0 then
		return "0"
	end
	local digits = "0123456789abcdefghijklmnopqrstuvwxyz"
	local out = ""
	while n > 0 do
		local d = n % 36
		out = digits:sub(d + 1, d + 1) .. out
		n = math.floor(n / 36)
	end
	return out
end
Sync.B36 = B36

local function FromB36(s)
	if type(s) ~= "string" or s == "" or s:find("[^0-9a-z]") or #s > 8 then
		return nil
	end
	return tonumber(s, 36)
end
Sync.FromB36 = FromB36

local function Split(text, sep)
	local out = {}
	for part in (text .. sep):gmatch("(.-)" .. sep:gsub("%p", "%%%0")) do
		out[#out + 1] = part
	end
	return out
end

local function Clean(text)
	return (tostring(text or ""):gsub("[|~;%.]", ""))
end

function Sync.Encode(profs)
	local keys = {}
	for key in pairs(profs) do
		if not LI.GATHERING[key] then
			keys[#keys + 1] = key
		end
	end
	table.sort(keys)
	local parts = {}
	for _, key in ipairs(keys) do
		local p = profs[key]
		local ids = {}
		for _, id in ipairs(LI.RecipeList(p, key)) do
			ids[#ids + 1] = id
		end
		table.sort(ids)
		local coded, last = {}, 0
		for _, id in ipairs(ids) do
			coded[#coded + 1] = B36(id - last)
			last = id
		end
		local link = type(p.link) == "string" and p.link:match("^trade:(.+)$") or ""
		parts[#parts + 1] = table.concat({
			Clean(key),
			B36(p.rank or 0),
			B36(p.max or 0),
			Clean(link):gsub("[^%w:%-]", ""),
			p.recipes and table.concat(coded, ".") or "-",
		}, "~")
	end
	return table.concat(parts, ";")
end

function Sync.Decode(text)
	if type(text) ~= "string" or text == "" then
		return nil
	end
	local out, count = {}, 0
	for _, section in ipairs(Split(text, ";")) do
		count = count + 1
		if count > MAX_PROFS then
			return nil
		end
		local f = Split(section, "~")
		if #f ~= 5 or f[1] == "" or f[1]:find("[^%a ]") or LI.GATHERING[f[1]] then
			return nil
		end
		local prof = { key = f[1], rank = FromB36(f[2]) or 0, max = FromB36(f[3]) or 0 }
		if f[4] ~= "" then
			if not f[4]:match("^Player%-[%w%-]+:%d+:%d+$") then
				return nil
			end
			prof.link = "trade:" .. f[4]
		end
		if f[5] ~= "-" then
			local ids, last = {}, 0
			if f[5] ~= "" then
				for _, code in ipairs(Split(f[5], ".")) do
					local d = FromB36(code)
					if not d or d <= 0 then
						return nil
					end
					last = last + d
					ids[#ids + 1] = last
					if #ids > MAX_IDS or last > 2147483647 then
						return nil
					end
				end
			end
			prof.ids = ids
		end
		out[#out + 1] = prof
	end
	return out
end

local function ChannelId()
	if not channelName or not GetChannelName then
		return nil
	end
	local id = LI.Safe(LI.Try(GetChannelName, channelName))
	if type(id) == "number" and id > 0 then
		return id
	end
	return nil
end

local function Paused()
	if InCombatLockdown and InCombatLockdown() then
		return true
	end
	if IsInInstance and LI.Safe(LI.Try(IsInInstance)) then
		return true
	end
	if C_ChatInfo and C_ChatInfo.InChatMessagingLockdown and LI.Safe(LI.Try(C_ChatInfo.InChatMessagingLockdown)) then
		return true
	end
	return false
end

local function SidOf(guid)
	return type(guid) == "string" and guid:match("^Player%-(%d+)%-") or nil
end
Sync.SidOf = SidOf

local function MySid()
	if not mySid then
		mySid = SidOf(LI.Safe(LI.Try(UnitGUID, "player")))
	end
	return mySid
end

local function MyRealm()
	return LI.RealmName()
end

local function Live(p)
	return p ~= nil and p.at ~= nil and Now() - p.at <= LINK_LIVE
end

local function Touch(key)
	local p = peers[key]
	if p then
		p.at = Now()
	end
end

local function NotePeer(key, realm, sid, links)
	local p = peers[key] or {}
	peers[key] = p
	p.at = Now()
	if type(realm) == "string" and realm:match("^%w+$") then
		p.realm = realm
		if realm ~= MyRealm() then
			LI.realmOf[key] = realm
		end
	end
	if type(sid) == "string" and sid:match("^%d+$") then
		p.sid = sid
	end
	if links then
		p.links = links
	end
	return p
end

function Sync.RealmOf(key)
	local p = peers[key]
	return (p and p.realm) or LI.realmOf[key] or (key and key:match("%-([^%-]+)$"))
end

function Sync.Links()
	local out = {}
	if LI.RETAIL then
		return out
	end
	local mine = MyRealm()
	for key, p in pairs(peers) do
		if Live(p) and p.realm and p.realm ~= mine then
			local best = out[p.realm]
			if not best or peers[best].at < p.at then
				out[p.realm] = key
			end
		end
	end
	return out
end

function Sync.Elected(realm)
	local me = LI.playerKey or ""
	local mine = MyRealm()
	for key, p in pairs(peers) do
		if key < me and Live(p) and p.realm == mine and p.links and p.links[realm] then
			return false, key
		end
	end
	return true
end

local function Enqueue(kind, message, chatType, target)
	if LI.settings.guildOnly and (chatType == "CHANNEL" or (chatType == "WHISPER" and not LI.Allowed(LI.FullName(target)))) then
		return
	end
	for _, q in ipairs(queue) do
		if q.kind == kind and q.message == message and q.chatType == chatType and q.target == target then
			return
		end
	end
	local item = { kind = kind, message = message, chatType = chatType, target = target, rank = SEND_RANK[kind] or 2 }
	local at = #queue + 1
	for i, q in ipairs(queue) do
		if (q.rank or 2) > item.rank then
			at = i
			break
		end
	end
	table.insert(queue, at, item)
end

local lastFailLog = -60
Sync.Enqueue = Enqueue
Sync.PREFIX = PREFIX

local function Count(field, chatType)
	local sync = LI.test.sync
	sync[field] = type(sync[field]) == "table" and sync[field] or {}
	sync[field][chatType] = (sync[field][chatType] or 0) + 1
end

local function Throttled(result)
	local codes = Enum and Enum.SendAddonMessageResult
	local addonCode = codes and codes.AddonMessageThrottle or 3
	local channelCode = codes and codes.ChannelThrottle or 8
	return result == addonCode or result == channelCode
end

local BNET_MAX = 4000

local function Deliver(q)
	local chatType, target = q.chatType, q.target
	if chatType == "BNET" then
		if not (C_BattleNet and C_BattleNet.SendGameData) or #q.message > BNET_MAX then
			return false
		end
		LI.Secure(C_BattleNet.SendGameData, target, PREFIX, q.message)
		LI.test.sync.sent = LI.test.sync.sent + 1
		Sync.session.sent = Sync.session.sent + 1
		Count("tx", chatType)
		return true
	end
	if chatType == "CHANNEL" then
		target = ChannelId()
		if not target then
			return false
		end
		target = tostring(target)
	end
	local ok, result = true, LI.Secure(C_ChatInfo.SendAddonMessage, PREFIX, q.message, chatType, target)
	result = LI.Safe(result)
	if Throttled(result) then
		LI.test.sync.throttled = (LI.test.sync.throttled or 0) + 1
		Sync.session.throttled = Sync.session.throttled + 1
		return false, "throttle"
	end
	if ok and (result == nil or result == 0 or result == true) then
		LI.test.sync.sent = LI.test.sync.sent + 1
		Sync.session.sent = Sync.session.sent + 1
		Count("tx", chatType)
		if chatType == "WHISPER" and type(target) == "string" then
			whispered[target:lower()] = { target = target, at = Now(), kind = q.kind }
		end
		return true
	end
	LI.test.sync.failed = (LI.test.sync.failed or 0) + 1
	Sync.session.failed = Sync.session.failed + 1
	LI.test.sync.lastError = string.format("%s on %s", ok and ("code " .. tostring(result)) or tostring(result):sub(1, 60), chatType)
	if Now() - lastFailLog > 60 then
		lastFailLog = Now()
		LI.Log("Send failed: " .. LI.test.sync.lastError)
	end
	return ok
end

local function Routes(withGuild)
	if LI.settings.guildOnly then
		return (IsInGuild and LI.Safe(LI.Try(IsInGuild))) and { "GUILD" } or {}
	end
	local routes = { "CHANNEL" }
	if withGuild and IsInGuild and LI.Safe(LI.Try(IsInGuild)) then
		routes[#routes + 1] = "GUILD"
	end
	local members = LI.Safe(LI.Try(GetNumGroupMembers)) or 0
	if members > 0 then
		routes[#routes + 1] = (IsInRaid and LI.Safe(LI.Try(IsInRaid))) and "RAID" or "PARTY"
	end
	return routes
end

local MAX_FRIENDS = 20
local MAX_ASKERS = 30
local askers = {}

local function OnlineFriends()
	local list = {}
	local api = C_FriendList
	if not api or not api.GetNumFriends then
		return list
	end
	local count = LI.Safe(LI.Try(api.GetNumFriends)) or 0
	for i = 1, count do
		local info = LI.Try(api.GetFriendInfoByIndex, i)
		if type(info) == "table" and LI.Safe(info.connected) and type(LI.Safe(info.name)) == "string" then
			local key = LI.FullName(LI.Safe(info.name))
			if key and key ~= LI.playerKey then
				list[#list + 1] = LI.WhisperTarget(key)
				if #list >= MAX_FRIENDS then
					break
				end
			end
		end
	end
	return list
end

local function Broadcast(kind, message, withGuild, withFriends)
	for _, route in ipairs(Routes(withGuild)) do
		Enqueue(kind, message, route)
	end
	if withFriends then
		for _, target in ipairs(OnlineFriends()) do
			Enqueue(kind, message, "WHISPER", target)
		end
	end
end

local tokens, tokensAt = BYTES_BURST, 0
local nextChannel = 0
local blockedUntil = {}

local PREFIX_BURST = 9
local PREFIX_PER_SEC = 0.9
local prefixTokens, prefixAt = PREFIX_BURST, 0

local function Counted(q)
	if not LI.RETAIL or q.chatType == "BNET" then
		return false
	end
	return q.chatType ~= "WHISPER" or (IsInInstance and LI.Safe(LI.Try(IsInInstance)) == true)
end

local function Pump()
	if #queue == 0 or not C_ChatInfo or not C_ChatInfo.SendAddonMessage or Paused() then
		return
	end
	local now = Now()
	tokens = math.min(BYTES_BURST, tokens + math.max(0, now - tokensAt) * BYTES_PER_SEC)
	tokensAt = now
	prefixTokens = math.min(PREFIX_BURST, prefixTokens + math.max(0, now - prefixAt) * PREFIX_PER_SEC)
	prefixAt = now
	for i, q in ipairs(queue) do
		local wait = (blockedUntil[q.chatType] or 0) > now or (q.chatType == "CHANNEL" and now < nextChannel) or (Counted(q) and prefixTokens < 1)
		if not wait then
			if tokens < #q.message then
				return
			end
			table.remove(queue, i)
			local sent, why = Deliver(q)
			if sent then
				if Counted(q) then
					prefixTokens = prefixTokens - 1
				end
				tokens = tokens - #q.message
				if q.chatType == "CHANNEL" then
					nextChannel = now + CHANNEL_GAP
				end
			elseif why == "throttle" then
				blockedUntil[q.chatType] = now + THROTTLE_PAUSE
				table.insert(queue, i, q)
			elseif q.chatType == "CHANNEL" then
				q.tries = (q.tries or 0) + 1
				if q.tries < 5 then
					table.insert(queue, i, q)
				end
			end
			return
		end
	end
end

function Sync.Send(message, chatType, target)
	if type(message) ~= "string" or #message > 250 then
		return
	end
	if chatType == "CHANNEL" then
		Broadcast("work", message, true, true)
	else
		Enqueue("work", message, chatType, target)
	end
end

function Sync.QueueSize()
	return #queue
end

function Sync.QueuedKinds()
	local kinds = {}
	for i, q in ipairs(queue) do
		kinds[i] = q.kind
	end
	return kinds
end

local function Own()
	local c = LI.playerKey and LI.crafters and LI.crafters[LI.playerKey]
	return c
end

function Sync.OwnPayload()
	local c = Own()
	if not c or not next(c.profs) then
		return nil
	end
	return Sync.Encode(c.profs)
end

local function OwnState()
	local own = LI.db.own
	if type(own) ~= "table" then
		own = {}
		LI.db.own = own
	end
	return own
end

function Sync.Version()
	return OwnState().ver
end

function Sync.Refresh()
	local payload = Sync.OwnPayload()
	local own = OwnState()
	if payload and payload ~= own.payload then
		own.payload = payload
		own.ver = B36(math.max(time(), (FromB36(own.ver or "") or 0) + 1))
		if LI.ready and Now() - lastChangeHello >= CHANGE_GAP then
			lastChangeHello = Now()
			nextHello = math.min(nextHello or math.huge, Now() + CHANGE_HELLO)
		end
		LI.Fire("TestChanged")
		return true
	end
	return false
end

local function LinkList()
	local list = {}
	for realm in pairs(Sync.Links()) do
		list[#list + 1] = realm
	end
	table.sort(list)
	return table.concat(list, ",")
end

local freshHello = true

function Sync.Hello()
	local own = OwnState()
	if not own.payload or not own.ver then
		return nil
	end
	local c = Own()
	local parts = {}
	local keys = {}
	for key in pairs(c.profs) do
		if not LI.GATHERING[key] then
			keys[#keys + 1] = key
		end
	end
	table.sort(keys)
	for _, key in ipairs(keys) do
		local p = c.profs[key]
		parts[#parts + 1] = table.concat({ Clean(key), B36(p.rank or 0), B36(p.max or 0), p.recipes and B36(p.count or 0) or "-" }, "~")
	end
	local class = select(2, LI.Try(UnitClass, "player")) or ""
	local base = string.format("H1|%s|%s|%s|%s|%s", own.ver, Clean(class), table.concat(parts, ";"), MyRealm(), MySid() or "")
	local links = LinkList()
	if links ~= "" and #base + #links + 1 > 200 then
		links = ""
	end
	if freshHello then
		return base .. "|" .. links .. "|J"
	end
	if links ~= "" then
		return base .. "|" .. links
	end
	return base
end

local function SendHello()
	local message = Sync.Hello()
	if message and #message <= 250 then
		Broadcast("hello", message, true, true)
		freshHello = false
	end
end

local answerGuild = false

local function SendData()
	local own = OwnState()
	if not own.payload or not own.ver then
		return
	end
	local payload = own.payload
	local total = math.max(1, math.ceil(#payload / CHUNK))
	if total > MAX_CHUNKS then
		LI.Log("Your profession list is too long to share")
		return
	end
	local targets = {}
	for key in pairs(askers) do
		targets[#targets + 1] = LI.WhisperTarget(key)
	end
	askers = {}
	local toGuild = answerGuild
	answerGuild = false
	local toChannel = #targets >= BROADCAST_ASKERS
	for i = 1, total do
		local chunk = string.format("D1|%s|%s|%s|%s", own.ver, B36(i), B36(total), payload:sub((i - 1) * CHUNK + 1, i * CHUNK))
		for _, route in ipairs(Routes(false)) do
			if route ~= "CHANNEL" or toChannel then
				Enqueue("data", chunk, route)
			end
		end
		if toGuild then
			Enqueue("data", chunk, "GUILD")
		end
		if not toChannel then
			for _, target in ipairs(targets) do
				Enqueue("data", chunk, "WHISPER", target)
			end
		end
	end
	lastAnswer = Now()
	LI.test.sync.answered = LI.test.sync.answered + 1
	LI.Fire("TestChanged")
end

local function Allow(key)
	local now = Now()
	local r = rates[key]
	if not r or now - r.start > RATE_WINDOW then
		r = { start = now, n = 0 }
		rates[key] = r
	end
	r.n = r.n + 1
	return r.n <= RATE_MAX
end

local function ProfName(key)
	if LI.PROFESSION_NAMES[key] then
		return LI.PROFESSION_NAMES[key]
	end
	return (key:gsub("(%a)(%w*)", function(a, b) return a:upper() .. b end))
end

local function RecipeMeta(id, profKey)
	local meta = LI.db.recipes[id]
	if meta and meta.n then
		return { id = id }
	end
	local name
	if C_Spell and C_Spell.GetSpellName then
		name = LI.Safe(LI.Try(C_Spell.GetSpellName, id))
	end
	local icon
	if C_Spell and C_Spell.GetSpellTexture then
		icon = LI.Safe(LI.Try(C_Spell.GetSpellTexture, id))
	end
	local item
	local api = C_TradeSkillUI
	if api and api.GetRecipeOutputItemData then
		local out = LI.Try(api.GetRecipeOutputItemData, id)
		if type(out) == "table" then
			item = LI.Safe(out.itemID)
			icon = LI.Safe(out.icon) or icon
		end
	end
	return { id = id, name = name, icon = icon, item = item, kind = LI.KindOf(item, profKey) }
end

local META_SLICE = 60
local metaQueue, metaRunning = {}, false

local function FillLater(ids, profKey)
	for _, id in ipairs(ids) do
		local meta = LI.db.recipes[id]
		if not (meta and meta.n) then
			metaQueue[#metaQueue + 1] = { id = id, p = profKey }
		end
	end
	if metaRunning or #metaQueue == 0 then
		return
	end
	metaRunning = true
	local function Step()
		local n = 0
		while #metaQueue > 0 and n < META_SLICE do
			local q = table.remove(metaQueue)
			local r = RecipeMeta(q.id, q.p)
			if r.name or r.item then
				local meta = LI.db.recipes[q.id] or {}
				LI.db.recipes[q.id] = meta
				meta.n = r.name or meta.n
				meta.i = r.icon or meta.i
				meta.item = r.item or meta.item
				meta.p = meta.p or q.p
				meta.k = r.kind or meta.k
			end
			n = n + 1
		end
		if #metaQueue > 0 then
			LI.After(0, Step)
		else
			metaRunning = false
			LI.Fire("CraftersChanged")
		end
	end
	LI.After(0, Step)
end
Sync.FillLater = FillLater

local function KnownProf(c, key)
	return c and c.profs[key]
end

local function Ask(key, ver, chatType)
	local short = LI.WhisperTarget(key)
	if not short then
		return
	end
	local outstanding = 0
	for _, a in pairs(asked) do
		if Now() - a.at < ASK_GAP then
			outstanding = outstanding + 1
		end
	end
	local a = asked[key]
	if (a and Now() - a.at < ASK_GAP) or outstanding >= ASK_MAX then
		return
	end
	asked[key] = { at = Now(), ver = ver }
	if SHARED[chatType] then
		Enqueue("ask", "Q2|" .. ver .. "|" .. LI.ShortName(key), chatType)
	else
		Enqueue("ask", "Q1|" .. ver, "WHISPER", short)
	end
end

local function OnHello(key, parts, chatType)
	local ver, class, list = parts[2], parts[3], parts[4] or ""
	if not FromB36(ver) then
		return
	end
	local links
	if parts[5] then
		links = {}
		for realm in (parts[7] or ""):gmatch("[^,]+") do
			if realm:match("^%w+$") then
				links[realm] = true
			end
		end
	end
	local peer = NotePeer(key, parts[5], parts[6], links)
	if chatType == "WHISPER" and peer.realm and peer.realm ~= MyRealm() and not peer.greeted then
		peer.greeted = true
		local hello = Sync.Hello()
		if hello then
			Enqueue("hello", hello, "WHISPER", LI.WhisperTarget(key))
		end
	end
	if not LI.Heard(key) then
		LI.test.sync.heard = LI.test.sync.heard + 1
	end
	LI.NoteHeard(key)
	if not sessionHeard[key] then
		sessionHeard[key] = true
		local realm = peer.realm and peer.realm ~= MyRealm() and (" on " .. peer.realm) or ""
		LI.Log(string.format("Heard %s (Linked Inn%s, %s)", LI.ShortName(key), realm, tostring(chatType)))
		if Now() - lastGreet >= GREET_GAP then
			lastGreet = Now()
			LI.After(2 + math.random() * 3, function()
				Sync.Refresh()
				SendHello()
				if LI.Work and LI.Work.Resend then
					LI.Work.Resend()
				end
			end)
		end
	end
	if parts[8] == "J" and Now() - lastGreet >= REPLY_GAP then
		lastGreet = Now()
		LI.After(2 + math.random() * 4, function()
			Sync.Refresh()
			SendHello()
		end)
	end
	local c = LI.Crafter(key, true)
	if class and class ~= "" and class:match("^%u+$") then
		c.class = class
	end
	local count, missing = 0, nil
	for _, section in ipairs(Split(list, ";")) do
		count = count + 1
		if count > MAX_PROFS then
			break
		end
		local f = Split(section, "~")
		if #f == 4 and f[1] ~= "" and not f[1]:find("[^%a ]") and not LI.GATHERING[f[1]] then
			local p = c.profs[f[1]] or {}
			c.profs[f[1]] = p
			p.name = p.name or ProfName(f[1])
			p.icon = p.icon or LI.PROFESSION_ICONS[f[1]]
			p.rank = FromB36(f[2]) or p.rank
			p.max = FromB36(f[3]) or p.max
			if (FromB36(f[4]) or 0) > 0 and not p.recipes then
				missing = missing or {}
				missing[f[1]] = true
			end
		end
	end
	c.where = c.where or "Linked Inn"
	c.li = true
	LI.TrimLow(key)
	LI.Fire("CraftersChanged")
	local short = false
	for profKey in pairs(missing or {}) do
		if c.profs[profKey] then
			short = true
		end
	end
	if LI.crafters[key] == c and (c.sharedVer ~= ver or short) then
		Ask(key, ver, chatType)
	end
end

local payloads = {}
local quietApply = false

local function Apply(key, ver, payload)
	local profs = Sync.Decode(payload)
	if not profs then
		LI.Log("Ignored a broken profession list from " .. LI.ShortName(key))
		return
	end
	local c = LI.Crafter(key, true)
	for _, prof in ipairs(profs) do
		local info = {
			name = (c.profs[prof.key] and c.profs[prof.key].name) or ProfName(prof.key),
			rank = prof.rank > 0 and prof.rank or nil,
			max = prof.max > 0 and prof.max or nil,
			link = prof.link,
			text = prof.link and ("[" .. ProfName(prof.key) .. "]") or nil,
			icon = (c.profs[prof.key] and c.profs[prof.key].icon) or LI.PROFESSION_ICONS[prof.key],
		}
		if prof.ids then
			local list = {}
			for _, id in ipairs(prof.ids) do
				list[#list + 1] = LI.RETAIL and { id = id } or RecipeMeta(id, prof.key)
			end
			LI.SetRecipes(key, info, list, "shared")
			if LI.RETAIL then
				FillLater(prof.ids, prof.key)
			end
		else
			local p = c.profs[prof.key] or {}
			c.profs[prof.key] = p
			p.name, p.rank, p.max = info.name, info.rank or p.rank, info.max or p.max
			p.link = info.link or p.link
			p.text = info.text or p.text
			p.icon = p.icon or info.icon
		end
	end
	c.sharedVer = ver
	c.li = true
	asked[key] = nil
	payloads[key] = { ver = ver, payload = payload }
	LI.test.sync.lists = LI.test.sync.lists + 1
	if not quietApply then
		LI.Log(string.format("Got %s's professions from Linked Inn", LI.ShortName(key)))
	end
	LI.Fire("CraftersChanged")
	return true
end

function Sync.ApplyCard(key, ver, payload, class, via)
	if not key or key == LI.playerKey or not FromB36(ver) or type(payload) ~= "string" then
		return false
	end
	quietApply = true
	local ok = Apply(key, ver, payload)
	quietApply = false
	local c = LI.crafters[key]
	if not ok or not c then
		return false
	end
	c.li = true
	c.where = c.where or "Linked Inn"
	if type(class) == "string" and class:match("^%u+$") then
		c.class = class
	end
	LI.NoteHeard(key)
	LI.Log(string.format("Got %s's professions through %s (Linked Inn bridge)", LI.ShortName(key), tostring(via)))
	return true
end

function Sync.Cached(key)
	return payloads[key]
end

function Sync.OwnCard()
	local own = OwnState()
	if not own.payload or not own.ver or not LI.playerKey then
		return nil
	end
	local class = select(2, LI.Try(UnitClass, "player"))
	return { origin = LI.playerKey, ver = own.ver, payload = own.payload, class = LI.Safe(class) }
end

function Sync.LivePeers()
	local out = {}
	for key, p in pairs(peers) do
		if Live(p) and key ~= LI.playerKey then
			out[#out + 1] = key
		end
	end
	return out
end

function Sync.MySid()
	return MySid()
end

function Sync.Allow(key)
	return Allow(key)
end

function Sync.FromB36(s)
	return FromB36(s)
end

local function OnData(key, parts)
	local ver, i, n, chunk = parts[2], FromB36(parts[3]), FromB36(parts[4]), parts[5] or ""
	if not FromB36(ver) or not i or not n or n < 1 or n > MAX_CHUNKS or i < 1 or i > n or #chunk > CHUNK then
		return
	end
	LI.NoteHeard(key)
	local c = LI.crafters[key]
	local a = asked[key]
	if c and c.sharedVer == ver and not (a and a.ver == ver and Now() - a.at < ASK_GAP) then
		return
	end
	local buf = buffers[key]
	if not buf or buf.ver ~= ver or buf.n ~= n then
		local count = 0
		for k, b in pairs(buffers) do
			if Now() - b.at > BUFFER_TTL then
				buffers[k] = nil
			else
				count = count + 1
			end
		end
		if count >= MAX_BUFFERS and not buffers[key] then
			return
		end
		buf = { ver = ver, n = n, parts = {}, got = 0 }
		buffers[key] = buf
	end
	buf.at = Now()
	if not buf.parts[i] then
		buf.parts[i] = chunk
		buf.got = buf.got + 1
	end
	if buf.got == n then
		buffers[key] = nil
		Apply(key, ver, table.concat(buf.parts))
	end
end

local function OnAsk(key, parts)
	LI.NoteHeard(key)
	local n = 0
	for _ in pairs(askers) do
		n = n + 1
	end
	if n < MAX_ASKERS then
		askers[key] = true
	end
	if not OwnState().ver or answerAt then
		return
	end
	answerAt = math.max(Now() + ANSWER_WAIT, lastAnswer + ANSWER_GAP)
end

local Dispatch

local function OnRelay(relayer, text, chatType)
	if LI.RETAIL then
		return
	end
	local originName, inner = text:match("^B1|([^|]+)|(.+)$")
	if not originName or not RELAY[inner:sub(1, 2)] then
		return
	end
	local realm = originName:match("%-(%w+)$")
	local origin = LI.FullName(originName)
	if not realm or not origin or origin == LI.playerKey or origin == relayer then
		return
	end
	local id = origin .. "\1" .. inner
	if seenMsgs[id] or not Allow(origin) then
		return
	end
	seenMsgs[id] = Now()
	Touch(relayer)
	LI.test.sync.relayIn = (LI.test.sync.relayIn or 0) + 1
	if realm ~= MyRealm() then
		LI.realmOf[origin] = realm
	end
	if chatType == "WHISPER" then
		Enqueue("relay", text, "CHANNEL")
	end
	Dispatch(origin, inner, "RELAY")
end


local function NotFoundName(msg)
	local fmt = ERR_CHAT_PLAYER_NOT_FOUND_S
	if type(fmt) ~= "string" or type(msg) ~= "string" then
		return nil
	end
	local pattern = "^" .. fmt:gsub("([%(%)%.%%%+%-%*%?%[%]%^%$])", "%%%1"):gsub("%%%%s", "(.+)") .. "$"
	return msg:match(pattern)
end

local function OurWhisper(msg)
	local name = NotFoundName(msg)
	local w = name and whispered[name:lower()]
	if w and Now() - w.at <= WHISPER_MEMORY then
		return w
	end
	return nil
end

function Sync.HideNotFound(_, _, msg)
	return OurWhisper(LI.Safe(msg)) ~= nil
end

local function OnNotFound(msg)
	local w = OurWhisper(msg)
	if not w then
		return
	end
	if w.failed then
		return
	end
	w.failed = true
	local key = LI.FullName(w.target)
	local p = peers[key]
	if p then
		p.at = nil
	end
	LI.Log(string.format("Could not whisper %s (%s): offline", w.target, tostring(w.kind)))
end

local heardThisSession = false

function Sync.OnMessage(prefix, text, chatType, sender)
	if prefix ~= PREFIX or type(text) ~= "string" or type(sender) ~= "string" or not LI.ready then
		return
	end
	local key = LI.FullName(sender)
	if not key then
		return
	end
	if not heardThisSession then
		heardThisSession = true
		LI.Log(string.format("First message on %s this session, from %s", tostring(chatType), key == LI.playerKey and "yourself" or LI.ShortName(key)))
	end
	if key == LI.playerKey then
		if not LI.test.sync.echo then
			LI.test.sync.echo = true
			LI.Log("The hidden channel works: heard your own message")
			LI.Fire("TestChanged")
		end
		return
	end
	if #text > 255 or not Allow(key) or not LI.Allowed(key) then
		return
	end
	Count("rx", chatType or "?")
	Touch(key)
	if not firstFrom[key] then
		firstFrom[key] = true
		LI.Log(string.format("First message from %s via %s (sender %s)", LI.ShortName(key), tostring(chatType), sender))
	end
	local known = LI.crafters[key]
	local kind = text:sub(1, 3)
	if not (known and known.li and known.sharedVer) and kind ~= "H1|" and kind ~= "D1|" and kind ~= "B1|" then
		Ask(key, "0", chatType)
	end
	if text:sub(1, 3) == "B1|" then
		OnRelay(key, text, chatType)
		return
	end
	Dispatch(key, text, chatType)
end

local PING_LISTEN = 60
local pingedAt = -PING_LISTEN

Dispatch = function(key, text, chatType)
	if not LI.Allowed(key) then
		return
	end
	local parts = Split(text, "|")
	local kind = parts[1]
	if kind == "P1" then
		local reply = "P2|" .. tostring(parts[2] or "")
		if chatType == "WHISPER" then
			Enqueue("pong", reply, "WHISPER", LI.WhisperTarget(key))
		else
			Enqueue("pong", reply, chatType == "CHANNEL" and "CHANNEL" or chatType)
		end
		return
	elseif kind == "P2" then
		if GetTime() - pingedAt > PING_LISTEN then
			return
		end
		local sent = tonumber(parts[2] or "")
		local took = sent and string.format(" (%.1fs)", math.max(0, GetTime() - sent / 10)) or ""
		LI.Print(string.format("Pong from %s via %s%s", LI.ShortName(key), tostring(chatType), took))
		LI.Log(string.format("Pong from %s via %s", LI.ShortName(key), tostring(chatType)))
		return
	end
	if kind == "H1" then
		OnHello(key, parts, chatType)
	elseif kind == "D1" and #parts == 5 then
		OnData(key, parts)
	elseif kind == "Q1" then
		OnAsk(key, parts)
	elseif kind == "Q2" and SHARED[chatType] then
		local me = LI.playerKey and LI.ShortName(LI.playerKey)
		if me and type(parts[3]) == "string" and parts[3]:lower() == me:lower() then
			answerGuild = answerGuild or chatType == "GUILD"
			OnAsk(key, parts)
		end
	elseif kind == "C1" and LI.Bridge then
		LI.Bridge.OnCard(key, text, chatType)
	elseif kind == "R1" and LI.Work then
		LI.Work.OnRequest(key, parts)
	elseif kind == "X1" and LI.Work then
		LI.Work.OnCancel(key, parts)
	elseif kind == "O1" and LI.Work then
		LI.Work.OnOffer(key, parts)
	end
end

local function Tick()
	if not LI.ready then
		return
	end
	local now = Now()
	if nextHello and now >= nextHello and joined then
		nextHello = now + HELLO_EVERY + math.random(0, HELLO_JITTER)
		Sync.Refresh()
		SendHello()
	end
	if answerAt and now >= answerAt then
		answerAt = nil
		SendData()
	end
	local sig = LinkList()
	if sig ~= linkSig then
		local gained = false
		for realm in sig:gmatch("[^,]+") do
			if not ("," .. linkSig .. ","):find("," .. realm .. ",", 1, true) then
				gained = true
			end
		end
		if gained then
			LI.Log("Linked to Linked Inn users on " .. sig)
		end
		linkSig = sig
		if gained and joined and now - lastLinkHello >= LINK_HELLO_GAP then
			lastLinkHello = now
			nextHello = math.min(nextHello or math.huge, now + 3)
		end
	end
	for id, at in pairs(seenMsgs) do
		if now - at > SEEN_TTL then
			seenMsgs[id] = nil
		end
	end
end

local joinDeferred = 0

local function SlotOneTaken()
	if not GetChannelName then
		return true
	end
	local id = LI.Safe(LI.Try(GetChannelName, 1))
	return type(id) == "number" and id > 0
end

local function Settle()
	local windows = NUM_CHAT_WINDOWS or 10
	if RemoveChatWindowChannel then
		for i = 1, windows do
			LI.Try(RemoveChatWindowChannel, i, CHANNEL)
		end
	end
	joined = true
	LI.test.sync.joined = true
	LI.Log(string.format("Joined the hidden channel %.0fs after login", Now() - (LI.readyAt or Now())))
	LI.Fire("TestChanged")
	if not nextHello then
		nextHello = Now() + FIRST_HELLO
		LI.After(SECOND_HELLO, function()
			if joined then
				freshHello = true
				nextHello = math.min(nextHello or math.huge, Now())
			end
		end)
	end
end

local Join

local function Confirm(tries)
	if joined then
		return
	end
	if ChannelId() then
		Settle()
	elseif tries < JOIN_WAIT then
		LI.After(1, function()
			Confirm(tries + 1)
		end)
	else
		LI.After(JOIN_RETRY, Join)
	end
end

Join = function()
	if joined then
		return
	end
	channelName = CHANNEL
	if ChannelId() then
		Settle()
		return
	end
	if not SlotOneTaken() and joinDeferred < JOIN_DEFER_MAX then
		joinDeferred = joinDeferred + 1
		LI.After(JOIN_DEFER, Join)
		return
	end
	if JoinTemporaryChannel then
		LI.Try(JoinTemporaryChannel, CHANNEL)
	elseif JoinChannelByName then
		LI.Try(JoinChannelByName, CHANNEL)
	end
	Confirm(0)
end

function Sync.Ping(target)
	pingedAt = GetTime()
	local token = tostring(math.floor(GetTime() * 10))
	if target and target ~= "" then
		Enqueue("ping", "P1|" .. token, "WHISPER", LI.WhisperTarget(LI.FullName(target)))
		LI.Print("Pinging " .. target .. " by whisper...")
	else
		Broadcast("ping", "P1|" .. token, true, true)
		LI.Print("Pinging every Linked Inn user on " .. table.concat(Routes(true), ", ") .. "...")
	end
end

local function OwnCount()
	local n = 0
	local c = Own()
	for key, p in pairs(c and c.profs or {}) do
		if not LI.GATHERING[key] and p.recipes then
			n = n + 1
		end
	end
	return n
end

function Sync.Status()
	local sync = LI.test.sync or {}
	local function Counts(field)
		local parts = {}
		for route, n in pairs(sync[field] or {}) do
			parts[#parts + 1] = route .. " " .. n
		end
		table.sort(parts)
		return #parts > 0 and table.concat(parts, ", ") or "none"
	end
	local heard = {}
	for key in pairs(firstFrom) do
		local c = LI.crafters[key]
		local crafting, other = {}, {}
		for profKey, p in pairs(c and c.profs or {}) do
			if p.recipes then
				if LI.SECONDARY_SET[profKey] then
					other[#other + 1] = p.name or profKey
				else
					crafting[#crafting + 1] = p.name or profKey
				end
			end
		end
		table.sort(crafting)
		table.sort(other)
		local what
		if #crafting > 0 then
			what = table.concat(crafting, ", ")
		elseif #other > 0 then
			what = table.concat(other, ", ") .. " only, shown with Secondary"
		else
			what = "nothing shared"
		end
		local realm = Sync.RealmOf(key)
		local where = (realm and realm ~= MyRealm()) and (" on " .. realm) or ""
		heard[#heard + 1] = string.format("%s%s (%s)", LI.ShortName(key), where, what)
	end
	table.sort(heard)
	local bridges = {}
	for realm, key in pairs(Sync.Links()) do
		local elected, other = Sync.Elected(realm)
		bridges[#bridges + 1] = string.format("%s via %s (%s)", realm, LI.ShortName(key), elected and "you relay" or (LI.ShortName(other) .. " relays"))
	end
	table.sort(bridges)
	local lines = {
		string.format("Realm: %s (server %s)", MyRealm(), tostring(MySid())),
		string.format("Channel: %s%s", joined and "joined" or "NOT joined", ChannelId() and (" (#" .. ChannelId() .. ")") or ""),
		"Other realms: " .. (#bridges > 0 and table.concat(bridges, "; ") or "none linked yet"),
		LI.Bridge and LI.Bridge.Status() or "Bridge: off",
		string.format("Your list: version %s, %d professions", tostring(OwnState().ver), OwnCount()),
		"Sent: " .. Counts("tx") .. ((sync.failed or 0) > 0 and string.format("  |cffff6060failed %d (%s)|r", sync.failed, tostring(sync.lastError)) or ""),
		"Received: " .. Counts("rx"),
		"Users heard: " .. (#heard > 0 and table.concat(heard, ", ") or "none yet"),
		LI.Reader.QuietState and (function()
			local off, tries, works = LI.Reader.QuietState()
			return string.format("Quiet reading: %s (%d of %d reads answered)", off and "|cffff6060off, using the hidden window|r" or "on", works, tries)
		end)() or nil,
		LI.sights and string.format("Players seen: %d (%d without a name, %d without an id, %d lined up to check)", LI.sights.players, LI.sights.noName, LI.sights.noId, LI.sights.lined) or nil,
		LI.Crafts and (function()
			local c = LI.Crafts()
			return string.format("Crafting log: %d lines, %d known items, %d unknown items, %d read; waiting to see again: %d (%d found so far). Players checked: %d, in line: %d. Reads waiting: %d", c.lines, c.known, c.unknown, c.queued, LI.WaitingCount(), c.found, c.checked, LI.DiscoverQueue(), LI.Reader.QueueSize())
		end)() or nil,
		"Waiting to send: " .. #queue,
	}
	for _, line in ipairs(lines) do
		LI.Print(line)
	end
	return lines
end

function Sync.IsJoined()
	return joined
end

function Sync.IsPaused()
	return Paused()
end

function Sync.LiveCount()
	return #Sync.LivePeers()
end

local function ReadOwnBasics()
	if not GetProfessions or not GetProfessionInfo or not LI.playerKey then
		return
	end
	local indices = { LI.Try(GetProfessions) }
	local c = LI.Crafter(LI.playerKey, true)
	for i = 1, 6 do
		local index = LI.Safe(indices[i])
		if type(index) == "number" then
			local name, icon, rank, maxRank, _, spellOffset, skillLine = LI.Try(GetProfessionInfo, index)
			name, icon, rank, maxRank = LI.Safe(name), LI.Safe(icon), LI.Safe(rank), LI.Safe(maxRank)
			spellOffset, skillLine = LI.Safe(spellOffset), LI.Safe(skillLine)
			local key = LI.ProfKeyForLine(skillLine) or LI.ProfKey(name)
			if key and not LI.GATHERING[key] and (not LI.RETAIL or LI.PROFESSION_NAMES[key]) then
				local spellID
				if type(spellOffset) == "number" and C_SpellBook and C_SpellBook.GetSpellBookItemInfo then
					local bank = Enum and Enum.SpellBookSpellBank and Enum.SpellBookSpellBank.Player or 0
					local item = LI.Try(C_SpellBook.GetSpellBookItemInfo, spellOffset + 1, bank)
					spellID = type(item) == "table" and LI.Safe(item.spellID) or nil
				end
				if type(spellID) == "number" and type(skillLine) == "number" then
					LI.ownLinks = LI.ownLinks or {}
					LI.ownLinks[key] = { spell = spellID, line = skillLine }
					LI.NoteProfLink(key, { spellID, skillLine })
				end
				local p = c.profs[key] or {}
				c.profs[key] = p
				p.name = name
				p.icon = icon or p.icon
				p.rank = rank or p.rank
				p.max = maxRank or p.max
			end
		end
	end
	c.class = c.class or select(2, LI.Try(UnitClass, "player"))
end

local grouped = {}
LI.On("GROUP_ROSTER_UPDATE", function()
	if not LI.ready then
		return
	end
	local count = LI.Safe(LI.Try(GetNumGroupMembers)) or 0
	local prefix = (IsInRaid and LI.Safe(LI.Try(IsInRaid))) and "raid" or "party"
	local fresh = false
	local now = {}
	for i = 1, count do
		local key = LI.UnitKey(prefix .. i)
		if key and key ~= LI.playerKey then
			now[key] = true
			if not grouped[key] then
				fresh = true
			end
		end
	end
	grouped = now
	if fresh and Now() - lastGreet >= GREET_GAP then
		lastGreet = Now()
		LI.After(2, function()
			Sync.Refresh()
			SendHello()
			if LI.Work and LI.Work.Resend then
				LI.Work.Resend()
			end
		end)
	end
end)

LI.On("CHAT_MSG_SYSTEM", function(msg)
	OnNotFound(LI.Safe(msg))
end)

LI.On("CHAT_MSG_ADDON", function(prefix, text, chatType, sender)
	Sync.OnMessage(LI.Safe(prefix), LI.Safe(text), LI.Safe(chatType), LI.Safe(sender))
end)

LI.On("SKILL_LINES_CHANGED", function()
	if LI.ready then
		ReadOwnBasics()
		Sync.Refresh()
	end
end)

LI.Listen("OwnRecipesChanged", function()
	Sync.Refresh()
end)

LI.Listen("Ready", function()
	LI.test.sync = type(LI.test.sync) == "table" and LI.test.sync or {}
	for _, k in ipairs({ "sent", "heard", "lists", "answered" }) do
		LI.test.sync[k] = LI.test.sync[k] or 0
	end
	LI.test.sync.joined = false
	if C_ChatInfo and C_ChatInfo.RegisterAddonMessagePrefix then
		LI.Try(C_ChatInfo.RegisterAddonMessagePrefix, PREFIX)
	end
	local addFilter = (ChatFrameUtil and ChatFrameUtil.AddMessageEventFilter) or ChatFrame_AddMessageEventFilter
	if addFilter then
		LI.Try(addFilter, "CHAT_MSG_SYSTEM", Sync.HideNotFound)
	end
	if type(LI.db.probed) == "table" then
		for key, at in pairs(LI.db.probed) do
			if type(at) ~= "number" or time() - at > DISCOVER_AGAIN then
				LI.db.probed[key] = nil
			end
		end
	end
	ReadOwnBasics()
	Sync.Refresh()
	LI.After(JOIN_DELAY, Join)
	LI.Every(SEND_GAP, Pump)
	LI.Every(TICK_EVERY, Tick)
end)
