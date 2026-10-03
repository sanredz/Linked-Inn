local ADDON, LI = ...

local Reader = {}
LI.Reader = Reader

local PUMP_EVERY = 2
local GAP = 8
local TIMEOUT = 3
local PROBE_MIN = 0.3
local PROBE_MAX = 1.5
local PROBE_DEFAULT = 1.0
local latencies = {}
local GIVE_UP = 5
local QUEUE_MAX = 30
local STALE = 3 * 86400
local CLICK_WINDOW = 20
local AUTO_ECHO = 10

local queue = {}
local builtFailed = {}
local scanRun
local BUILT_RETRY = 3600
local probes = {}
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

function Reader.Want(key, profName, link, extra)
	local c = LI.Crafter(key)
	local profKey = LI.ProfKey(profName)
	local p = c and profKey and c.profs[profKey]
	if p and p.recipes and p.read and time() - p.read < STALE then
		return
	end
	local id = key .. "|" .. (profKey or "")
	if extra and extra.built and builtFailed[id] and time() - builtFailed[id] < BUILT_RETRY then
		return
	end
	for _, q in ipairs(queue) do
		if q.id == id then
			q.link = link
			q.at = Now()
			return
		end
	end
	local job = { id = id, key = key, prof = profKey, link = link, at = Now() }
	for k, v in pairs(extra or {}) do
		job[k] = v
	end
	table.insert(queue, job)
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
	if FrameShown() and not concealed then
		return true
	end
	if not GetUIPanel then
		return false
	end
	for _, key in ipairs(PANELS) do
		local panel = LI.Try(GetUIPanel, key)
		if panel and not (concealed and panel == ProfessionsFrame) then
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

local Kick

local function ScanStep(job, ok)
	local run = scanRun
	if not run then
		return
	end
	run.done = run.done + 1
	if ok then
		run.found[job.key] = (run.found[job.key] or 0) + 1
		if run.found[job.key] >= 2 then
			for i = #probes, 1, -1 do
				if probes[i].scan and probes[i].key == job.key then
					table.remove(probes, i)
					run.total = run.total - 1
				end
			end
		end
	end
	LI.Fire("StatusChanged")
	if run.done >= run.total then
		scanRun = nil
		local crafters = 0
		for _ in pairs(run.found) do
			crafters = crafters + 1
		end
		LI.Print(string.format("Scan done: %d %s among %d %s nearby.", crafters, crafters == 1 and "crafter" or "crafters", run.players, run.players == 1 and "player" or "players"))
		LI.Log(string.format("Scan: %d crafters among %d players", crafters, run.players))
		LI.Fire("ScanDone")
	end
end

local function Finish(job, outcome)
	if job.probe then
		pending = nil
		nextAt = math.max(nextAt, Now() + 2)
		if job.scan then
			ScanStep(job, outcome == "ok")
		elseif LI.ProbeResult and not job.notified then
			LI.ProbeResult(job.key, outcome == "ok")
		end
		LI.After(0.01, function()
			Kick()
		end)
		return
	end
	if job.built then
		local built = LI.test.built
		if outcome == "ok" then
			built.ok = built.ok + 1
		else
			built.timeout = built.timeout + 1
			builtFailed[job.id] = time()
			LI.Log("Built " .. tostring(job.prof) .. " link for " .. LI.ShortName(job.key) .. ": no reply")
		end
		pending = nil
		nextAt = Now() + GAP
		LI.Fire("TestChanged")
		LI.After(0.05, function()
			Kick()
		end)
		return
	end
	local auto = LI.test.auto
	if outcome == "ok" then
		auto.ok = auto.ok + 1
		auto.streak = 0
	elseif outcome == "timeout" then
		auto.timeout = auto.timeout + 1
		auto.streak = auto.streak + 1
		if LI.MarkOffline then
			LI.MarkOffline(job.key)
		end
	elseif outcome == "err" then
		auto.err = auto.err + 1
		auto.streak = auto.streak + 1
	end
	pending = nil
	nextAt = Now() + GAP
	LI.Fire("TestChanged")
	LI.After(0.05, function()
		Kick()
	end)
end

local Start

local function Pump()
	if #probes > 0 then
		Kick()
		return
	end
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
	local job = table.remove(queue)
	if job.built then
		LI.test.built.tries = LI.test.built.tries + 1
	else
		LI.test.auto.tries = LI.test.auto.tries + 1
	end
	Start(job)
end

Start = function(job)
	EnsureFrame()
	pending = job
	job.started = Now()
	local t = Tip()
	LI.Try(t.SetOwner, t, WorldFrame or UIParent, "ANCHOR_NONE")
	local ok, err = pcall(t.SetHyperlink, t, job.link)
	LI.Try(t.Hide, t)
	if not ok then
		LI.Log("Automatic read failed: " .. tostring(err):sub(1, 120))
		Finish(job, "err")
		return
	end
	LI.After(job.probe and Reader.ProbeTimeout() or TIMEOUT, function()
		if pending == job and not job.replied then
			if not job.probe then
				LI.Log("No reply for " .. LI.ShortName(job.key) .. "'s " .. tostring(job.prof) .. ", probably offline")
			end
			if not job.probe then
				CloseHidden()
			end
			Finish(job, "timeout")
		end
	end)
end

Kick = function()
	if pending or not LI.ready then
		return
	end
	if #probes == 0 then
		CloseHidden()
		return
	end
	if tradeOpen and FrameVisible() then
		return
	end
	if (InCombatLockdown and InCombatLockdown()) or PanelOpen() then
		return
	end
	Start(table.remove(probes, 1))
