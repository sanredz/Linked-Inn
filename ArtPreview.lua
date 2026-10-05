local ADDON, LI = ...

local Art = {}
LI.ArtPreview = Art

local THEMES = {
	"default", "hordevsalliance", "darkmoon", "darkmoonfaire", "lunarfestival", "winterveil", "hallowsend",
	"brewfest", "midsummer", "loveisintheair", "noblegarden", "pilgrimsbounty", "pirate", "pirates", "steampunk",
	"tavern", "inn", "dwarf", "dwarven", "gnome", "orc", "arcane", "nature", "emerald", "emeralddream", "spooky",
	"plunderstorm", "fishing", "cooking", "engineering", "blacksmithing", "alchemy", "tailoring", "enchanting",
	"leatherworking", "jewelcrafting", "inscription", "mining", "herbalism", "titan", "cosmic", "classic",
	"warcraft", "wowclassic", "anniversary", "elven", "nightelf", "undead", "troll", "tauren", "draenei",
	"bloodelf", "worgen", "goblin", "pandaren", "dragon", "dragonflight", "shadowlands", "legion", "mechagon",
	"kultiras", "zandalar", "nightborne", "void", "holy", "fel", "frost", "fire", "storm", "ocean", "autumn",
	"spring", "summer", "winter", "trader", "merchant", "crafting", "professions", "tradingpost",
}

local EXTRA = {
	{ top = "AllianceScenario-TitleBG" },
	{ top = "HordeScenario-TitleBG" },
	{ top = "Professions-Header-BG" },
	{ top = "Professions-Recipe-Header" },
	{ top = "Professions-Frame-Header" },
	{ top = "professions-specializations-background-header" },
	{ top = "UI-Frame-Neutral-TitleBG" },
}

local list
local index = 0
local top, bottom, label

local function Exists(atlas)
	if not C_Texture or not C_Texture.GetAtlasInfo then
		return false
	end
	local info = LI.Try(C_Texture.GetAtlasInfo, atlas)
	return type(info) == "table"
end

local function Build()
	list = {}
	for _, theme in ipairs(THEMES) do
		local t = "perks-theme-" .. theme .. "-tp-topbig"
		local b = "perks-theme-" .. theme .. "-tp-bottombig"
		if Exists(t) or Exists(b) then
			list[#list + 1] = { name = theme, top = Exists(t) and t or nil, bottom = Exists(b) and b or nil }
		end
	end
	for _, e in ipairs(EXTRA) do
		if Exists(e.top) then
			list[#list + 1] = { name = e.top, top = e.top }
		end
	end
	return list
end

local function Place(tex, atlas, main, anchor, rel, y)
	if not atlas then
		tex:Hide()
		return
	end
	local info = C_Texture.GetAtlasInfo(atlas)
	tex:SetAtlas(atlas, false)
	local w = main:GetWidth() + 20
	local scale = w / math.max(1, info.width or w)
	tex:SetSize(w, (info.height or 40) * scale)
	tex:ClearAllPoints()
	tex:SetPoint(anchor, main, rel, 0, y)
	tex:Show()
end

function Art.Next(arg)
	local main = LinkedInnFrame
	if not main then
		LI.Print("Open Linked Inn first.")
		return
	end
	if not top then
		top = main:CreateTexture(nil, "OVERLAY", nil, 7)
		bottom = main:CreateTexture(nil, "OVERLAY", nil, 7)
		label = main:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
		label:SetPoint("BOTTOM", main, "TOP", 0, 60)
	end
	if arg == "off" then
		top:Hide()
		bottom:Hide()
		label:SetText("")
		return
	end
	list = list or Build()
	if #list == 0 then
		LI.Print("None of the candidate art exists in this client.")
		return
	end
	if arg == "list" then
		local names = {}
		for _, e in ipairs(list) do
			names[#names + 1] = e.name
		end
		LI.Print(string.format("%d found: %s", #list, table.concat(names, ", ")))
		return
	end
	index = index % #list + 1
	local e = list[index]
	Place(top, e.top, main, "BOTTOM", "TOP", -6)
	Place(bottom, e.bottom, main, "TOP", "BOTTOM", 6)
	label:SetText(string.format("%d/%d  %s", index, #list, e.name))
	LI.Print(string.format("Art %d of %d: %s", index, #list, e.name))
end
