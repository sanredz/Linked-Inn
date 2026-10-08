local ADDON, LI = ...

local LOG_MAX = 300

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
	"tailoring", "jewelcrafting", "inscription", "cooking", "first aid", "fishing",
}

if LI.RETAIL then
	LI.PRIMARY = { "alchemy", "blacksmithing", "enchanting", "engineering", "inscription", "jewelcrafting", "leatherworking", "tailoring" }
	LI.SECONDARY = { "cooking" }
	LI.SECONDARY_SET = { cooking = true }
else
	LI.PRIMARY = { "alchemy", "blacksmithing", "enchanting", "engineering", "leatherworking", "tailoring" }
	LI.SECONDARY = { "cooking", "first aid", "fishing" }
	LI.SECONDARY_SET = { cooking = true, ["first aid"] = true, fishing = true }
end
LI.GATHERING = { mining = true, herbalism = true, skinning = true }

LI.LINE_KEYS = {
	[171] = "alchemy", [164] = "blacksmithing", [333] = "enchanting", [202] = "engineering",
	[773] = "inscription", [755] = "jewelcrafting", [165] = "leatherworking", [197] = "tailoring",
	[185] = "cooking", [129] = "first aid", [356] = "fishing",
	[186] = "mining", [182] = "herbalism", [393] = "skinning",
}

local CHILD_LINES = {
	alchemy = { 2478, 2479, 2480, 2481, 2482, 2483, 2484, 2485, 2750, 2823, 2871, 2906 },
	blacksmithing = { 2437, 2454, 2472, 2473, 2474, 2475, 2476, 2477, 2751, 2822, 2872, 2907 },
	enchanting = { 2486, 2487, 2488, 2489, 2491, 2492, 2493, 2494, 2753, 2825, 2874, 2909 },
	engineering = { 2499, 2500, 2501, 2502, 2503, 2504, 2505, 2506, 2755, 2827, 2875, 2910 },
	inscription = { 2507, 2508, 2509, 2510, 2511, 2512, 2513, 2514, 2756, 2828, 2878, 2913 },
	jewelcrafting = { 2517, 2518, 2519, 2520, 2521, 2522, 2523, 2524, 2757, 2829, 2879, 2914 },
	leatherworking = { 2525, 2526, 2527, 2528, 2529, 2530, 2531, 2532, 2758, 2830, 2880, 2915 },
	tailoring = { 2533, 2534, 2535, 2536, 2537, 2538, 2539, 2540, 2759, 2831, 2883, 2918 },
	cooking = { 981, 982, 2541, 2542, 2543, 2544, 2545, 2546, 2547, 2548, 2752, 2824, 2873, 2908 },
	fishing = { 2585, 2586, 2587, 2588, 2589, 2590, 2591, 2592, 2754, 2826, 2876, 2911 },
	mining = { 2565, 2566, 2567, 2568, 2569, 2570, 2571, 2572, 2761, 2833, 2881, 2916 },
	herbalism = { 2549, 2550, 2551, 2552, 2553, 2554, 2555, 2556, 2760, 2832, 2877, 2912 },
	skinning = { 2557, 2558, 2559, 2560, 2561, 2562, 2563, 2564, 2762, 2834, 2882, 2917 },
}
for key, lines in pairs(CHILD_LINES) do
	for _, line in ipairs(lines) do
		LI.LINE_KEYS[line] = LI.LINE_KEYS[line] or key
	end
end

