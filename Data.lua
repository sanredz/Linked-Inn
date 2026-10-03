local ADDON, LI = ...

local LOG_MAX = 40
local FORGET_AFTER = 60 * 86400

LI.PROFESSION_ICONS = {
	alchemy = "Interface\\Icons\\Trade_Alchemy",
	blacksmithing = "Interface\\Icons\\Trade_BlackSmithing",
	enchanting = "Interface\\Icons\\Trade_Engraving",
	engineering = "Interface\\Icons\\Trade_Engineering",
	leatherworking = "Interface\\Icons\\Trade_LeatherWorking",
	tailoring = "Interface\\Icons\\Trade_Tailoring",
	jewelcrafting = "Interface\\Icons\\INV_Misc_Gem_01",
	inscription = "Interface\\Icons\\INV_Inscription_Tradeskill01",
	cooking = "Interface\\Icons\\INV_Misc_Food_15",
	["first aid"] = "Interface\\Icons\\Spell_Holy_SealOfSacrifice",
	fishing = "Interface\\Icons\\Trade_Fishing",
	mining = "Interface\\Icons\\Trade_Mining",
	herbalism = "Interface\\Icons\\Trade_Herbalism",
	skinning = "Interface\\Icons\\INV_Misc_Pelt_Wolf_01",
}

LI.PROFESSION_ORDER = {
	"alchemy", "blacksmithing", "enchanting", "engineering", "leatherworking",
	"tailoring", "jewelcrafting", "inscription", "cooking", "first aid",
}

LI.KINDS = {
	{ key = "all", name = "Any item" },
	{ key = "armor", name = "Armor" },
	{ key = "weapon", name = "Weapons" },
	{ key = "consumable", name = "Potions and food" },
	{ key = "bag", name = "Bags" },
	{ key = "tradegoods", name = "Trade goods" },
	{ key = "enchant", name = "Enchants" },
	{ key = "other", name = "Other" },
}

local KIND_BY_CLASS = { [0] = "consumable", [1] = "bag", [2] = "weapon", [4] = "armor", [7] = "tradegoods" }

local DEFAULTS = {
	autoRead = true,
	onlineOnly = false,
	kind = "all",
	minimap = { angle = 200 },
}

local function NewTest()
	return {
		links = 0,
		auto = { tries = 0, ok = 0, timeout = 0, err = 0, flashed = 0, streak = 0 },
		click = 0,
		own = 0,
		formats = {},
	}
end

function LI.ProfKey(name)
	if type(name) ~= "string" then
		return nil
	end
	local key = LI.Trim(name):lower()
	if key == "" then
		return nil
	end
	return key
end

function LI.ProfIcon(key, fallback)
	return fallback or LI.PROFESSION_ICONS[key] or "Interface\\Icons\\INV_Misc_QuestionMark"
end

function LI.KindOf(itemID, profKey)
	if itemID then
		local getInstant = (C_Item and C_Item.GetItemInfoInstant) or GetItemInfoInstant
		local classID = select(6, LI.Try(getInstant, itemID))
		classID = LI.Safe(classID)
		if classID and KIND_BY_CLASS[classID] then
			return KIND_BY_CLASS[classID]
		end
		return "other"
	end
	if profKey == "enchanting" then
		return "enchant"
	end
	return "other"
end

