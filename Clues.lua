local ADDON, LI = ...

local CAST_PROFS = {
	[13262] = "enchanting",
	[31252] = "jewelcrafting",
	[51005] = "inscription",
}

local createsPattern

local function CreatesPattern()
	if createsPattern then
		return createsPattern
	end
	local template = type(TRADESKILL_LOG_THIRDPERSON) == "string" and TRADESKILL_LOG_THIRDPERSON or "%s creates %s."
	local escaped = template:gsub("%%%d*%$?s", "\001"):gsub("([%(%)%.%[%]%*%+%-%?%^%$%%])", "%%%1")
	local pattern, n = escaped:gsub("\001", "(.-)")
	if n ~= 2 then
		pattern = "(.-)%s+creates%s+(.-)%.?"
	end
	createsPattern = "^" .. pattern:gsub("%%%.$", "%%.?") .. "$"
	return createsPattern
end

local function CreatesParts(text)
	local who, what = text:match(CreatesPattern())
	if not who then
		who, what = text:match("^(.-)%s+creates%s+(.-)%.?$")
	end
	return who, what
end

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
	local _, name = CreatesParts(text)
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
local WAIT_FOR = 14 * 86400
local WAIT_MAX = 300
local HOUSEKEEP_FIRST = 60
local HOUSEKEEP_EVERY = 3600
local TRY_AGAIN = 7 * 86400
local CLOSE_AGAIN = 12 * 3600
local DISCOVER_EVERY = 2
local REFRESH = 14 * 86400
local CANDIDATES_MAX = 300

LI.PRIO = { refresh = 0.5, chat = 1, seen = 2, guild = 3, group = 4 }

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

local function Trim()
	local n, oldest, oldestAt = 0, nil, nil
	for key, w in pairs(LI.waiting) do
		n = n + 1
		local at = type(w) == "table" and w.at or 0
		if not oldestAt or at < oldestAt then
			oldest, oldestAt = key, at
		end
	end
	if n > WAIT_MAX and oldest then
		LI.waiting[oldest] = nil
		return true
	end
	return false
end

local function Wait(key, prof, where)
	local w = LI.waiting[key]
	if not w then
		w = { profs = {}, at = time() }
		LI.waiting[key] = w
		Trim()
	end
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
		sender = CreatesParts(text)
	end
	local key = sender and sender ~= "" and LI.FullName(sender)
	if not key or key == LI.playerKey or not LI.Allowed(key) then
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
				LI.Discover(key, guid, LI.PRIO.seen)
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
		LI.Discover(key, guid, LI.PRIO.seen, classFile)
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

