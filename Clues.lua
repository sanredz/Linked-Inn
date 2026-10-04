local ADDON, LI = ...

local CAST_PROFS = {
	[13262] = "enchanting",
}

local spellCache = {}
local sawCraft = {}

local function SpellProfession(spellID)
	if CAST_PROFS[spellID] then
		return CAST_PROFS[spellID]
	end
	local cached = spellCache[spellID]
	if cached ~= nil then
		return cached or nil
	end
	local prof = LI.ProfessionOfRecipe(spellID)
	if prof and LI.GATHERING[prof] then
		prof = nil
	end
	spellCache[spellID] = prof or false
	return prof
end

local function Zone()
	local zone = GetRealZoneText and LI.Safe(LI.Try(GetRealZoneText))
	return type(zone) == "string" and zone ~= "" and zone or nil
end

function LI.Clue(key, guid, profKey, where, classFile)
	if not LI.ready or not key or key == LI.playerKey or not profKey or LI.GATHERING[profKey] then
		return false
	end
	local link = LI.BuildLink(guid, profKey)
	if not link then
		return false
	end
	LI.Reader.Want(key, LI.PROFESSION_NAMES[profKey] or profKey, link, {
		built = true,
		class = classFile,
		where = where,
	})
	return true
end

LI.On("UNIT_SPELLCAST_SUCCEEDED", function(unit, _, spellID)
	unit, spellID = LI.Safe(unit), LI.Safe(spellID)
	if not LI.ready or type(unit) ~= "string" or type(spellID) ~= "number" or unit == "player" then
		return
	end
	if not LI.Safe(LI.Try(UnitIsPlayer, unit)) then
		return
	end
	local prof = SpellProfession(spellID)
	if not prof then
		return
	end
	local key = LI.UnitKey(unit)
	local guid = UnitGUID and LI.Safe(LI.Try(UnitGUID, unit))
	local classFile = select(2, LI.Try(UnitClass, unit))
	local seen = key and key .. ":" .. prof
	if seen and not sawCraft[seen] then
		sawCraft[seen] = true
		LI.Log(string.format("Saw %s doing %s (%s)", LI.ShortName(key), prof, unit))
	end
	LI.Clue(key, guid, prof, Zone(), LI.Safe(classFile))
end)

local nameIndex, nameIndexSize

local function RecipeByName(name)
	local size = 0
	for _ in pairs(LI.db.recipes) do
		size = size + 1
	end
	if not nameIndex or size ~= nameIndexSize then
		nameIndex, nameIndexSize = {}, size
		for id, meta in pairs(LI.db.recipes) do
			if type(meta.n) == "string" and meta.item then
				nameIndex[meta.n:lower()] = id
			end
		end
	end
	return nameIndex[LI.Trim(name):lower()]
end

local function CraftedRecipe(text)
	local itemID = tonumber(text:match("|Hitem:(%d+)") or "")
	if itemID then
		return LI.RecipeForItem(itemID), itemID
	end
	local name = text:match("^.-%s+creates%s+(.-)%.?$")
	if not name then
		return nil
	end
	name = name:gsub("%s*[xX]%d+$", "")
	return RecipeByName(name)
end

local noGuidLogged = {}
local sampleLogged = false

local function Crafts()
	local c = LI.test.crafts
	if type(c) ~= "table" then
		c = {}
		LI.test.crafts = c
	end
	for _, k in ipairs({ "lines", "known", "noId", "unknown", "queued", "found", "checked" }) do
		c[k] = c[k] or 0
	end
	return c
end
LI.Crafts = Crafts

local UNIT_TOKENS = { "target", "mouseover", "focus" }
local WAIT_FOR = 90 * 86400
local TRY_AGAIN = 7 * 86400
local DISCOVER_EVERY = 2
local CANDIDATES_MAX = 300

LI.PRIO = { chat = 1, seen = 2, guild = 3, group = 4 }

local candidates = {}

local function GuidForKey(key)
	local known = LI.GuidOf(key)
	if known then
		return known
	end
	local function Match(unit)
		if LI.UnitKey(unit) == key then
			return LI.Safe(LI.Try(UnitGUID, unit))
		end
	end
	for _, unit in ipairs(UNIT_TOKENS) do
		local guid = Match(unit)
		if guid then
			return guid
		end
	end
	for i = 1, 40 do
		local guid = Match("nameplate" .. i) or Match("raid" .. i) or (i <= 4 and Match("party" .. i))
		if guid then
			return guid
		end
	end
	return nil
end

local function IsPlayerGuid(guid)
	return type(guid) == "string" and guid:find("^Player%-") ~= nil
end

local function Wait(key, prof, where)
	local w = LI.waiting[key] or { profs = {} }
	LI.waiting[key] = w
	w.profs[prof] = true
	w.at = time()
	w.where = where or w.where
end

function LI.WaitingCount()
	local n = 0
	for key, w in pairs(LI.waiting or {}) do
		if type(w) ~= "table" or type(w.profs) ~= "table" or time() - (w.at or 0) > WAIT_FOR then
			LI.waiting[key] = nil
		else
			n = n + 1
		end
	end
	return n
end

