local ADDON, LI = ...

local Sync = {}
LI.Sync = Sync

local PREFIX = "LinkedInn"
local CHANNEL = "LinkedInnSync"
local JOIN_DELAY = 10
local FIRST_HELLO = 30
local HELLO_EVERY = 12 * 60
local HELLO_JITTER = 3 * 60
local CHANGE_HELLO = 10
local CHANGE_GAP = 120
local SEND_EVERY = 1
local ANSWER_WAIT = 3
local ANSWER_GAP = 60
local ASK_GAP = 120
local ASK_MAX = 3
local CHUNK = 200
local MAX_CHUNKS = 40
local MAX_PROFS = 8
local MAX_IDS = 1500
local RATE_WINDOW = 60
local RATE_MAX = 60
local BUFFER_TTL = 90
local MAX_BUFFERS = 20

local queue = {}
local channelName
local joined = false
local nextHello
local lastChangeHello = 0
local answerAt
local lastAnswer = 0
local asked = {}
local buffers = {}
local rates = {}

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
		for id in pairs(p.recipes or {}) do
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

local function Enqueue(kind, message, chatType, target)
	for _, q in ipairs(queue) do
		if q.kind == kind and q.message == message and q.chatType == chatType and q.target == target then
			return
		end
	end
	queue[#queue + 1] = { kind = kind, message = message, chatType = chatType, target = target }
end

local function Deliver(q)
	local chatType, target = q.chatType, q.target
	if chatType == "CHANNEL" then
		target = ChannelId()
		if not target then
			return false
		end
		target = tostring(target)
	end
	local ok = pcall(C_ChatInfo.SendAddonMessage, PREFIX, q.message, chatType, target)
	if ok then
		LI.test.sync.sent = LI.test.sync.sent + 1
	end
	return ok
end

local function Pump()
	if #queue == 0 or not C_ChatInfo or not C_ChatInfo.SendAddonMessage or Paused() then
		return
	end
	local q = table.remove(queue, 1)
	if not Deliver(q) and q.chatType == "CHANNEL" then
		q.tries = (q.tries or 0) + 1
		if q.tries < 5 then
			table.insert(queue, 1, q)
		end
	end
end

function Sync.Send(message, chatType, target)
	if type(message) == "string" and #message <= 250 then
		Enqueue("work", message, chatType, target)
	end
end

function Sync.QueueSize()
	return #queue
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
	return string.format("H1|%s|%s|%s", own.ver, Clean(class), table.concat(parts, ";"))
end

local function SendHello()
	local message = Sync.Hello()
	if message and #message <= 250 then
		Enqueue("hello", message, "CHANNEL")
	end
end

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
	for i = 1, total do
		Enqueue("data", string.format("D1|%s|%s|%s|%s", own.ver, B36(i), B36(total), payload:sub((i - 1) * CHUNK + 1, i * CHUNK)), "CHANNEL")
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

local function KnownProf(c, key)
	return c and c.profs[key]
end

local function Ask(key, ver)
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
	Enqueue("ask", "Q1|" .. ver, "WHISPER", short)
end

local function OnHello(key, parts)
	local ver, class, list = parts[2], parts[3], parts[4] or ""
	if not FromB36(ver) then
		return
	end
	if not LI.Heard(key) then
		LI.test.sync.heard = LI.test.sync.heard + 1
	end
	LI.NoteHeard(key)
	local c = LI.Crafter(key, true)
	if class and class ~= "" and class:match("^%u+$") then
		c.class = class
	end
	local count = 0
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
		end
	end
	c.where = c.where or "Linked Inn"
	LI.Fire("CraftersChanged")
	if c.sharedVer ~= ver then
		Ask(key, ver)
	end
end

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
				list[#list + 1] = RecipeMeta(id, prof.key)
			end
			LI.SetRecipes(key, info, list, "shared")
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
	asked[key] = nil
	LI.test.sync.lists = LI.test.sync.lists + 1
	LI.Log(string.format("Got %s's professions from Linked Inn", LI.ShortName(key)))
	LI.Fire("CraftersChanged")
end

local function OnData(key, parts)
	local ver, i, n, chunk = parts[2], FromB36(parts[3]), FromB36(parts[4]), parts[5] or ""
	if not FromB36(ver) or not i or not n or n < 1 or n > MAX_CHUNKS or i < 1 or i > n or #chunk > CHUNK then
		return
	end
	LI.NoteHeard(key)
	local c = LI.crafters[key]
	if c and c.sharedVer == ver then
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
	if not OwnState().ver or answerAt then
		return
	end
	answerAt = math.max(Now() + ANSWER_WAIT, lastAnswer + ANSWER_GAP)
end

function Sync.OnMessage(prefix, text, chatType, sender)
	if prefix ~= PREFIX or type(text) ~= "string" or type(sender) ~= "string" or not LI.ready then
		return
	end
	local key = LI.FullName(sender)
	if not key then
		return
	end
	if key == LI.playerKey then
		if not LI.test.sync.echo then
			LI.test.sync.echo = true
			LI.Log("The hidden channel works: heard your own message")
			LI.Fire("TestChanged")
		end
		return
	end
	if #text > 255 or not Allow(key) then
		return
	end
	local parts = Split(text, "|")
	local kind = parts[1]
	if kind == "H1" then
		OnHello(key, parts)
	elseif kind == "D1" and #parts == 5 then
		OnData(key, parts)
	elseif kind == "Q1" then
		OnAsk(key, parts)
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
end

local function Join()
	if joined then
		return
	end
	channelName = CHANNEL
	if not ChannelId() then
		local joins = { JoinTemporaryChannel, JoinChannelByName }
		for _, fn in ipairs(joins) do
			if type(fn) == "function" then
				LI.Try(fn, CHANNEL)
				if ChannelId() then
					break
				end
			end
		end
	end
	local windows = NUM_CHAT_WINDOWS or 10
	if RemoveChatWindowChannel then
		for i = 1, windows do
			LI.Try(RemoveChatWindowChannel, i, CHANNEL)
		end
	end
	joined = ChannelId() ~= nil
	LI.test.sync.joined = joined
	LI.Fire("TestChanged")
	if not joined then
		LI.After(30, Join)
		return
	end
	if not nextHello then
		nextHello = Now() + FIRST_HELLO
	end
end

function Sync.IsJoined()
	return joined
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
			local key = LI.ProfKey(name)
			if key and not LI.GATHERING[key] then
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
	ReadOwnBasics()
	Sync.Refresh()
	LI.After(JOIN_DELAY, Join)
	LI.Every(SEND_EVERY, function()
		Pump()
		Tick()
	end)
end)