end

function Reader.Probe(key, link)
	if not LI.ready or not key or type(link) ~= "string" then
		return false
	end
	if pending and pending.probe and pending.key == key then
		return true
	end
	for _, job in ipairs(probes) do
		if job.key == key then
			return true
		end
	end
	probes[#probes + 1] = { key = key, link = link, probe = true }
	Kick()
	return true
end

function Reader.Scanning()
	return scanRun ~= nil
end

function Reader.ScanProgress()
	if not scanRun then
		return nil
	end
	return scanRun.done, scanRun.total
end

function Reader.Scan(candidates)
	if not LI.ready or scanRun or #candidates == 0 then
		return false
	end
	local run = { total = 0, done = 0, found = {}, players = #candidates }
	for _, cand in ipairs(candidates) do
		for _, profKey in ipairs(cand.profs) do
			local link = LI.BuildLink(cand.guid, profKey)
			if link then
				probes[#probes + 1] = { key = cand.key, link = link, prof = profKey, probe = true, scan = true, class = cand.class, where = cand.where }
				run.total = run.total + 1
			end
		end
	end
	if run.total == 0 then
		return false
	end
	scanRun = run
	LI.Fire("StatusChanged")
	Kick()
	return true
end

function Reader.Busy(key)
	return pending ~= nil and pending.key == key and Now() - (pending.started or 0) < PROBE_MAX + 1
end

LI.On("UI_ERROR_MESSAGE", function(_, msg)
	msg = LI.Safe(msg)
	if pending and pending.probe and type(msg) == "string" then
		LI.Log("While checking " .. LI.ShortName(pending.key) .. ": " .. msg)
	end
end)

LI.On("CHAT_MSG_SYSTEM", function(msg)
	msg = LI.Safe(msg)
	if pending and pending.probe and type(msg) == "string" then
		LI.Log("While checking " .. LI.ShortName(pending.key) .. ": " .. msg)
	end
end)

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
			local cat = LI.Safe(info.categoryID)
			if type(cat) == "number" then
				LI.NoteCategory(cat)
			else
				cat = nil
			end
			list[#list + 1] = {
				id = id,
				name = LI.Safe(info.name),
				icon = outIcon or LI.Safe(info.icon),
				item = item,
				kind = LI.KindOf(item, profKey),
				cat = cat,
				reagents = LI.Reagents(id),
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
		if pending and not Reader.NameMatches(LI.Safe(linkedName), pending.key) then
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
			if job.built or job.scan then
				local c = LI.crafters[key]
				if c then
					c.class = c.class or job.class
					c.where = job.where or c.where
				end
				LI.Log(string.format("%s %s link for %s: %d recipes", job.scan and "Scan found" or "Built", name, LI.ShortName(key), count))
			elseif not job.probe then
				if FrameVisible() then
					LI.test.auto.flashed = LI.test.auto.flashed + 1
				end
				LI.Log(string.format("Read %s's %s automatically (%d recipes)", LI.ShortName(key), name, count))
			end
			if api.CloseTradeSkill then
				LI.Try(api.CloseTradeSkill)
			end
			Reveal()
			Finish(job, "ok")
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

function Reader.ProbeTimeout()
	if #latencies == 0 then
		return PROBE_DEFAULT
	end
	local worst = 0
	for _, v in ipairs(latencies) do
		worst = math.max(worst, v)
	end
	return math.min(PROBE_MAX, math.max(PROBE_MIN, worst * 2))
end

local function Plain(name)
	return LI.ShortName(LI.FullName(name) or ""):lower()
end

function Reader.NameMatches(linkedName, key)
	if type(linkedName) ~= "string" or linkedName == "" then
		return true
	end
	local a, b = Plain(linkedName), Plain(key)
	if a == b then
		return true
	end
	local fa, fb = a:match("^(%S+)"), b:match("^(%S+)")
	return (a == fb) or (b == fa)
end

local function Replied()
	local job = pending
	if not job or job.replied then
		return
	end
	local api = C_TradeSkillUI
	if api and api.IsTradeSkillLinked then
		local linked, linkedName = LI.Try(api.IsTradeSkillLinked)
		if LI.Safe(linked) == false then
			return
		end
		if not Reader.NameMatches(LI.Safe(linkedName), job.key) then
			return
		end
	end
	job.replied = Now()
	table.insert(latencies, job.replied - (job.started or job.replied))
	while #latencies > 10 do
		table.remove(latencies, 1)
	end
	if job.probe and not job.notified and LI.ProbeResult then
		job.notified = true
		LI.ProbeResult(job.key, true)
	end
	LI.After(TIMEOUT, function()
		if pending == job then
			CloseHidden()
			Finish(job, "ok")
		end
	end)
end

LI.On("TRADE_SKILL_SHOW", function()
	tradeOpen = true
	Replied()
	ScheduleRead()
end)
LI.On("TRADE_SKILL_LIST_UPDATE", function()
	Replied()
	if tradeOpen then
		ScheduleRead()
	end
end)
LI.On("TRADE_SKILL_DATA_SOURCE_CHANGED", function()
	Replied()
	if tradeOpen then
		ScheduleRead()
	end
end)
LI.On("TRADE_SKILL_CLOSE", function()
	tradeOpen = false
	LI.After(0.01, function()
		Kick()
	end)
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
