local ADDON, LI = ...

local Work = {}
LI.Work = Work

local RESEND_EVERY = 5 * 60
local OWNER_GONE = 12 * 60
local MAX_MINE = 5
local MAX_PER_OWNER = 5
local MAX_ALL = 200
local NOTE_MAX = 60
local QTY_MAX = 99
local PRICE_MAX = 99999 * 10000

Work.DURATIONS = {
	{ seconds = 30 * 60, name = "30 minutes" },
	{ seconds = 60 * 60, name = "1 hour" },
	{ seconds = 2 * 3600, name = "2 hours" },
	{ seconds = 4 * 3600, name = "4 hours" },
}

Work.MATS = {
	all = { code = "a", name = "Has all mats", short = "All mats" },
	some = { code = "s", name = "Has some mats", short = "Some mats" },
	none = { code = "n", name = "Needs mats", short = "No mats" },
}
local MATS_BY_CODE = { a = "all", s = "some", n = "none" }

Work.MIN_PRICES = { 0, 10000, 50000, 100000, 500000 }

local DEFAULTS = {
	notify = true,
	sound = true,
	glow = true,
	minPrice = 0,
	allMats = false,
	profs = {},
	duration = 2 * 3600,
}

local received = {}
local seenKeys = {}
local unseen = {}
local lastResend = 0

local function B36(n)
	return LI.Sync.B36(n)
end

local function FromB36(s)
	return LI.Sync.FromB36(s)
end

