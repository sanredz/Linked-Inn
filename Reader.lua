local ADDON, LI = ...

local Reader = {}
LI.Reader = Reader

local PUMP_EVERY = 2
local GAP = 8
local TIMEOUT = 6
local GIVE_UP = 5
local QUEUE_MAX = 30
local STALE = 3 * 86400
local CLICK_WINDOW = 20
local AUTO_ECHO = 10

local queue = {}
local pending
local clicked
local tradeOpen = false
local nextAt = 0
local readScheduled = false
local tip
local lastAuto
local hooked = false
local concealed = false
local PANELS = { "left", "center", "right", "doublewide", "fullscreen" }

local function Now()
	return GetTime()
end

function Reader.IsBroken()
	return (LI.test and LI.test.auto.streak or 0) >= GIVE_UP
end

function Reader.Want(key, profName, link)
	local c = LI.Crafter(key)
	local profKey = LI.ProfKey(profName)
	local p = c and profKey and c.profs[profKey]
	if p and p.recipes and p.read and time() - p.read < STALE then
		return
	end
	local id = key .. "|" .. (profKey or "")
	for _, q in ipairs(queue) do
		if q.id == id then
			q.link = link
			q.at = Now()
			return
		end
	end
	table.insert(queue, { id = id, key = key, prof = profKey, link = link, at = Now() })
	while #queue > QUEUE_MAX do
		table.remove(queue, 1)
	end
end

function Reader.QueueSize()
	return #queue
end

local function ChatActive()
	local util = ChatFrameUtil and ChatFrameUtil.GetActiveWindow
	local active = util and LI.Try(util) or (ChatEdit_GetActiveWindow and LI.Try(ChatEdit_GetActiveWindow))
	return active ~= nil
end

local function Tip()
	if not tip then
		tip = CreateFrame("GameTooltip", "LinkedInnScanTip", nil, "GameTooltipTemplate")
	end
	return tip
end

local function FrameShown()
	local frame = ProfessionsFrame
	return frame and frame.IsShown and frame:IsShown() and true or false
end

local function FrameVisible()
	if not FrameShown() then
		return false
	end
	local alpha = LI.Try(ProfessionsFrame.GetAlpha, ProfessionsFrame)
	return (alpha or 1) > 0.05
end

local function Reveal()
	if concealed and ProfessionsFrame then
		LI.Try(ProfessionsFrame.SetAlpha, ProfessionsFrame, 1)
	end
	concealed = false
end

local function HookFrame()
	local frame = ProfessionsFrame
	if hooked or not frame or not frame.HookScript then
		return hooked
	end
	hooked = true
	frame:HookScript("OnShow", function(self)
		if pending then
			self:SetAlpha(0)
			concealed = true
		end
	end)
	frame:HookScript("OnHide", Reveal)
	return true
end

local function EnsureFrame()
	if not ProfessionsFrame then
		if ProfessionsFrame_LoadUI then
			LI.Try(ProfessionsFrame_LoadUI)
		elseif C_AddOns and C_AddOns.LoadAddOn then
			LI.Try(C_AddOns.LoadAddOn, "Blizzard_Professions")
		end
	end
	return HookFrame()
end

local function PanelOpen()
	if FrameShown() then
		return true
	end
	if not GetUIPanel then
		return false
	end
	for _, key in ipairs(PANELS) do
		if LI.Try(GetUIPanel, key) then
			return true
		end
	end
	return false
end

local function CloseHidden()
	if concealed then
		if C_TradeSkillUI and C_TradeSkillUI.CloseTradeSkill then
			LI.Try(C_TradeSkillUI.CloseTradeSkill)
		end
		Reveal()
	end
end

local function Finish(outcome)
	local auto = LI.test.auto
	if outcome == "ok" then
		auto.ok = auto.ok + 1
		auto.streak = 0
	elseif outcome == "timeout" then
		auto.timeout = auto.timeout + 1
		auto.streak = auto.streak + 1
	elseif outcome == "err" then
		auto.err = auto.err + 1
		auto.streak = auto.streak + 1
	end
	pending = nil
	nextAt = Now() + GAP
	LI.Fire("TestChanged")