function LI.OnCrafted(text, sender, guid)
	if not LI.ready or type(text) ~= "string" then
		return false
	end
	local stats = Crafts()
	stats.lines = stats.lines + 1
	if not sampleLogged then
		sampleLogged = true
		LI.Log(string.format("Crafting log sample: sender '%s', id '%s', text '%s'", tostring(sender), tostring(guid), text:gsub("|", "!"):sub(1, 90)))
	end
	if type(sender) ~= "string" or sender == "" then
		sender = text:match("^(.-)%s+creates%s")
	end
	local key = sender and sender ~= "" and LI.FullName(sender)
	if not key or key == LI.playerKey then
		return false
	end
	local recipe = CraftedRecipe(text)
	local prof = recipe and SpellProfession(recipe)
	if not prof then
		stats.unknown = stats.unknown + 1
		if not LI.IsListed(LI.crafters[key]) then
			if not IsPlayerGuid(guid) then
				guid = GuidForKey(key)
			end
			if IsPlayerGuid(guid) then
				LI.tried[key] = nil
				LI.Discover(key, guid, LI.PRIO.guild)
			else
				Wait(key, "any", Zone())
			end
		end
		return false
	end
	stats.known = stats.known + 1
	local seen = key .. ":" .. prof
	if not IsPlayerGuid(guid) then
		guid = GuidForKey(key)
	end
	if not IsPlayerGuid(guid) then
		local c = LI.crafters[key]
		local p = c and c.profs[prof]
		if not (p and p.recipes) then
			stats.noId = stats.noId + 1
			Wait(key, prof, Zone())
			if not noGuidLogged[seen] then
				noGuidLogged[seen] = true
				LI.Log(string.format("Saw %s doing %s; waiting to see them again to read it", LI.ShortName(key), prof))
			end
		end
		return false
	end
	if not sawCraft[seen] then
		sawCraft[seen] = true
		LI.Log(string.format("Saw %s doing %s", LI.ShortName(key), prof))
	end
	local classFile = GetPlayerInfoByGUID and LI.Safe((select(2, LI.Try(GetPlayerInfoByGUID, guid))))
	local queued = LI.Clue(key, guid, prof, Zone(), classFile)
	if queued then
		stats.queued = stats.queued + 1
	end
	return queued
end

LI.Listen("GuidFound", function(key, guid)
	local w = LI.waiting and LI.waiting[key]
	if not w then
		return
	end
	LI.waiting[key] = nil
	local classFile = GetPlayerInfoByGUID and LI.Safe((select(2, LI.Try(GetPlayerInfoByGUID, guid))))
	local stats = Crafts()
	if w.profs.any then
		w.profs.any = nil
		LI.tried[key] = nil
		LI.Discover(key, guid, LI.PRIO.guild, classFile)
	end
	for prof in pairs(w.profs) do
		if LI.Clue(key, guid, prof, Zone() or w.where, classFile) then
			stats.queued = stats.queued + 1
			stats.found = stats.found + 1
		end
	end
end)

LI.On("CHAT_MSG_TRADESKILLS", function(text, sender, _, _, _, _, _, _, _, _, _, guid)
	LI.OnCrafted(LI.Safe(text), LI.Safe(sender), LI.Safe(guid))
end)

local function KnownPrimaries(c)
	local n = 0
	for _, primary in ipairs(LI.PRIMARY) do
		local p = c and c.profs[primary]
		if p and p.recipes then
			n = n + 1
		end
	end
	return n
end

local function Unknown(c)
	local profs = {}
	for _, profKey in ipairs(LI.PRIMARY) do
		local p = c and c.profs[profKey]
		if LI.db.profLinks[profKey] and not (p and p.recipes) then
			profs[#profs + 1] = profKey
		end
	end
	return profs
end

function LI.Discover(key, guid, prio, classFile, where)
	if not LI.ready or not key or key == LI.playerKey or not IsPlayerGuid(guid) then
		return false
	end
	LI.NoteGuid(key, guid)
	if KnownPrimaries(LI.crafters[key]) >= 2 then
		return false
	end
	local tried = LI.tried[key]
	if tried and time() - tried < TRY_AGAIN then
		return false
	end
	prio = prio or LI.PRIO.chat
	for _, cand in ipairs(candidates) do
		if cand.key == key then
			cand.prio = math.max(cand.prio, prio)
			cand.at = GetTime()
			cand.class = cand.class or classFile
			cand.where = where or cand.where
			return false
		end
	end
	candidates[#candidates + 1] = { key = key, guid = guid, prio = prio, class = classFile, where = where, at = GetTime() }
	if #candidates > CANDIDATES_MAX then
		local worst = 1
		for i, cand in ipairs(candidates) do
			local w = candidates[worst]
			if cand.prio < w.prio or (cand.prio == w.prio and cand.at < w.at) then
				worst = i
			end
		end
		table.remove(candidates, worst)
	end
	return true
end

function LI.DiscoverQueue()
	return #candidates
end

local function NextCandidate()
	local best
	for i, cand in ipairs(candidates) do
		local b = best and candidates[best]
		if not b or cand.prio > b.prio or (cand.prio == b.prio and cand.at > b.at) then
			best = i
		end
	end
	return best and table.remove(candidates, best)
end

function LI.DiscoverStep()
	if not LI.ready or not LI.settings.autoRead or #candidates == 0 then
		return false
	end
	if InCombatLockdown and InCombatLockdown() then
		return false
	end
	local reader = LI.Reader
	if reader.Scanning() then
		return false
	end
	local top = 0
	for _, cand in ipairs(candidates) do
		top = math.max(top, cand.prio)
	end
	if not reader.Idle(top >= LI.PRIO.guild) then
		return false
	end
	while #candidates > 0 do
		local cand = NextCandidate()
		LI.tried[cand.key] = time()
		cand.profs = Unknown(LI.crafters[cand.key])
		if #cand.profs > 0 and reader.Scan({ cand }, true) then
			Crafts().checked = Crafts().checked + 1
			return true
		end
	end
	return false
end

LI.Listen("Ready", function()
	LI.Every(DISCOVER_EVERY, LI.DiscoverStep)
end)

LI.Listen("ScanDone", function()
	LI.After(0.1, LI.DiscoverStep)
end)
