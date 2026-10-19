local ADDON, LI = ...

local Tooltips = {}
LI.Tooltips = Tooltips

local ICON = "|TInterface\\Icons\\INV_Drink_05:14:14:0:0:64:64:5:59:5:59|t "
local GOLD = { 0.95, 0.82, 0.45 }
local GREEN = { 0.35, 0.95, 0.45 }
local RARE = { 0.25, 0.6, 1 }
local FRESH = 15
local RECENT = 30 * 60
local RARE_SHARE = 0.03
local RARE_POOL = 20
local RECIPE_CLASS = 9
local RECIPE_PROF = {
	[1] = "leatherworking", [2] = "tailoring", [3] = "engineering", [4] = "blacksmithing", [5] = "cooking",
	[6] = "alchemy", [7] = "first aid", [8] = "enchanting", [9] = "fishing", [10] = "jewelcrafting", [11] = "inscription",
}
local NOUN = {
	alchemy = "alchemists", blacksmithing = "blacksmiths", enchanting = "enchanters", engineering = "engineers",
	leatherworking = "leatherworkers", tailoring = "tailors", jewelcrafting = "jewelcrafters", inscription = "scribes",
	cooking = "cooks", ["first aid"] = "first aiders", fishing = "fishers",
}

local byItem, byName, cache, pools = nil, nil, {}, nil

local function Reset()
	byItem, byName, pools = nil, nil, nil
	cache = {}
end

