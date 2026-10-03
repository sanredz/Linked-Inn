local ADDON, LI = ...

local CAST_PROFS = {
	[13262] = "enchanting",
}

local WORDS = {
	{ "alchemist", "alchemy" }, { "alch", "alchemy" }, { "pots", "alchemy" }, { "flasks", "alchemy" },
	{ "blacksmith", "blacksmithing" }, { "bs", "blacksmithing" },
	{ "enchanter", "enchanting" }, { "enchants", "enchanting" }, { "enchanting", "enchanting" }, { "ench", "enchanting" },
	{ "engineer", "engineering" }, { "engi", "engineering" }, { "engineering", "engineering" },
	{ "leatherworker", "leatherworking" }, { "leatherworking", "leatherworking" }, { "lw", "leatherworking" },
	{ "tailor", "tailoring" }, { "tailoring", "tailoring" },
}

local OFFER = { "lfw", "can make", "can craft", "crafting", "your mats", "ur mats", "yo mats", "tips", "tip", "pst for", "cheap" }
local ASK = { "wtb", "lf", "lfm", "need", "looking for", "anyone", "any", "who can", "%?" }

local spellCache = {}

local function Has(text, word)
	if word:find("[%%%?]") then
		return text:find(word) ~= nil
	end
	return text:find("%f[%w]" .. word:gsub("(%p)", "%%%1") .. "%f[%W]") ~= nil
end

function LI.ProfessionFromWords(text)
	if type(text) ~= "string" then
		return nil
	end
	local lower = " " .. text:lower():gsub("|c%x%x%x%x%x%x%x%x", ""):gsub("|r", ""):gsub("|H.-|h(.-)|h", "%1") .. " "
	local offer = false
	for _, w in ipairs(OFFER) do
		if Has(lower, w) then
			offer = true
			break
		end
	end
	if not offer then
		return nil
	end
	for _, w in ipairs(ASK) do
		if Has(lower, w) then
			return nil
		end
	end
	local found
	for _, pair in ipairs(WORDS) do
		if Has(lower, pair[1]) then
			if found and found ~= pair[2] then
				return nil
			end
			found = pair[2]
		end
	end
	return found
end

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
	local zone = GetRealZoneText and LI.Safe(LI.Try(GetRealZoneText))
	LI.Clue(key, guid, prof, type(zone) == "string" and zone ~= "" and zone or nil, LI.Safe(classFile))
end)
