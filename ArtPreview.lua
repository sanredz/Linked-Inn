local ADDON, LI = ...

local Art = {}
LI.ArtPreview = Art

local THEMES = {
	"brewfest", "hordevsalliance", "20thanniversary", "winterveil", "hallowsend", "pirateday",
	"loveisintheair", "noblegarden", "trialofstyle", "childrensweek", "midsummerfestival",
}

local BACKS = {
	"professions-recipe-background", "professions-recipe-background-alchemy", "professions-recipe-background-blacksmithing",
	"professions-recipe-background-enchanting", "professions-recipe-background-engineering", "professions-recipe-background-leatherworking",
	"professions-recipe-background-tailoring", "professions-recipe-background-cooking", "professions-minimizedview-background",
}

local list
local index = 0
local top, bottom, back, label

local function Exists(atlas)
	if not atlas or not C_Texture or not C_Texture.GetAtlasInfo then
		return false
	end
	return type(LI.Try(C_Texture.GetAtlasInfo, atlas)) == "table"
end

local function Add(name, t, b, k)
	t = Exists(t) and t or nil
	b = Exists(b) and b or nil
	k = Exists(k) and k or nil
	if t or b or k then
		list[#list + 1] = { name = name, top = t, bottom = b, back = k }
	end
end

local function Build()
	list = {}
	for _, theme in ipairs(THEMES) do
		local p = "perks-theme-" .. theme
		Add(theme .. " (wide)", p .. "-tl-top", p .. "-tl-bottom")
		Add(theme .. " (big)", p .. "-tp-topbig", p .. "-tp-bottombig")
	end
	Add("brewfest (small)", "perks-theme-brewfest-tp-topsmall", "perks-theme-brewfest-tp-bottomsmall")
	Add("crafting orders header", "craftingorders-header-frame")
	for _, name in ipairs(BACKS) do
		Add(name, nil, nil, name)
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
	tex:SetSize(w, (info.height or 40) * w / math.max(1, info.width or w))
	tex:ClearAllPoints()
	tex:SetPoint(anchor, main, rel, 0, y)
	tex:Show()
end

local function Back(atlas, main)
	if not atlas then
		back:Hide()
		return
	end
	back:SetAtlas(atlas, false)
	back:ClearAllPoints()
	back:SetAllPoints(main.Inset or main)
	back:SetAlpha(0.5)
	back:Show()
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
		back = (main.Inset or main):CreateTexture(nil, "BACKGROUND", nil, 1)
		label = main:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
		label:SetPoint("BOTTOM", main, "TOP", 0, 70)
	end
	if arg == "off" then
		top:Hide()
		bottom:Hide()
		back:Hide()
		label:SetText("")
		return
	end
	list = list or Build()
	if #list == 0 then
		LI.Print("None of the art exists in this client.")
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
	Back(e.back, main)
	label:SetText(string.format("%d/%d  %s", index, #list, e.name))
	LI.Print(string.format("Art %d of %d: %s", index, #list, e.name))
end