local function Clean(text, max)
	text = tostring(text or ""):gsub("[|\r\n\t]", " "):gsub("%s+", " ")
	text = LI.Trim(text)
	if #text > max then
		text = text:sub(1, max)
		while #text > 0 and text:byte(#text) >= 128 and text:byte(#text) < 192 do
			text = text:sub(1, -2)
		end
		local last = text:byte(#text)
		if last and last >= 192 then
			text = text:sub(1, -2)
		end
	end
	return text
end
Work.Clean = Clean

local function State()
	local db = LI.db
	db.work = type(db.work) == "table" and db.work or {}
	local w = db.work
	w.mine = type(w.mine) == "table" and w.mine or {}
	w.seq = tonumber(w.seq) or 0
	return w
end

function Work.Settings()
	local s = LI.settings.work
	if type(s) ~= "table" then
		s = {}
		LI.settings.work = s
	end
	for k, v in pairs(DEFAULTS) do
		if s[k] == nil then
			s[k] = LI.Copy(v)
		end
	end
	return s
end

function Work.ItemOf(recipeID)
	local meta = LI.db.recipes[recipeID]
	return meta and meta.item
end

function Work.Encode(req)
	return string.format("R1|%s|%s|%s|%d|%s|%s|%s|%s",
		req.id, B36(req.item or 0), B36(req.recipe or 0), req.qty,
		Work.MATS[req.mats].code, B36(req.price), B36(math.max(0, req.expires - time())), Clean(req.note, NOTE_MAX))
end

function Work.Decode(owner, parts)
	if #parts < 8 then
		return nil
	end
	local id, item, recipe = parts[2], FromB36(parts[3]), FromB36(parts[4])
	local qty, mats, price, ttl = tonumber(parts[5]), MATS_BY_CODE[parts[6]], FromB36(parts[7]), FromB36(parts[8])
	if type(id) ~= "string" or not id:match("^[0-9a-z]+$") or #id > 6 then
		return nil
	end
	if not recipe or recipe <= 0 or not qty or qty < 1 or qty > QTY_MAX or not mats or not price or price > PRICE_MAX or not ttl or ttl <= 0 or ttl > 4 * 3600 + 60 then
		return nil
	end
	return {
		key = owner .. ":" .. id,
		id = id,
		owner = owner,
		item = item and item > 0 and item or nil,
		recipe = recipe,
		qty = qty,
		mats = mats,
		price = price,
		note = Clean(parts[9], NOTE_MAX),
		expires = time() + ttl,
		heard = time(),
	}
end

local function Send(message, chatType, target)
	if LI.Sync and LI.Sync.Send then
		LI.Sync.Send(message, chatType, target)
	end
end

local function Prune()
	local now = time()
	local w = State()
	for id, req in pairs(w.mine) do
		if req.expires <= now then
			w.mine[id] = nil
		end
	end
	for key, req in pairs(received) do
		if req.expires <= now or now - req.heard > OWNER_GONE then
			received[key] = nil
			unseen[key] = nil
		end
	end
end

function Work.MyRecipes()
	local mine = {}
	local c = LI.crafters and LI.crafters[LI.playerKey]
	for profKey, p in pairs(c and c.profs or {}) do
		for id in pairs(p.recipes or {}) do
			mine[id] = profKey
		end
	end
	return mine
end

function Work.CanMake(req)
	local mine = Work.MyRecipes()
	if mine[req.recipe] then
		return true, mine[req.recipe]
	end
	local byItem = req.item and LI.RecipeForItem(req.item)
	if byItem and mine[byItem] then
		return true, mine[byItem]
	end
	return false, nil
end

function Work.WantsNotice(req)
	local can, profKey = Work.CanMake(req)
	if not can then
		return false
	end
	local s = Work.Settings()
	if req.price < (s.minPrice or 0) then
		return false
	end
	if s.allMats and req.mats ~= "all" then
		return false
	end
	if next(s.profs) and not s.profs[profKey] then
		return false
	end
	return true
end

function Work.KnownCrafters(recipe)
	local count, online = 0, 0
	for key, c in pairs(LI.crafters or {}) do
		if key ~= LI.playerKey then
			for _, p in pairs(c.profs) do
				if p.recipes and p.recipes[recipe] then
					count = count + 1
					if LI.Status(key) == "online" then
						online = online + 1
					end
					break
				end
			end
		end
	end
	return count, online
end

function Work.Mine()
	Prune()
	local list = {}
	for _, req in pairs(State().mine) do
		list[#list + 1] = req
	end
	table.sort(list, function(a, b) return a.posted > b.posted end)
	return list
end

function Work.Received(onlyMine)
	Prune()
	local list = {}
	for _, req in pairs(received) do
		if not req.hidden then
			req.canMake = Work.CanMake(req)
			if not onlyMine or Work.WantsNotice(req) then
				list[#list + 1] = req
			end
		end
	end
	table.sort(list, function(a, b)
		if (a.canMake and 1 or 0) ~= (b.canMake and 1 or 0) then
			return a.canMake == true
		end
		return a.heard > b.heard
	end)
	return list
end

function Work.UnseenCount()
	Prune()
	local n = 0
	for key in pairs(unseen) do
		if received[key] and not received[key].hidden then
			n = n + 1
		end
	end
	return n
end

function Work.MarkSeen()
	if next(unseen) then
		unseen = {}
		LI.Fire("WorkSeen")
	end
end

function Work.Post(fields)
	local w = State()
	Prune()
	local open = 0
	for _ in pairs(w.mine) do
		open = open + 1
	end
	if open >= MAX_MINE then
		return nil, "You can have " .. MAX_MINE .. " open requests at a time."
	end
	local recipe = tonumber(fields.recipe)
	local meta = recipe and LI.db.recipes[recipe]
	if not meta then
		return nil, "Pick an item first."
	end
	local qty = math.floor(tonumber(fields.qty) or 1)
	qty = math.max(1, math.min(QTY_MAX, qty))
	local price = math.floor(tonumber(fields.price) or 0)
	price = math.max(0, math.min(PRICE_MAX, price))
	local mats = Work.MATS[fields.mats] and fields.mats or "none"
	local duration = tonumber(fields.duration) or Work.Settings().duration
	duration = math.max(60, math.min(4 * 3600, duration))
	w.seq = w.seq + 1
	local req = {
		id = B36(w.seq),
		owner = LI.playerKey,
		recipe = recipe,
		item = meta.item,
		qty = qty,
		mats = mats,
		price = price,
		note = Clean(fields.note, NOTE_MAX),
		posted = time(),
		expires = time() + duration,
		offers = {},
	}
	w.mine[req.id] = req
	Send(Work.Encode(req), "CHANNEL")
	LI.Fire("WorkChanged")
	return req
end

function Work.Cancel(id)
	local w = State()
	if w.mine[id] then
		w.mine[id] = nil
		Send("X1|" .. id, "CHANNEL")
		LI.Fire("WorkChanged")
		return true
	end
	return false
end

function Work.Hide(key)
	if received[key] then
		received[key].hidden = true
		unseen[key] = nil
		LI.Fire("WorkChanged")
	end
end

function Work.Offer(key)
	local req = received[key]
	if not req or req.offered then
		return false
	end
	req.offered = true
	Send("O1|" .. req.id, "WHISPER", LI.WhisperTarget(req.owner))
	LI.Fire("WorkChanged")
	return true
end

function Work.Get(key)
	return received[key]
end

function Work.OnRequest(owner, parts)
	local req = Work.Decode(owner, parts)
	if not req then
		return
	end
	local old = received[req.key]
	if not old then
		local count, total = 0, 0
		for _, r in pairs(received) do
			total = total + 1
			if r.owner == owner then
				count = count + 1
			end
		end
		if count >= MAX_PER_OWNER or total >= MAX_ALL then
			return
		end
	end
	if old then
		req.hidden, req.offered = old.hidden, old.offered
	end
	received[req.key] = req
	if not seenKeys[req.key] then
		seenKeys[req.key] = true
		if Work.WantsNotice(req) then
			unseen[req.key] = true
			LI.Fire("WorkNew", req)
		end
	end
	LI.Fire("WorkChanged")
end

function Work.OnCancel(owner, parts)
	local key = owner .. ":" .. tostring(parts[2])
	if received[key] then
		received[key] = nil
		unseen[key] = nil
		LI.Fire("WorkChanged")
	end
end

function Work.OnOffer(from, parts)
	local req = State().mine[tostring(parts[2])]
	if not req or req.expires <= time() then
		return
	end
	req.offers = req.offers or {}
	local fresh = not req.offers[from]
	req.offers[from] = time()
	if fresh then
		LI.Fire("WorkOffer", req, from)
	end
	LI.Fire("WorkChanged")
end

local function Resend()
	Prune()
	for _, req in pairs(State().mine) do
		Send(Work.Encode(req), "CHANNEL")
	end
end

LI.Listen("Ready", function()
	State()
	Work.Settings()
	LI.Every(30, function()
		if time() - lastResend >= RESEND_EVERY then
			lastResend = time()
			Resend()
		end
		Prune()
	end)
end)

Work.Resend = Resend