end

local function Pump()
	if not LI.ready or not LI.settings.autoRead or pending or tradeOpen or Reader.IsBroken() then
		return
	end
	if #queue == 0 or Now() < nextAt then
		return
	end
	if InCombatLockdown and InCombatLockdown() then
		return
	end
	if ChatActive() or PanelOpen() then
		return
	end
	EnsureFrame()
	local job = table.remove(queue)
	pending = job
	job.started = Now()
	LI.test.auto.tries = LI.test.auto.tries + 1
	local t = Tip()
	LI.Try(t.SetOwner, t, WorldFrame or UIParent, "ANCHOR_NONE")
	local ok, err = pcall(t.SetHyperlink, t, job.link)
	LI.Try(t.Hide, t)
	if not ok then
		LI.Log("Automatic read failed: " .. tostring(err):sub(1, 120))
		Finish("err")
		return
	end
	LI.After(TIMEOUT, function()
		if pending == job then
			LI.Log("No reply for " .. LI.ShortName(job.key) .. "'s " .. tostring(job.prof))
			Finish("timeout")
			CloseHidden()
		end
	end)
end

function Reader.Retry()
	LI.test.auto.streak = 0
	nextAt = 0
	LI.Fire("TestChanged")
end

local function RecipeIDs()
	local api = C_TradeSkillUI
	if not api then
		return {}
	end
	local ids = api.GetAllRecipeIDs and LI.Try(api.GetAllRecipeIDs)
	if type(ids) ~= "table" or #ids == 0 then
		ids = api.GetFilteredRecipeIDs and LI.Try(api.GetFilteredRecipeIDs)
	end
	return type(ids) == "table" and ids or {}
end

local function OutputItem(recipeID)
	local api = C_TradeSkillUI
	local out = api.GetRecipeOutputItemData and LI.Try(api.GetRecipeOutputItemData, recipeID)
	if type(out) == "table" and out.itemID then
		return LI.Safe(out.itemID), LI.Safe(out.icon)
	end
	local schematic = api.GetRecipeSchematic and LI.Try(api.GetRecipeSchematic, recipeID, false)
	if type(schematic) == "table" and schematic.outputItemID then
		return LI.Safe(schematic.outputItemID), nil
	end
	return nil, nil
end

local function CollectRecipes(profKey)
	local list = {}
	for _, id in ipairs(RecipeIDs()) do
		local info = LI.Try(C_TradeSkillUI.GetRecipeInfo, id)
		if type(info) == "table" and LI.Safe(info.learned) and LI.Safe(info.name) then
			local item, outIcon = OutputItem(id)
			list[#list + 1] = {
				id = id,
				name = LI.Safe(info.name),
				icon = outIcon or LI.Safe(info.icon),
				item = item,
				kind = LI.KindOf(item, profKey),
			}
		end
	end
	return list
end

local function LinkedOwner(linkedName)
	if pending then
		return pending.key, "auto"
	end
	if clicked and Now() - clicked.at <= CLICK_WINDOW then
		return clicked.key, "click"
	end
	local key = linkedName and LI.FullName(LI.Safe(linkedName))
	if key then
		return key, "click"
	end
	return nil, nil
end

