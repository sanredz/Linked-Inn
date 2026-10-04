local ADDON, LI = ...

local CAST_PROFS = {
	[13262] = "enchanting",
}

local SCAN_COOLDOWN = 300
local SCAN_PLAYERS = 20
local NAMEPLATE_CVAR = "nameplateShowFriendlyPlayers"
local NAMEPLATE_WAIT = 0.4

local spellCache = {}
local sawCraft = {}
local lastScan

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

function LI.OnCrafted(text, sender, guid)
	if not LI.ready or type(text) ~= "string" or type(sender) ~= "string" or sender == "" then
		return false
	end
	local key = LI.FullName(sender)
	if not key or key == LI.playerKey then
		return false
	end
	local recipe = CraftedRecipe(text)
	local prof = recipe and SpellProfession(recipe)
	if not prof then
		return false
	end
	local seen = key .. ":" .. prof
	if type(guid) ~= "string" or not guid:find("^Player%-") then
		if not noGuidLogged[seen] then
			noGuidLogged[seen] = true
			LI.Log(string.format("Saw %s doing %s, but the game didn't say who exactly", LI.ShortName(key), prof))
		end
		return false
	end
	if not sawCraft[seen] then
		sawCraft[seen] = true
		LI.Log(string.format("Saw %s doing %s", LI.ShortName(key), prof))
	end
	local classFile
	if GetPlayerInfoByGUID then
		classFile = LI.Safe((select(2, LI.Try(GetPlayerInfoByGUID, guid))))
	end
	return LI.Clue(key, guid, prof, Zone(), classFile)
end

LI.On("CHAT_MSG_TRADESKILLS", function(text, sender, _, _, _, _, _, _, _, _, _, guid)
	LI.OnCrafted(LI.Safe(text), LI.Safe(sender), LI.Safe(guid))
end)

local function GetCVarOn(name)
	local getter = (C_CVar and C_CVar.GetCVarBool) or GetCVarBool
	return getter and LI.Safe(LI.Try(getter, name)) == true
end

local function SetCVarValue(name, value)
	local setter = (C_CVar and C_CVar.SetCVar) or SetCVar
	if setter then
		LI.Try(setter, name, value)
	end
end

local function Tokens()
	local tokens = { "target", "mouseover", "focus" }
	for i = 1, 4 do
		tokens[#tokens + 1] = "party" .. i
	end
	for i = 1, 40 do
		tokens[#tokens + 1] = "raid" .. i
	end
	local plates = C_NamePlate and C_NamePlate.GetNamePlates and LI.Try(C_NamePlate.GetNamePlates)
	for _, plate in ipairs(type(plates) == "table" and plates or {}) do
		local token = plate.namePlateUnitToken or (plate.UnitFrame and plate.UnitFrame.unit)
		if type(token) == "string" then
			tokens[#tokens + 1] = token
		end
	end
	for i = 1, 40 do
		tokens[#tokens + 1] = "nameplate" .. i
	end
	return tokens
end

local function KnownPrimaries(c)
	local n = 0
	for profKey in pairs(c and c.profs or {}) do
		for _, primary in ipairs(LI.PRIMARY) do
			if primary == profKey then
				n = n + 1
			end
		end
	end
	return n
end

function LI.ScanCandidates()
	local seen, list = {}, {}
	local zone = Zone()
	for _, unit in ipairs(Tokens()) do
		if #list >= SCAN_PLAYERS then
			break
		end
		local guid = UnitGUID and LI.Safe(LI.Try(UnitGUID, unit))
		if type(guid) == "string" and guid:find("^Player%-") and not seen[guid]
			and LI.Safe(LI.Try(UnitIsPlayer, unit)) and LI.Safe(LI.Try(UnitIsFriend, "player", unit)) ~= false then
			seen[guid] = true
			local key = LI.UnitKey(unit)
			local c = key and LI.crafters[key]
			if key and key ~= LI.playerKey and KnownPrimaries(c) < 2 then
				local profs = {}
				for _, profKey in ipairs(LI.PRIMARY) do
					local p = c and c.profs[profKey]
					if LI.db.profLinks[profKey] and not (p and p.recipes) then
						profs[#profs + 1] = profKey
					end
				end
				if #profs > 0 then
					list[#list + 1] = {
						key = key,
						guid = guid,
						class = LI.Safe(select(2, LI.Try(UnitClass, unit))),
						where = zone,
						profs = profs,
					}
				end
			end
		end
	end
	return list
end

function LI.ScanReady()
	if LI.Reader.Scanning() then
		return false, "scanning"
	end
	if lastScan and GetTime() - lastScan < SCAN_COOLDOWN then
		return false, "cooldown", SCAN_COOLDOWN - (GetTime() - lastScan)
	end
	if InCombatLockdown and InCombatLockdown() then
		return false, "combat"
	end
	return true
end

local function StartScan()
	local list = LI.ScanCandidates()
	if #list == 0 then
		LI.Print("Nobody new to scan around you.")
		return
	end
	LI.Reader.Scan(list)
end

function LI.ScanNearby()
	if not LI.ScanReady() then
		return false
	end
	lastScan = GetTime()
	if GetCVarOn(NAMEPLATE_CVAR) then
		StartScan()
	else
		SetCVarValue(NAMEPLATE_CVAR, "1")
		LI.After(NAMEPLATE_WAIT, function()
			StartScan()
			SetCVarValue(NAMEPLATE_CVAR, "0")
		end)
	end
	LI.Fire("StatusChanged")
	return true
end