local function Index()
	if byItem then
		return
	end
	byItem, byName = {}, {}
	for id, meta in pairs(LI.db and LI.db.recipes or {}) do
		if type(meta) == "table" then
			if type(meta.item) == "number" then
				local list = byItem[meta.item] or {}
				byItem[meta.item] = list
				list[#list + 1] = id
			end
			if type(meta.n) == "string" and meta.p then
				local names = byName[meta.p] or {}
				byName[meta.p] = names
				names[meta.n:lower()] = id
			end
		end
	end
end

local function Counted(key, c)
	return key ~= LI.playerKey and type(c) == "table" and type(c.profs) == "table" and LI.Allowed(key)
end

local function Pool(profKey)
	if not pools then
		pools = {}
		for key, c in pairs(LI.crafters or {}) do
			if Counted(key, c) then
				for pk, p in pairs(c.profs) do
					if type(p) == "table" and p.recipes then
						pools[pk] = (pools[pk] or 0) + 1
					end
				end
			end
		end
	end
	return pools[profKey] or 0
end

local function Makers(ids)
	local seen, list, online = {}, {}, 0
	local now = time()
	for _, id in ipairs(ids) do
		for _, entry in ipairs(LI.Orders and LI.Orders.Crafters(id) or {}) do
			if not seen[entry.key] then
				seen[entry.key] = true
				entry.favorite = LI.IsFavorite(entry.key)
				list[#list + 1] = entry
				if entry.status == "online" or now - (entry.seen or 0) <= RECENT then
					online = online + 1
				end
			end
		end
	end
	table.sort(list, function(a, b)
		local oa, ob = a.status == "online" and 1 or 0, b.status == "online" and 1 or 0
		if oa ~= ob then
			return oa > ob
		end
		if a.favorite ~= b.favorite then
			return a.favorite
		end
		local ra, rb = a.p.rank or 0, b.p.rank or 0
		if ra ~= rb then
			return ra > rb
		end
		return (a.seen or 0) > (b.seen or 0)
	end)
	return list, online
end

local function Cached(key, build)
	local hit = cache[key]
	local now = GetTime and GetTime() or 0
	if hit and now - hit.at < FRESH then
		return hit.value
	end
	local value = build()
	cache[key] = { at = now, value = value }
	return value
end

function Tooltips.ForItem(itemID)
	Index()
	local ids = byItem[itemID]
	if not ids then
		return nil
	end
	return Cached("i" .. itemID, function()
		local list, online = Makers(ids)
		return { list = list, online = online }
	end)
end

function Tooltips.RecipeOf(name, profKey)
	if type(name) ~= "string" or not profKey then
		return nil
	end
	Index()
	local names = byName[profKey]
	if not names then
		return nil
	end
	local bare = name:match("^[^:]+:%s*(.+)$") or name
	return names[bare:lower()] or names[name:lower()]
end

function Tooltips.ForRecipe(recipeID, profKey)
	return Cached("r" .. recipeID, function()
		local known = 0
		for key, c in pairs(LI.crafters or {}) do
			if Counted(key, c) then
				local p = c.profs[profKey]
				if type(p) == "table" and LI.KnowsRecipe(p, profKey, recipeID) then
					known = known + 1
				end
			end
		end
		local pool = Pool(profKey)
		return { known = known, pool = pool, rare = pool >= RARE_POOL and known / pool <= RARE_SHARE }
	end)
end

function Tooltips.MakerLine(info)
	local list = info and info.list
	if not list or #list == 0 then
		return nil
	end
	local text
	if #list == 1 then
		text = LI.ShortName(list[1].key) .. " can make this"
	else
		text = string.format("%d crafters can make this", #list)
	end
	if info.online > 0 then
		text = text .. string.format(" |cff59f273(%d seen recently)|r", info.online)
	end
	return text, nil
end

function Tooltips.RecipeLine(info, profKey)
	if not info or info.pool == 0 then
		return nil
	end
	local noun = NOUN[profKey] or "crafters"
	local text
	if info.known == 0 then
		text = string.format("None of your %d %s know this", info.pool, noun)
	else
		text = string.format("Known by %d of %d %s", info.known, info.pool, noun)
	end
	return text, info.rare and "Rare" or nil
end

local function Enabled()
	return LI.ready and LI.settings and LI.settings.tooltips ~= false and not (InCombatLockdown and InCombatLockdown())
end

local function ItemOf(tooltip, data)
	local id = data and LI.Safe(data.id)
	if type(id) == "number" then
		return id
	end
	if tooltip and tooltip.GetItem then
		local _, link = LI.Try(tooltip.GetItem, tooltip)
		link = LI.Safe(link)
		if type(link) == "string" then
			return tonumber(link:match("item:(%d+)"))
		end
	end
	return nil
end

local function Add(tooltip, text, right, rightColor)
	if not text then
		return
	end
	if right then
		tooltip:AddDoubleLine(ICON .. text, right, GOLD[1], GOLD[2], GOLD[3], rightColor[1], rightColor[2], rightColor[3])
	else
		tooltip:AddLine(ICON .. text, GOLD[1], GOLD[2], GOLD[3])
	end
	tooltip:Show()
end

function Tooltips.Decorate(tooltip, data)
	if not Enabled() or (tooltip ~= GameTooltip and tooltip ~= ItemRefTooltip) then
		return
	end
	local itemID = ItemOf(tooltip, data)
	if not itemID then
		return
	end
	local getInfo = C_Item and C_Item.GetItemInfoInstant or GetItemInfoInstant
	local _, _, _, _, _, classID, subClassID = LI.Try(getInfo, itemID)
	classID, subClassID = LI.Safe(classID), LI.Safe(subClassID)
	if classID == RECIPE_CLASS then
		local profKey = RECIPE_PROF[subClassID]
		local getName = C_Item and C_Item.GetItemNameByID or GetItemInfo
		local name = LI.Safe(LI.Try(getName, itemID))
		local recipeID = Tooltips.RecipeOf(name, profKey)
		if recipeID then
			local text, right = Tooltips.RecipeLine(Tooltips.ForRecipe(recipeID, profKey), profKey)
			Add(tooltip, text, right, RARE)
		end
		return
	end
	local text, right = Tooltips.MakerLine(Tooltips.ForItem(itemID))
	Add(tooltip, text, right, GREEN)
end

local hooked = false

local function Hook()
	if hooked then
		return
	end
	hooked = true
	if TooltipDataProcessor and TooltipDataProcessor.AddTooltipPostCall and Enum and Enum.TooltipDataType and Enum.TooltipDataType.Item then
		TooltipDataProcessor.AddTooltipPostCall(Enum.TooltipDataType.Item, function(tooltip, data)
			LI.SafeCall(Tooltips.Decorate, tooltip, data)
		end)
		return
	end
	for _, tip in ipairs({ GameTooltip, ItemRefTooltip }) do
		if tip and tip.HookScript then
			pcall(tip.HookScript, tip, "OnTooltipSetItem", function(self)
				LI.SafeCall(Tooltips.Decorate, self)
			end)
		end
	end
end

LI.Listen("CraftersChanged", Reset)
LI.Listen("Ready", function()
	Reset()
	Hook()
end)
