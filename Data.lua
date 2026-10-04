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

LI.PRIMARY = { "alchemy", "blacksmithing", "enchanting", "engineering", "leatherworking", "tailoring" }
LI.SECONDARY = { "cooking", "first aid", "fishing" }
LI.SECONDARY_SET = { cooking = true, ["first aid"] = true, fishing = true }
LI.GATHERING = { mining = true, herbalism = true, skinning = true }

LI.PROFESSION_NAMES = {
	alchemy = "Alchemy",
	blacksmithing = "Blacksmithing",
	enchanting = "Enchanting",
	engineering = "Engineering",
	leatherworking = "Leatherworking",
	tailoring = "Tailoring",
	cooking = "Cooking",
	["first aid"] = "First Aid",
	fishing = "Fishing",
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

local DEFAULTS = {
	autoRead = true,
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
	{ key = "light", name = "Light", keep = 100, days = 21, rare = 5 },
	{ key = "balanced", name = "Balanced", keep = 50, days = 10, rare = 3 },
	{ key = "strict", name = "Strict", keep = 25, days = 5, rare = 2 },
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
	return key == LI.playerKey or (LI.favorites and LI.favorites[key]) or (LI.InCircle and LI.InCircle(key))
end

function LI.Housekeep(modeKey, dry)
	local mode = LI.HousekeepingMode(modeKey or (LI.settings and LI.settings.housekeeping))
	if not mode.keep or not LI.crafters then
		return 0, 0
	end
	local now = time()
	local pools = {}
	for key, c in pairs(LI.crafters) do
		if type(c) == "table" and type(c.profs) == "table" then
			for profKey, p in pairs(c.profs) do
				if type(p) == "table" and type(p.recipes) == "table" then
					pools[profKey] = pools[profKey] or {}
					table.insert(pools[profKey], { key = key, c = c, p = p })
				end
			end
		end
	end
	local removed, touched = 0, {}
	for profKey, pool in pairs(pools) do
		if #pool > mode.keep then
			local holders = {}
			for _, e in ipairs(pool) do
				for id in pairs(e.p.recipes) do
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
				local old = now - (e.c.seen or 0) > mode.days * 86400
				local rare = false
				for id in pairs(e.p.recipes) do
					if holders[id] - 1 < mode.rare then
						rare = true
						break
					end
				end
				if old and not rare and not Protected(e.key) then
					for id in pairs(e.p.recipes) do
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
	db.profLinks = type(db.profLinks) == "table" and db.profLinks or {}
	for profKey, nums in pairs(PROF_LINKS) do
		if type(db.profLinks[profKey]) ~= "table" then
			db.profLinks[profKey] = { spell = nums[1], line = nums[2], default = true }
		end
	end
	db.settings = type(db.settings) == "table" and db.settings or {}
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
	realm.favorites = type(realm.favorites) == "table" and realm.favorites or {}
	realm.waiting = type(realm.waiting) == "table" and realm.waiting or {}
	realm.tried = type(realm.tried) == "table" and realm.tried or {}
	realm.low = type(realm.low) == "table" and realm.low or {}
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
	if LI.db.triedRound ~= 3 then
		LI.db.triedRound = 3
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
			meta.c = r.cat or meta.c
			meta.r = r.reagents or meta.r
		end
	end
	p.recipes = set
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
		if caps then
			local cap = caps[profKey] or 0
			return cap > 0 and (p.rank or 0) >= cap
		end
		return minSkill <= 0 or (p.rank or 0) >= minSkill
	end
	local recipeSearch = q ~= "" or kind ~= "all"
	local hits, hitCount = {}, 0
	if recipeSearch then
		for id, meta in pairs(LI.db.recipes) do
			if KindMatch(meta, kind) and (q == "" or Find(meta.n, q)) then
				hits[id] = meta
				hitCount = hitCount + 1
			end
		end
	end
	for key, c in pairs(LI.crafters) do
		local status, seenAt, sure = LI.Status(key)
		if key ~= LI.playerKey and (not opts.liOnly or c.li) then
			local nameMatch = q ~= "" and kind == "all" and Find(LI.ShortName(key), q)
			local groups, top = {}, nil
			for profKey, p in pairs(c.profs) do
				if p.recipes and Allowed(profKey) and Maxed(profKey, p) then
					local g = { key = profKey, confidence = 0, makes = 0 }
					if recipeSearch and hitCount > 0 then
						for id in pairs(p.recipes) do
							local meta = hits[id]
							if meta then
								g.makes = g.makes + 1
								if not g.recipeMeta or (meta.n or "") < (g.recipeMeta.n or "") then
									g.recipe, g.recipeMeta = id, meta
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
	local na, nb = pa.count or 0, pb.count or 0
	if na ~= nb then
		return na > nb
	end
	local sa, sb = a.entry.seenAt or 0, b.entry.seenAt or 0
	if sa ~= sb then
		return sa > sb
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