LI.PROFESSION_NAMES = {
	alchemy = "Alchemy",
	blacksmithing = "Blacksmithing",
	enchanting = "Enchanting",
	engineering = "Engineering",
	leatherworking = "Leatherworking",
	tailoring = "Tailoring",
	jewelcrafting = "Jewelcrafting",
	inscription = "Inscription",
	cooking = "Cooking",
	["first aid"] = "First Aid",
	fishing = "Fishing",
	mining = "Mining",
	herbalism = "Herbalism",
	skinning = "Skinning",
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

local PROF_LINKS = {
	alchemy = { 2259, 171 },
	blacksmithing = { 2018, 164 },
	enchanting = { 7411, 333 },
	engineering = { 4036, 202 },
	leatherworking = { 2108, 165 },
	tailoring = { 3908, 197 },
	cooking = { 2550, 185 },
	["first aid"] = { 3273, 129 },
}
if LI.RETAIL then
	PROF_LINKS["first aid"] = nil
	PROF_LINKS.inscription = { 45357, 773 }
	PROF_LINKS.jewelcrafting = { 25229, 755 }
end

local DEFAULTS = {
	autoRead = true,
	readChat = true,
	readNearby = true,
	secondary = false,
	maxOnly = false,
	minSkill = 0,
	compact = true,
	profs = {},
	kind = "all",
	minimap = { angle = 200 },
	showMinimap = true,
	cityScan = true,
	cityEvery = 5,
	forgetDays = 60,
	hideLinks = false,
	keepSkill = 0,
	housekeeping = "off",
	guildOnly = false,
	collapsed = {},
}

local function NewTest()
	return {
		links = 0,
		auto = { tries = 0, ok = 0, timeout = 0, err = 0, flashed = 0, streak = 0 },
		click = 0,
		own = 0,
		formats = {},
		sync = { sent = 0, heard = 0, lists = 0, answered = 0 },
		built = { tries = 0, ok = 0, timeout = 0 },
	}
end

local localKeys

local function LocalKeys()
	if localKeys then
		return localKeys
	end
	local api = C_TradeSkillUI
	if not api or not api.GetTradeSkillDisplayName then
		return nil
	end
	local found = {}
	local any = false
	for line, key in pairs(LI.LINE_KEYS) do
		local name = LI.Safe(LI.Try(api.GetTradeSkillDisplayName, line))
		if type(name) == "string" and name ~= "" then
			found[name:lower()] = key
			any = true
		end
	end
	if any then
		localKeys = found
	end
	return found
end

function LI.ProfKey(name)
	if type(name) ~= "string" then
		return nil
	end
	local key = LI.Trim(name):lower()
	if key == "" then
		return nil
	end
	local known = LocalKeys()
	return known and known[key] or key
end

local BASE_LINES = {
	alchemy = 171, blacksmithing = 164, enchanting = 333, engineering = 202, inscription = 773,
	jewelcrafting = 755, leatherworking = 165, tailoring = 197, cooking = 185, ["first aid"] = 129,
	fishing = 356, mining = 186, herbalism = 182, skinning = 393,
}

function LI.ProfessionDisplayName(profKey)
	local api = C_TradeSkillUI
	local line = BASE_LINES[profKey or ""]
	local name = line and api and api.GetTradeSkillDisplayName and LI.Safe(LI.Try(api.GetTradeSkillDisplayName, line))
	if type(name) == "string" and name ~= "" then
		return name
	end
	return LI.PROFESSION_NAMES[profKey or ""]
end

function LI.ProfKeyForLine(line)
	line = tonumber(line)
	if not line then
		return nil
	end
	local key = LI.LINE_KEYS[line]
	if key ~= nil then
		return key or nil
	end
	local api = C_TradeSkillUI
	local info = api and api.GetProfessionInfoBySkillLineID and LI.Try(api.GetProfessionInfoBySkillLineID, line)
	local parent = type(info) == "table" and LI.Safe(info.parentProfessionID)
	key = type(parent) == "number" and LI.LINE_KEYS[parent] or nil
	LI.LINE_KEYS[line] = key or false
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

local LOW_FOR = 7 * 86400

function LI.TooLow(key, rank, min)
	min = min or tonumber(LI.settings and LI.settings.keepSkill) or 0
	return min > 0 and type(rank) == "number" and rank < min and key ~= LI.playerKey and not (LI.favorites and LI.favorites[key])
end

function LI.IsLow(key, profKey)
	local mark = LI.low and key and profKey and LI.low[key .. "|" .. profKey]
	return type(mark) == "table" and time() - (mark.t or 0) < LOW_FOR and LI.TooLow(key, mark.r)
end

local function DropLow(key, c, min)
	local dropped = 0
	for profKey, p in pairs(c.profs) do
		if type(p) == "table" and LI.TooLow(key, p.rank, min) then
			c.profs[profKey] = nil
			if LI.low then
				LI.low[key .. "|" .. profKey] = { t = time(), r = p.rank }
			end
			dropped = dropped + 1
		end
	end
	if dropped > 0 and next(c.profs) == nil then
		LI.crafters[key] = nil
	end
	return dropped
end

function LI.TrimLow(key)
	local c = LI.crafters and LI.crafters[key]
	if type(c) ~= "table" or type(c.profs) ~= "table" then
		return 0
	end
	return DropLow(key, c)
end

function LI.CountBelow(min)
	local count = 0
	for key, c in pairs(LI.crafters or {}) do
		if type(c) == "table" and type(c.profs) == "table" then
			for _, p in pairs(c.profs) do
				if type(p) == "table" and LI.TooLow(key, p.rank, min) then
					count = count + 1
					break
				end
			end
		end
	end
	return count
end

function LI.ForgetBelow(min)
	local touched = 0
	for key, c in pairs(LI.crafters or {}) do
		if type(c) == "table" and type(c.profs) == "table" and DropLow(key, c, min) > 0 then
			touched = touched + 1
		end
	end
	if touched > 0 then
		LI.Log(string.format("Forgot professions below skill %d from %d crafters", min, touched))
		LI.Fire("CraftersChanged")
	end
	return touched
end

LI.HOUSEKEEPING = {
	{ key = "off", name = "Off" },
	{ key = "light", name = "Light", keep = 100, days = 7, rare = 5 },
	{ key = "balanced", name = "Balanced", keep = 75, days = 2, rare = 3 },
	{ key = "strict", name = "Strict", keep = 50, days = 0, rare = 2 },
}

function LI.HousekeepingMode(key)
	for i, mode in ipairs(LI.HOUSEKEEPING) do
		if mode.key == key then
			return mode, i
		end
	end
	return LI.HOUSEKEEPING[1], 1
end

local function Protected(key)
	local c = LI.crafters and LI.crafters[key]
	return key == LI.playerKey or (c and c.li) or (LI.favorites and LI.favorites[key]) or (LI.InCircle and LI.InCircle(key))
end

function LI.Housekeep(modeKey, dry)
	local mode = LI.HousekeepingMode(modeKey or (LI.settings and LI.settings.housekeeping))
	if not mode.keep or not LI.crafters or (not dry and LI.settings.guildOnly) then
		return 0, 0
	end
	local now = time()
	local pools = {}
	for key, c in pairs(LI.crafters) do
		if type(c) == "table" and type(c.profs) == "table" then
			for profKey, p in pairs(c.profs) do
				if type(p) == "table" and (type(p.recipes) == "table" or type(p.recipes) == "string") then
					pools[profKey] = pools[profKey] or {}
					table.insert(pools[profKey], { key = key, c = c, p = p, ids = LI.RecipeList(p, profKey) })
				end
			end
		end
	end
	local removed, touched = 0, {}
	for profKey, pool in pairs(pools) do
		if #pool > mode.keep then
			local holders = {}
			for _, e in ipairs(pool) do
				for _, id in ipairs(e.ids) do
					holders[id] = (holders[id] or 0) + 1
				end
			end
			table.sort(pool, function(a, b)
				local ra, rb = a.p.rank or 0, b.p.rank or 0
				if ra ~= rb then
					return ra > rb
				end
				return (a.c.seen or 0) > (b.c.seen or 0)
			end)
			for i = #pool, mode.keep + 1, -1 do
				local e = pool[i]
				local old = mode.days == 0 or now - (e.c.seen or 0) > mode.days * 86400
				local rare = false
				for _, id in ipairs(e.ids) do
					if holders[id] - 1 < mode.rare then
						rare = true
						break
					end
				end
				if old and not rare and not Protected(e.key) then
					for _, id in ipairs(e.ids) do
						holders[id] = holders[id] - 1
					end
					removed = removed + 1
					touched[e.key] = true
					if not dry then
						e.c.profs[profKey] = nil
					end
				end
			end
		end
	end
	local crafters = 0
	for key in pairs(touched) do
		crafters = crafters + 1
		local c = LI.crafters[key]
		if not dry and c and next(c.profs) == nil then
			LI.crafters[key] = nil
		end
	end
	if not dry then
		LI.db.housekept = { at = now, removed = removed, mode = mode.key }
		if removed > 0 then
			LI.Log(string.format("Housekeeping (%s): put away %d %s from %d %s", mode.name, removed, removed == 1 and "profession" or "professions", crafters, crafters == 1 and "crafter" or "crafters"))
			LI.Fire("CraftersChanged")
		end
	end
	return removed, crafters
end

local function Prune(crafters, favorites)
	if LI.settings and LI.settings.guildOnly then
		return 0
	end
	local now = time()
	local days = tonumber(LI.settings and LI.settings.forgetDays) or 60
	local forget = days > 0 and days * 86400 or nil
	local removed = 0
	for key, c in pairs(crafters) do
		if type(c) ~= "table" or type(c.profs) ~= "table" or (forget and not favorites[key] and (now - (c.seen or 0)) > forget) then
			crafters[key] = nil
			removed = removed + 1
		end
	end
	return removed
end

function LI.PruneNow()
	if not LI.crafters then
		return 0
	end
	local removed = Prune(LI.crafters, LI.favorites)
	if removed > 0 then
		LI.Fire("CraftersChanged")
	end
	return removed
end

function LI.ForgetEveryone()
	if not LI.crafters then
		return
	end
	for key in pairs(LI.crafters) do
		if key ~= LI.playerKey then
			LI.crafters[key] = nil
		end
	end
	for key in pairs(LI.favorites) do
		LI.favorites[key] = nil
	end
	for key in pairs(LI.waiting) do
		LI.waiting[key] = nil
	end
	for key in pairs(LI.tried) do
		LI.tried[key] = nil
	end
	LI.guids = {}
	LI.Log("Forgot everyone on the list")
	LI.Fire("CraftersChanged")
end

LI.On("ADDON_LOADED", function(name)
	if name ~= ADDON then
		return
	end
	local db = type(LinkedInnDB) == "table" and LinkedInnDB or {}
	LinkedInnDB = db
	db.realms = type(db.realms) == "table" and db.realms or {}
	db.recipes = type(db.recipes) == "table" and db.recipes or {}
	db.cats = type(db.cats) == "table" and db.cats or {}
	db.slots = type(db.slots) == "table" and db.slots or {}
	db.profLinks = type(db.profLinks) == "table" and db.profLinks or {}
	for profKey, nums in pairs(PROF_LINKS) do
		if type(db.profLinks[profKey]) ~= "table" then
			db.profLinks[profKey] = { spell = nums[1], line = nums[2], default = true }
		end
	end
	db.settings = type(db.settings) == "table" and db.settings or {}
	if db.settings.autoRead == false and db.settings.readChat == nil and db.settings.readNearby == nil then
		db.settings.readChat = false
		db.settings.readNearby = false
		db.settings.autoRead = true
	end
	for k, v in pairs(DEFAULTS) do
		if db.settings[k] == nil then
			db.settings[k] = LI.Copy(v)
		end
	end
	db.test = type(db.test) == "table" and db.test or NewTest()
	for k, v in pairs(NewTest()) do
		if db.test[k] == nil then
			db.test[k] = v
		end
	end
	db.log = type(db.log) == "table" and db.log or {}
	LI.db = db
	LI.settings = db.settings
	LI.test = db.test
end)

function LI.StorageRealm()
	local own = LI.RealmName()
	if not LI.RETAIL or not GetAutoCompleteRealms then
		return own
	end
	local list = LI.Try(GetAutoCompleteRealms)
	if type(list) ~= "table" then
		return own
	end
	local names = {}
	for _, name in ipairs(list) do
		name = LI.Safe(name)
		if type(name) == "string" and name ~= "" then
			names[#names + 1] = (name:gsub("[%s%-]", ""))
		end
	end
	if #names == 0 then
		return own
	end
	table.sort(names)
	return names[1]
end

LI.On("PLAYER_LOGIN", function()
	if not LI.db then
		return
	end
	LI.realm = LI.StorageRealm()
	LI.playerKey = LI.PlayerKey()
	local realms = LI.db.realms
	realms[LI.realm] = type(realms[LI.realm]) == "table" and realms[LI.realm] or {}
	local realm = realms[LI.realm]
	realm.crafters = type(realm.crafters) == "table" and realm.crafters or {}
	realm.favorites = type(realm.favorites) == "table" and realm.favorites or {}
	realm.waiting = type(realm.waiting) == "table" and realm.waiting or {}
	realm.tried = type(realm.tried) == "table" and realm.tried or {}
	realm.low = type(realm.low) == "table" and realm.low or {}
	local own = LI.RealmName()
	local single = own ~= LI.realm and realms[own]
	if type(single) == "table" then
		for _, field in ipairs({ "crafters", "favorites", "waiting", "tried", "low" }) do
			for k, v in pairs(type(single[field]) == "table" and single[field] or {}) do
				if realm[field][k] == nil then
					realm[field][k] = v
				end
			end
		end
		realms[own] = nil
	end
	LI.db.settings.profs = {}
	LI.db.settings.liOnly = false
	LI.crafters = realm.crafters
	LI.favorites = realm.favorites
	LI.waiting = realm.waiting
	LI.tried = realm.tried
	LI.low = realm.low
	for id, mark in pairs(LI.low) do
		if type(mark) ~= "table" or type(mark.t) ~= "number" or time() - mark.t > LOW_FOR then
			LI.low[id] = nil
		end
	end
	if LI.db.triedRound ~= 4 then
		LI.db.triedRound = 4
		for key in pairs(LI.tried) do
			LI.tried[key] = nil
		end
	end
	for key, at in pairs(LI.tried) do
		if type(at) ~= "number" or time() - at > 7 * 86400 then
			LI.tried[key] = nil
		end
	end
	Prune(LI.crafters, LI.favorites)
	LI.guids = {}
	for key, c in pairs(LI.crafters) do
		if c.guid then
			LI.guids[c.guid] = key
		end
	end
	LI.ready = true
	LI.readyAt = GetTime and GetTime() or 0
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
	local profKey = info.key or LI.ProfKey(info.name)
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

local B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
local B64_VALUE = {}
for i = 1, #B64 do
	B64_VALUE[B64:byte(i)] = i - 1
end
local BIT = { 1, 2, 4, 8, 16, 32 }
local slotIndex = {}

local function Slots(profKey)
	local all = LI.db.slots
	local list = all[profKey]
	if type(list) ~= "table" then
		list = {}
		all[profKey] = list
		slotIndex[profKey] = nil
	end
	local index = slotIndex[profKey]
	if not index then
		index = {}
		for slot, id in ipairs(list) do
			index[id] = slot
		end
		slotIndex[profKey] = index
	end
	return list, index
end

function LI.PackRecipes(profKey, set)
	local list, index = Slots(profKey)
	local values, top = {}, 0
	for id in pairs(set) do
		local slot = index[id]
		if not slot then
			list[#list + 1] = id
			slot = #list
			index[id] = slot
		end
		local at = math.floor((slot - 1) / 6) + 1
		for k = top + 1, at do
			values[k] = 0
		end
		top = math.max(top, at)
		values[at] = values[at] + BIT[(slot - 1) % 6 + 1]
	end
	local chars = {}
	for k = 1, top do
		chars[k] = B64:sub(values[k] + 1, values[k] + 1)
	end
	return table.concat(chars)
end

function LI.KnowsRecipe(p, profKey, id)
	local r = p and p.recipes
	if type(r) == "table" then
		return r[id] == true
	end
	if type(r) ~= "string" or not id then
		return false
	end
	local _, index = Slots(profKey)
	local slot = index[id]
	if not slot then
		return false
	end
	local at = math.floor((slot - 1) / 6) + 1
	local value = B64_VALUE[r:byte(at) or 0]
	return value ~= nil and math.floor(value / BIT[(slot - 1) % 6 + 1]) % 2 == 1
end

function LI.RecipeList(p, profKey)
	local r = p and p.recipes
	local out = {}
	if type(r) == "table" then
		for id in pairs(r) do
			out[#out + 1] = id
		end
	elseif type(r) == "string" then
		local list = Slots(profKey)
		for at = 1, #r do
			local value = B64_VALUE[r:byte(at)] or 0
			if value > 0 then
				for b = 1, 6 do
					if math.floor(value / BIT[b]) % 2 == 1 then
						local id = list[(at - 1) * 6 + b]
						if id then
							out[#out + 1] = id
						end
					end
				end
			end
		end
	end
	return out
end

function LI.SetRecipes(key, info, recipes, via)
	if not LI.ready or not key or not info then
		return 0
	end
	local profKey = info.key or LI.ProfKey(info.name)
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
	p.tier = info.tier or p.tier
	p.tiers = info.tiers or p.tiers
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
			meta.c = r.cat or meta.c
			meta.r = r.reagents or meta.r
		end
	end
	p.recipes = LI.RETAIL and LI.PackRecipes(profKey, set) or set
	p.count = count
	if LI.TooLow(key, p.rank) then
		LI.Log(string.format("Skipped %s's %s (skill %d, below %d)", LI.ShortName(key), info.name, p.rank, LI.settings.keepSkill))
		DropLow(key, c)
	end
	LI.Fire("CraftersChanged")
	return count
end

LI.idOf = {}
local idCount = 0

function LI.NoteGuid(key, guid)
	if not key or key == LI.playerKey or type(guid) ~= "string" or not guid:find("^Player%-") then
		return
	end
	if LI.idOf[key] == guid then
		return
	end
	if not LI.idOf[key] then
		idCount = idCount + 1
		if idCount > 5000 then
			LI.idOf, idCount = {}, 1
		end
	end
	LI.idOf[key] = guid
	local c = LI.crafters and LI.crafters[key]
	if c and not c.guid then
		c.guid = guid
		LI.guids[guid] = key
	end
	LI.Fire("GuidFound", key, guid)
end

function LI.GuidOf(key)
	local c = LI.crafters and LI.crafters[key]
	return (c and c.guid) or LI.idOf[key]
end

function LI.IsFavorite(key)
	return LI.favorites ~= nil and key ~= nil and LI.favorites[key] == true
end

function LI.ToggleFavorite(key)
	if not LI.favorites or not key then
		return false
	end
	LI.favorites[key] = not LI.favorites[key] or nil
	LI.Fire("CraftersChanged")
	return LI.favorites[key] == true
end

local itemIndex, itemIndexSize = nil, -1

function LI.RecipeForItem(itemID)
	local size = 0
	for _ in pairs(LI.db.recipes) do
		size = size + 1
	end
	if not itemIndex or size ~= itemIndexSize then
		itemIndex, itemIndexSize = {}, size
		for id, meta in pairs(LI.db.recipes) do
			if meta.item then
				itemIndex[meta.item] = id
			end
		end
	end
	return itemIndex[itemID]
end

function LI.ProfessionOfRecipe(recipeID)
	local meta = LI.db.recipes[recipeID]
	if meta and meta.p then
		return meta.p
	end
	local api = C_TradeSkillUI
	if api and api.GetProfessionInfoByRecipeID then
		local info = LI.Try(api.GetProfessionInfoByRecipeID, recipeID)
		local name = type(info) == "table" and LI.Safe(info.parentProfessionName or info.professionName)
		return LI.ProfKey(name)
	end
	return nil
end

function LI.NoteProfLink(profKey, numbers)
	if profKey and type(numbers) == "table" and #numbers >= 2 then
		LI.db.profLinks[profKey] = { spell = numbers[1], line = numbers[#numbers] }
	end
end

function LI.BuildLink(guid, profKey)
	local known = LI.db.profLinks[profKey]
	if type(guid) ~= "string" or not guid:find("^Player%-") or not known then
		return nil
	end
	local base = PROF_LINKS[profKey]
	local spell = base and base[2] == known.line and base[1] or known.spell
	return string.format("trade:%s:%d:%d", guid, spell, known.line)
end

function LI.Reagents(recipeID)
	local api = C_TradeSkillUI
	if not api or not api.GetRecipeSchematic then
		return nil
	end
	local schematic = LI.Try(api.GetRecipeSchematic, recipeID, false)
	if type(schematic) ~= "table" or type(schematic.reagentSlotSchematics) ~= "table" then
		return nil
	end
	local parts = {}
	for _, slot in ipairs(schematic.reagentSlotSchematics) do
		local basic = slot.reagentType == nil or slot.reagentType == 1 or slot.required == true
		local reagent = type(slot.reagents) == "table" and slot.reagents[1]
		local itemID = reagent and LI.Safe(reagent.itemID)
		local qty = LI.Safe(slot.quantityRequired)
		if basic and type(itemID) == "number" and type(qty) == "number" and qty > 0 then
			parts[#parts + 1] = itemID .. ":" .. qty
		end
	end
	if #parts == 0 then
		return nil
	end
	return table.concat(parts, ";")
end

function LI.ParseReagents(text)
	local out = {}
	if type(text) ~= "string" then
		return out
	end
	for id, qty in text:gmatch("(%d+):(%d+)") do
		out[#out + 1] = { id = tonumber(id), qty = tonumber(qty) }
	end
	return out
end

function LI.NoteCategory(catID)
	local api = C_TradeSkillUI
	if type(catID) ~= "number" or not api or not api.GetCategoryInfo then
		return
	end
	local known = LI.db.cats[catID]
	if known and known.n then
		return
	end
	local info = LI.Try(api.GetCategoryInfo, catID)
	if type(info) == "table" and LI.Safe(info.name) then
		LI.db.cats[catID] = { n = LI.Safe(info.name), o = LI.Safe(info.uiOrder) or 0 }
	end
end

function LI.FillRecipe(recipeID)
	local meta = LI.db.recipes[recipeID]
	if not meta then
		return nil
	end
	if not meta.r then
		meta.r = LI.Reagents(recipeID)
	end
	if not meta.c and C_TradeSkillUI and C_TradeSkillUI.GetRecipeInfo then
		local info = LI.Try(C_TradeSkillUI.GetRecipeInfo, recipeID)
		local cat = type(info) == "table" and LI.Safe(info.categoryID)
		if type(cat) == "number" then
			meta.c = cat
			LI.NoteCategory(cat)
		end
	end
	return meta
end

function LI.Forget(key)
	if LI.favorites and key then
		LI.favorites[key] = nil
	end
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

function LI.SkillCaps()
	local caps = {}
	for _, c in pairs(LI.crafters or {}) do
		for profKey, p in pairs(c.profs) do
			local top = math.max(p.max or 0, p.rank or 0)
			if top > (caps[profKey] or 0) then
				caps[profKey] = top
			end
		end
	end
	return caps
end

local STATUS_RANK = { online = 0, recent = 1, offline = 2 }

function LI.StatusRank(status, sure)
	local rank = STATUS_RANK[status] or 3
	if status == "offline" and sure then
		rank = rank + 1
	end
	return rank
end

function LI.Search(query, opts)
	opts = opts or {}
	local out = {}
	if not LI.ready then
		return out
	end
	local q = LI.Trim(query):lower()
	local kind = opts.kind or "all"
	local profSet
	for profKey, on in pairs(opts.profs or {}) do
		if on and (opts.secondary or not LI.SECONDARY_SET[profKey]) then
			profSet = profSet or {}
			profSet[profKey] = true
		end
	end
	local function Allowed(profKey)
		if not opts.secondary and LI.SECONDARY_SET[profKey] then
			return false
		end
		return not profSet or profSet[profKey] == true
	end
	local caps = opts.maxOnly and LI.SkillCaps() or nil
	local minSkill = tonumber(opts.minSkill) or 0
	local function Maxed(profKey, p)
		if caps and LI.RETAIL then
			return (p.max or 0) > 0 and (p.rank or 0) >= p.max
		end
		if caps then
			local cap = caps[profKey] or 0
			return cap > 0 and (p.rank or 0) >= cap
		end
		return minSkill <= 0 or (p.rank or 0) >= minSkill
	end
	local recipeSearch = q ~= "" or kind ~= "all"
	local hits, hitCount, hitsByProf, orphans = {}, 0, {}, false
	if recipeSearch then
		for id, meta in pairs(LI.db.recipes) do
			if KindMatch(meta, kind) and (q == "" or Find(meta.n, q)) then
				hits[id] = meta
				hitCount = hitCount + 1
				if meta.p then
					local list = hitsByProf[meta.p] or {}
					hitsByProf[meta.p] = list
					list[#list + 1] = id
				else
					orphans = true
				end
			end
		end
	end
	for key, c in pairs(LI.crafters) do
		local status, seenAt, sure = LI.Status(key)
		if key ~= LI.playerKey and (not opts.liOnly or c.li) and (not opts.guildOnly or LI.InCircle(key)) then
			local nameMatch = q ~= "" and kind == "all" and Find(LI.ShortName(key), q)
			local groups, top = {}, nil
			for profKey, p in pairs(c.profs) do
				if p.recipes and Allowed(profKey) and Maxed(profKey, p) then
					local g = { key = profKey, confidence = 0, makes = 0 }
					if recipeSearch and hitCount > 0 then
						local function Consider(id)
							local meta = hits[id]
							if meta then
								g.makes = g.makes + 1
								if not g.recipeMeta or (meta.n or "") < (g.recipeMeta.n or "") then
									g.recipe, g.recipeMeta = id, meta
								end
							end
						end
						if type(p.recipes) == "table" then
							local mine = hitsByProf[profKey]
							if not orphans and mine and #mine < (p.count or 0) then
								for _, id in ipairs(mine) do
									if p.recipes[id] then
										Consider(id)
									end
								end
							elseif mine or orphans then
								for id in pairs(p.recipes) do
									Consider(id)
								end
							end
						else
							local mine = hitsByProf[profKey]
							if mine and #mine < (p.count or 0) then
								for _, id in ipairs(mine) do
									if LI.KnowsRecipe(p, profKey, id) then
										Consider(id)
									end
								end
							elseif mine then
								for _, id in ipairs(LI.RecipeList(p, profKey)) do
									Consider(id)
								end
							end
						end
					end
					if g.makes > 0 then
						g.confidence = 3
					elseif not recipeSearch or nameMatch or (kind == "all" and Find(p.name, q)) then
						g.confidence = 2
					end
					if g.confidence > 0 then
						groups[#groups + 1] = g
						if not top or g.confidence > top.confidence or (g.confidence == top.confidence and g.makes > top.makes) then
							top = g
						end
					end
				end
			end
			if top then
				table.sort(groups, function(a, b) return a.key < b.key end)
				local makes = 0
				for _, g in ipairs(groups) do
					makes = makes + g.makes
				end
				out[#out + 1] = {
					key = key,
					crafter = c,
					status = status,
					seenAt = seenAt,
					sure = sure,
					favorite = LI.IsFavorite(key),
					top = top,
					groups = groups,
					recipe = top.recipe,
					recipeMeta = top.recipeMeta,
					makes = makes,
					confidence = top.confidence,
				}
			end
		end
	end
	table.sort(out, function(a, b)
		local ra, rb = LI.StatusRank(a.status, a.sure), LI.StatusRank(b.status, b.sure)
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

local function OrderIndex(key)
	for i, k in ipairs(LI.PROFESSION_ORDER) do
		if k == key then
			return i
		end
	end
	return #LI.PROFESSION_ORDER + 1
end

local function RowOrder(a, b)
	local ra, rb = LI.StatusRank(a.entry.status, a.entry.sure), LI.StatusRank(b.entry.status, b.entry.sure)
	if ra ~= rb then
		return ra < rb
	end
	if a.match.confidence ~= b.match.confidence then
		return a.match.confidence > b.match.confidence
	end
	local pa, pb = a.entry.crafter.profs[a.prof] or {}, b.entry.crafter.profs[b.prof] or {}
	local ka, kb = pa.rank or 0, pb.rank or 0
	if ka ~= kb then
		return ka > kb
	end
	local sa, sb = a.entry.seenAt or 0, b.entry.seenAt or 0
	if sa ~= sb then
		return sa > sb
	end
	local na, nb = pa.count or 0, pb.count or 0
	if na ~= nb then
		return na > nb
	end
	return a.entry.key < b.entry.key
end

function LI.Group(results)
	local byKey, groups = {}, {}
	local favorites = { key = "favorites", name = "Favorites", favorites = true, rows = {}, online = 0, best = 0 }
	for _, entry in ipairs(results) do
		if entry.favorite and entry.top then
			favorites.rows[#favorites.rows + 1] = { entry = entry, prof = entry.top.key, match = entry.top }
			if entry.status == "online" then
				favorites.online = favorites.online + 1
			end
		end
		for _, g in ipairs(entry.groups) do
			local group = byKey[g.key]
			if not group then
				local p = entry.crafter.profs[g.key]
				group = { key = g.key, name = p.name or g.key, icon = p.icon, rows = {}, online = 0, best = 0 }
				byKey[g.key] = group
				groups[#groups + 1] = group
			end
			group.rows[#group.rows + 1] = { entry = entry, prof = g.key, match = g }
			group.best = math.max(group.best, g.confidence)
			if entry.status == "online" then
				group.online = group.online + 1
			end
		end
	end
	for _, group in ipairs(groups) do
		table.sort(group.rows, RowOrder)
	end
	table.sort(groups, function(a, b)
		if a.best ~= b.best then
			return a.best > b.best
		end
		local ia, ib = OrderIndex(a.key), OrderIndex(b.key)
		if ia ~= ib then
			return ia < ib
		end
		return a.key < b.key
	end)
	if #favorites.rows > 0 then
		table.sort(favorites.rows, RowOrder)
		table.insert(groups, 1, favorites)
	end
	return groups
end

function LI.IsListed(c)
	for _, p in pairs(c and c.profs or {}) do
		if p.recipes then
			return true
		end
	end
	return false
end

function LI.ProfessionChips(secondary)
	local counts = {}
	if LI.crafters then
		for key, c in pairs(LI.crafters) do
			if key ~= LI.playerKey then
				for profKey, p in pairs(c.profs) do
					local entry = p.recipes and counts[profKey]
					if p.recipes and not entry then
						entry = { key = profKey, name = p.name, icon = p.icon, count = 0 }
						counts[profKey] = entry
					end
					if entry then
						entry.count = entry.count + 1
						entry.icon = entry.icon or p.icon
					end
				end
			end
		end
	end
	local list, used = {}, {}
	local function Add(key)
		if used[key] then
			return
		end
		used[key] = true
		local entry = counts[key] or { key = key, count = 0 }
		entry.name = entry.name or LI.PROFESSION_NAMES[key] or key
		list[#list + 1] = entry
	end
	for _, key in ipairs(LI.PRIMARY) do
		Add(key)
	end
	local rest = {}
	for key in pairs(counts) do
		if not used[key] and not LI.SECONDARY_SET[key] then
			rest[#rest + 1] = key
		end
	end
	table.sort(rest)
	for _, key in ipairs(rest) do
		Add(key)
	end
	if secondary then
		for _, key in ipairs(LI.SECONDARY) do
			Add(key)
		end
	end
	return list
end