function Reader.Read()
	readScheduled = false
	local api = C_TradeSkillUI
	if not LI.ready or not api then
		return
	end
	local base = LI.Try(api.GetBaseProfessionInfo)
	local name = type(base) == "table" and LI.Safe(base.professionName)
	if not name or name == "" then
		return
	end
	if api.IsTradeSkillGuild and LI.Safe(LI.Try(api.IsTradeSkillGuild)) then
		return
	end
	if api.IsNPCCrafting and LI.Safe(LI.Try(api.IsNPCCrafting)) then
		return
	end
	local linked, linkedName = false, nil
	if api.IsTradeSkillLinked then
		linked, linkedName = LI.Try(api.IsTradeSkillLinked)
		linked = LI.Safe(linked)
	end
	local profKey = LI.ProfKey(name)
	local list = CollectRecipes(profKey)
	local icon = base.professionID and api.GetTradeSkillTexture and LI.Safe(LI.Try(api.GetTradeSkillTexture, base.professionID))
	local info = {
		name = name,
		icon = icon or LI.PROFESSION_ICONS[profKey],
		rank = LI.Safe(base.skillLevel),
		max = LI.Safe(base.maxSkillLevel),
	}
	if linked then
		if #list == 0 then
			return
		end
		if not pending and lastAuto and Now() - lastAuto.at <= AUTO_ECHO and not (clicked and clicked.at > lastAuto.at) then
			return
		end
		local key, via = LinkedOwner(linkedName)
		if not key then
			LI.Log("Read a linked " .. name .. " but could not tell whose it was")
			return
		end
		local job = pending
		local count = LI.SetRecipes(key, info, list, via)
		if job then
			lastAuto = { key = key, at = Now() }
			if FrameVisible() then
				LI.test.auto.flashed = LI.test.auto.flashed + 1
			end
			LI.Log(string.format("Read %s's %s automatically (%d recipes)", LI.ShortName(key), name, count))
			Finish("ok")
			if api.CloseTradeSkill then
				LI.Try(api.CloseTradeSkill)
			end
			Reveal()
		else
			if not clicked or clicked.counted ~= key .. "|" .. profKey then
				LI.test.click = LI.test.click + 1
				if clicked then
					clicked.counted = key .. "|" .. profKey
				end
				LI.Log(string.format("Read %s's %s from a click (%d recipes)", LI.ShortName(key), name, count))
			end
		end
	else
		Reveal()
		if #list == 0 or not LI.playerKey then
			return
		end
		info.class = select(2, LI.Try(UnitClass, "player"))
		local own = api.GetTradeSkillListLink and LI.Safe(LI.Try(api.GetTradeSkillListLink))
		if type(own) == "string" then
			local payload, text = own:match("|Htrade:([^|]+)|h%[([^%]]*)%]|h")
			if payload then
				info.link = "trade:" .. payload
				info.text = "[" .. text .. "]"
			end
		end
		local first = not (LI.crafters[LI.playerKey] and LI.crafters[LI.playerKey].profs[profKey] and LI.crafters[LI.playerKey].profs[profKey].recipes)
		local count = LI.SetRecipes(LI.playerKey, info, list, "own")
		LI.Fire("OwnRecipesChanged")
		if first then
			LI.test.own = LI.test.own + 1
			LI.Log(string.format("Saved your own %s (%d recipes)", name, count))
		end
	end
	LI.Fire("TestChanged")
end

local function ScheduleRead()
	if readScheduled then
		return
	end
	readScheduled = true
	LI.After(0.3, Reader.Read)
end

LI.On("TRADE_SKILL_SHOW", function()
	tradeOpen = true
	ScheduleRead()
end)
LI.On("TRADE_SKILL_LIST_UPDATE", function()
	if tradeOpen then
		ScheduleRead()
	end
end)
LI.On("TRADE_SKILL_DATA_SOURCE_CHANGED", function()
	if tradeOpen then
		ScheduleRead()
	end
end)
LI.On("TRADE_SKILL_CLOSE", function()
	tradeOpen = false
end)

LI.On("ADDON_LOADED", function(name)
	if name == "Blizzard_Professions" then
		HookFrame()
	end
end)

LI.Listen("Ready", function()
	if hooksecurefunc then
		hooksecurefunc("SetItemRef", function(link)
			link = LI.Safe(link)
			if type(link) ~= "string" or link:sub(1, 6) ~= "trade:" then
				return
			end
			local parsed = LI.ParseTrade(link:sub(7))
			local key = parsed and parsed.guid and LI.guids[parsed.guid]
			clicked = key and { key = key, at = Now() } or nil
		end)
	end
	LI.Every(PUMP_EVERY, Pump)
end)

Reader.Pump = Pump
