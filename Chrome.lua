local ADDON, LI = ...

local Chrome = {}
LI.Chrome = Chrome

local TOP = "perks-theme-brewfest-tl-top"
local BOTTOM = "perks-theme-brewfest-tl-bottom"
local OVERHANG = 12
local TOP_OVERLAP = 18
local BOTTOM_OVERLAP = 8

local function Size(atlas)
	if not C_Texture or not C_Texture.GetAtlasInfo then
		return nil
	end
	local info = LI.Try(C_Texture.GetAtlasInfo, atlas)
	if type(info) ~= "table" or not info.width or info.width <= 0 then
		return nil
	end
	return info.width, info.height
end

local function Piece(main, atlas, anchor, rel, y)
	local w, h = Size(atlas)
	if not w then
		return nil
	end
	local tex = main:CreateTexture(nil, "ARTWORK", nil, 6)
	if not pcall(tex.SetAtlas, tex, atlas, false) then
		tex:Hide()
		return nil
	end
	local width = main:GetWidth() + OVERHANG * 2
	tex:SetSize(width, h * width / w)
	tex:SetPoint(anchor, main, rel, 0, y)
	return tex
end

function Chrome.Apply(main)
	if main.chromeTop ~= nil then
		return
	end
	main.chromeTop = Piece(main, TOP, "BOTTOM", "TOP", -TOP_OVERLAP) or false
	main.chromeBottom = Piece(main, BOTTOM, "TOP", "BOTTOM", BOTTOM_OVERLAP) or false
end