function LI.Log(msg)
	if not LI.db then
		return
	end
	local log = LI.db.log
	log[#log + 1] = { t = time(), m = tostring(msg) }
	while #log > LOG_MAX do
		table.remove(log, 1)
	end
	LI.Fire("TestChanged")
end

local function Prune(crafters)
	local now = time()
	for key, c in pairs(crafters) do
		if type(c) ~= "table" or type(c.profs) ~= "table" or (now - (c.seen or 0)) > FORGET_AFTER then
			crafters[key] = nil
		end
	end
end

LI.On("ADDON_LOADED", function(name)
	if name ~= ADDON then
		return
	end
	local db = type(LinkedInnDB) == "table" and LinkedInnDB or {}
	LinkedInnDB = db
	db.realms = type(db.realms) == "table" and db.realms or {}
	db.recipes = type(db.recipes) == "table" and db.recipes or {}
	db.settings = type(db.settings) == "table" and db.settings or {}
	for k, v in pairs(DEFAULTS) do
		if db.settings[k] == nil then
			db.settings[k] = LI.Copy(v)
		end
	end
	db.test = type(db.test) == "table" and db.test or NewTest()
	db.log = type(db.log) == "table" and db.log or {}
	LI.db = db
	LI.settings = db.settings
	LI.test = db.test
end)

LI.On("PLAYER_LOGIN", function()
	if not LI.db then
		return
	end
	LI.realm = LI.RealmName()
	LI.playerKey = LI.PlayerKey()
	local realms = LI.db.realms
	realms[LI.realm] = type(realms[LI.realm]) == "table" and realms[LI.realm] or {}
	local realm = realms[LI.realm]
	realm.crafters = type(realm.crafters) == "table" and realm.crafters or {}
	LI.crafters = realm.crafters
	Prune(LI.crafters)
	LI.guids = {}
	for key, c in pairs(LI.crafters) do
		if c.guid then
			LI.guids[c.guid] = key
		end
	end
	LI.ready = true
	LI.Fire("Ready")
end)

function LI.Crafter(key, create)
	if not LI.crafters or not key then
		return nil
	end
	local c = LI.crafters[key]
	if not c and create then
		c = { profs = {}, seen = time() }
		LI.crafters[key] = c
	end
	return c
end

function LI.NoteProfession(key, info)
	if not LI.ready or not key or not info then
		return false
	end
	local profKey = LI.ProfKey(info.name)
	if not profKey then
		return false
	end
	local c = LI.Crafter(key, true)
	local now = time()
	c.seen = now
	c.where = info.where or c.where
	c.class = info.class or c.class
	if info.guid then
		c.guid = info.guid
		LI.guids[info.guid] = key
	end
	local p = c.profs[profKey]
	local isNew = p == nil
	if isNew then
		p = {}
		c.profs[profKey] = p
	end
	p.name = info.name
	p.icon = info.icon or p.icon
	p.link = info.link or p.link
	p.text = info.text or p.text
	p.linked = now
	LI.Fire("CraftersChanged")
	return isNew
end

function LI.SetRecipes(key, info, recipes, via)
	if not LI.ready or not key or not info then
		return 0
	end
	local profKey = LI.ProfKey(info.name)
	if not profKey then
		return 0
	end
	local c = LI.Crafter(key, true)
	local now = time()
	c.seen = math.max(c.seen or 0, now)
	c.class = info.class or c.class
	local p = c.profs[profKey] or {}
	c.profs[profKey] = p
	p.name = info.name
	p.icon = info.icon or p.icon
	p.rank = info.rank or p.rank
	p.max = info.max or p.max
	p.read = now
	p.via = via
	p.link = info.link or p.link
	p.text = info.text or p.text
	local set, count = {}, 0
	for _, r in ipairs(recipes) do
		if r.id and not set[r.id] then
			set[r.id] = true
			count = count + 1
			local meta = LI.db.recipes[r.id] or {}
			LI.db.recipes[r.id] = meta
			meta.n = r.name or meta.n
			meta.i = r.icon or meta.i
			meta.item = r.item or meta.item
			meta.p = profKey
			meta.k = r.kind or meta.k or LI.KindOf(meta.item, profKey)
		end
	end
	p.recipes = set
	p.count = count
	LI.Fire("CraftersChanged")
	return count
end

function LI.Forget(key)
	if LI.crafters and key then
		local c = LI.crafters[key]
		if c and c.guid and LI.guids then
			LI.guids[c.guid] = nil
		end
		LI.crafters[key] = nil
		LI.Fire("CraftersChanged")
	end
end

function LI.ResetTest()
	if LI.db then
		LI.db.test = NewTest()
		LI.test = LI.db.test
		LI.db.log = {}
		LI.Fire("TestChanged")
	end
end

local function Find(haystack, needle)
	return type(haystack) == "string" and haystack:lower():find(needle, 1, true) ~= nil
end

local function KindMatch(meta, kind)
	return kind == nil or kind == "all" or meta.k == kind
end

function LI.Search(query, opts)
	opts = opts or {}
	local out = {}
	if not LI.ready then
		return out
	end
	local q = LI.Trim(query):lower()
	local kind = opts.kind or "all"
	local profFilter = opts.prof
	local recipeSearch = q ~= "" or kind ~= "all"
	local hits, hitCount, hitProfs = {}, 0, {}
	if recipeSearch then
		for id, meta in pairs(LI.db.recipes) do
			if KindMatch(meta, kind) and (q == "" or Find(meta.n, q)) then
				hits[id] = meta
				hitCount = hitCount + 1
				if meta.p then
					hitProfs[meta.p] = true
				end
			end
		end
	end
	for key, c in pairs(LI.crafters) do
		local status, seenAt = LI.Status(key)
		if (not opts.onlineOnly or status == "online") and (not profFilter or c.profs[profFilter]) then
			local best, bestMeta, makes, confidence = nil, nil, 0, 0
			local nameMatch = q ~= "" and Find(LI.ShortName(key), q)
			local profMatch, maybe = false, false
			for profKey, p in pairs(c.profs) do
				if not profFilter or profFilter == profKey then
					if q ~= "" and Find(p.name, q) then
						profMatch = true
					end
					if recipeSearch and hitCount > 0 then
						if p.recipes then
							for id in pairs(p.recipes) do
								local meta = hits[id]
								if meta then
									makes = makes + 1
									if not bestMeta or (meta.n or "") < (bestMeta.n or "") then
										best, bestMeta = id, meta
									end
								end
							end
						elseif hitProfs[profKey] then
							maybe = true
						end
					end
				end
			end
			if makes > 0 then
				confidence = 3
			elseif (profMatch or nameMatch) and kind == "all" then
				confidence = 2
			elseif maybe then
				confidence = 1
			elseif not recipeSearch then
				confidence = 2
			end
			if confidence > 0 then
				out[#out + 1] = {
					key = key,
					crafter = c,
					status = status,
					seenAt = seenAt,
					recipe = best,
					recipeMeta = bestMeta,
					makes = makes,
					confidence = confidence,
				}
			end
		end
	end
	local RANK = { online = 0, recent = 1, offline = 2 }
	table.sort(out, function(a, b)
		local ra, rb = RANK[a.status] or 3, RANK[b.status] or 3
		if ra ~= rb then
			return ra < rb
		end
		if a.confidence ~= b.confidence then
			return a.confidence > b.confidence
		end
		local sa, sb = a.seenAt or 0, b.seenAt or 0
		if sa ~= sb then
			return sa > sb
		end
		return a.key < b.key
	end)
	return out
end

function LI.ProfessionsSeen()
	local counts = {}
	if LI.crafters then
		for _, c in pairs(LI.crafters) do
			for profKey, p in pairs(c.profs) do
				local entry = counts[profKey]
				if not entry then
					entry = { key = profKey, name = p.name, icon = p.icon, count = 0 }
					counts[profKey] = entry
				end
				entry.count = entry.count + 1
				entry.icon = entry.icon or p.icon
			end
		end
	end
	local list, used = {}, {}
	for _, key in ipairs(LI.PROFESSION_ORDER) do
		if counts[key] then
			list[#list + 1] = counts[key]
			used[key] = true
		end
	end
	local rest = {}
	for key, entry in pairs(counts) do
		if not used[key] then
			rest[#rest + 1] = entry
		end
	end
	table.sort(rest, function(a, b) return a.key < b.key end)
	for _, entry in ipairs(rest) do
		list[#list + 1] = entry
	end
	return list
end