local function Known(c)
	local profs = {}
	for _, profKey in ipairs(LI.PRIMARY) do
		local p = c and c.profs[profKey]
		if LI.db.profLinks[profKey] and p and p.recipes then
			profs[#profs + 1] = profKey
		end
	end
	return profs
end

local function Stale(c)
	for _, profKey in ipairs(Known(c)) do
		if time() - (c.profs[profKey].read or 0) > REFRESH then
			return true
		end
	end
	return false
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
	if not LI.ready or not key or key == LI.playerKey then
		return false, "self"
	end
	if not IsPlayerGuid(guid) then
		return false, "no id"
	end
	LI.NoteGuid(key, guid)
	if not LI.Allowed(key) then
		return false, "outside"
	end
	if LI.OtherServer(guid) then
		return false, "other realm"
	end
	local refresh = false
	if KnownPrimaries(LI.crafters[key]) >= 2 then
		if LI.crafters[key].li or not Stale(LI.crafters[key]) then
			return false, "known"
		end
		refresh = true
	end
	prio = prio or LI.PRIO.chat
	local tried = LI.tried[key]
	local wait = refresh and REFRESH or (prio >= LI.PRIO.guild and CLOSE_AGAIN or TRY_AGAIN)
	if tried and time() - tried < wait then
		return false, "checked"
	end
	if refresh then
		prio = LI.PRIO.refresh
	end
	for _, cand in ipairs(candidates) do
		if cand.key == key then
			cand.prio = math.max(cand.prio, prio)
			cand.at = GetTime()
			cand.class = cand.class or classFile
			cand.where = where or cand.where
			return false, "in line"
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

function LI.VerifyProfs(key, newProf)
	local c = LI.crafters[key]
	if not LI.ready or not c or key == LI.playerKey or not LI.ReadsNearby() then
		return false
	end
	local guid = LI.GuidOf(key)
	if not IsPlayerGuid(guid) or LI.OtherServer(guid) then
		return false
	end
	local others = {}
	for _, profKey in ipairs(Known(c)) do
		if profKey ~= newProf then
			others[#others + 1] = profKey
		end
	end
	if #others < 2 then
		return false
	end
	for i = #candidates, 1, -1 do
		if candidates[i].key == key then
			table.remove(candidates, i)
		end
	end
	candidates[#candidates + 1] = { key = key, guid = guid, prio = LI.PRIO.group, profs = others, check = true, fixed = true, at = GetTime() }
	LI.Log(string.format("%s shows three crafting professions; checking which one they dropped", LI.ShortName(key)))
	return true
end

LI.Listen("ProfessionRead", function(key, profKey)
	local c = LI.crafters[key]
	if c and KnownPrimaries(c) > 2 then
		LI.VerifyProfs(key, profKey)
	end
end)

function LI.DiscoverUrgent()
	for _, cand in ipairs(candidates) do
		if cand.prio >= LI.PRIO.guild and LI.Allowed(cand.key) then
			return true
		end
	end
	return false
end

function LI.ClearDiscovery()
	for i = #candidates, 1, -1 do
		candidates[i] = nil
	end
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
	if not LI.ready or not LI.ReadsNearby() or #candidates == 0 then
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
		if LI.Allowed(cand.key) then
			LI.tried[cand.key] = time()
			local c = LI.crafters[cand.key]
			if not cand.fixed then
				cand.profs = Unknown(c)
				cand.check = nil
				if Stale(c) then
					local unknown = cand.profs
					cand.profs = Known(c)
					if #cand.profs < 2 then
						for _, profKey in ipairs(unknown) do
							cand.profs[#cand.profs + 1] = profKey
						end
					end
					cand.check = true
				end
			end
			if #cand.profs > 0 and reader.Scan({ cand }, true) then
				Crafts().checked = Crafts().checked + 1
				return true
			end
		end
	end
	return false
end

LI.Listen("Ready", function()
	LI.After(HOUSEKEEP_FIRST, function()
		LI.Housekeep()
	end)
	LI.Every(HOUSEKEEP_EVERY, function()
		LI.Housekeep()
	end)
	LI.WaitingCount()
	while Trim() do
	end
	LI.Every(DISCOVER_EVERY, LI.DiscoverStep)
end)

local NAMEPLATE_CVAR = "nameplateShowFriendlyPlayers"
local NAMEPLATE_WAIT = 0.5
local lastCityScan

local function CVarOn()
	local getter = (C_CVar and C_CVar.GetCVarBool) or GetCVarBool
	return getter and LI.Safe(LI.Try(getter, NAMEPLATE_CVAR)) == true
end

local function SetCVarValue(value)
	local setter = (C_CVar and C_CVar.SetCVar) or SetCVar
	if setter then
		LI.Try(setter, NAMEPLATE_CVAR, value)
	end
end

local function ReadPlates()
	local seen = 0
	local plates = C_NamePlate and C_NamePlate.GetNamePlates and LI.Try(C_NamePlate.GetNamePlates)
	local tokens, done = {}, {}
	for _, plate in ipairs(type(plates) == "table" and plates or {}) do
		local token = plate.namePlateUnitToken or (plate.UnitFrame and plate.UnitFrame.unit)
		if type(token) == "string" then
			tokens[#tokens + 1] = token
		end
	end
	for i = 1, 60 do
		tokens[#tokens + 1] = "nameplate" .. i
	end
	for _, token in ipairs(tokens) do
		if not done[token] and LI.Safe(LI.Try(UnitExists, token)) then
			done[token] = true
			seen = seen + 1
			LI.Sighted(token)
		end
	end
	return seen
end

LI.ReadPlates = ReadPlates

function LI.InCity()
	if not LI.Safe(LI.Try(IsResting)) then
		return false
	end
	local inInstance = IsInInstance and LI.Safe(LI.Try(IsInInstance))
	return not inInstance
end

function LI.CityScanDue()
	local s = LI.settings
	if LI.RETAIL or not LI.ready or not s.cityScan or s.guildOnly or not LI.ReadsNearby() or not LI.InCity() then
		return false
	end
	if InCombatLockdown and InCombatLockdown() then
		return false
	end
	if CVarOn() then
		return false
	end
	local every = math.max(1, tonumber(s.cityEvery) or 5) * 60
	return not lastCityScan or GetTime() - lastCityScan >= every
end

function LI.CityScan()
	lastCityScan = GetTime()
	SetCVarValue("1")
	LI.After(NAMEPLATE_WAIT, function()
		local seen = ReadPlates()
		SetCVarValue("0")
		LI.Log(string.format("City scan: noted %d players around you", seen))
		LI.Fire("StatusChanged")
	end)
end

LI.Listen("Ready", function()
	lastCityScan = GetTime() - math.max(1, tonumber(LI.settings.cityEvery) or 5) * 60 + 20
	LI.Every(10, function()
		if LI.CityScanDue() then
			LI.CityScan()
		end
	end)
end)

LI.Listen("ScanDone", function()
	LI.After(0.1, LI.DiscoverStep)
end)
