local ADDON, LI = ...

local Reader = {}
LI.Reader = Reader

local PUMP_EVERY = 0.5
local GAP = 1
local TIMEOUT = 2
local SETTLE = 1
local FAIR_TURN = 3
local readsSinceScan = 0
local PROBE_MIN = 0.3
local PROBE_MAX = 1.5
local PROBE_DEFAULT = 1.0
local latencies = {}
local GIVE_UP = 5
local PAUSE = 60
local pausedUntil = 0
local QUEUE_MAX = 30
local STALE = 3 * 86400
local CLICK_WINDOW = 20
local AUTO_ECHO = 10
local OWN_BACK = 5
local ownProf, ownAt = nil, -60
local REST = 3
local CLICK_HOLD = 1
local restUntil = 0
local lateAt = -60
local UserFrame
local userShown = false

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
local ours = false
local lastDone = GetTime and GetTime() or -60
local userClickAt = -60
local LATE = 15
local USER_CLICK = 5
local PANELS = { "left", "center", "right", "doublewide", "fullscreen" }

local function Now()
	return GetTime()
end

function Reader.IsBroken()
	return Now() < pausedUntil
end

local otherLogged = {}

function Reader.Want(key, profName, link, extra)
	if not LI.Allowed(key) then
		return
	end
	local guid = type(link) == "string" and link:match("^trade:(Player%-%d+%-%w+):")
	if LI.OtherServer(guid) then
		if not otherLogged[key] then
			otherLogged[key] = true
			LI.Log(string.format(LI.RETAIL and "%s's realm hasn't answered profession checks; skipping it for a day" or "%s is on the other realm; the game doesn't let us read their professions", LI.ShortName(key)))
		end
		return
	end
	local c = LI.Crafter(key)
	local profKey = LI.ProfKey(profName)
	local p = c and profKey and c.profs[profKey]
	if p and p.recipes and p.read and time() - p.read < STALE then
		return
	end
	if LI.IsLow(key, profKey) then
		return
	end
	local id = key .. "|" .. (profKey or "")
	if extra and extra.built and builtFailed[id] and time() - builtFailed[id] < BUILT_RETRY then
		return
	end
	for i, q in ipairs(queue) do
		if q.id == id then
			if q.built and not (extra and extra.built) then
				q.link = link
				q.built = nil
			elseif not q.built then
				q.link = link
			end
			q.at = Now()
			table.remove(queue, i)
			table.insert(queue, q)
			return
		end
	end
	local job = { id = id, key = key, prof = profKey, link = link, at = Now() }
	for k, v in pairs(extra or {}) do
		job[k] = v
	end
	table.insert(queue, job)
	while #queue > QUEUE_MAX do
		local drop = 1
		for i, q in ipairs(queue) do
			if q.built then
				drop = i
				break
			end
		end
		table.remove(queue, drop)
	end
end

local EndScan

local function Outsiders()
	if not LI.settings.guildOnly then
		return
	end
	for i = #queue, 1, -1 do
		if not LI.Allowed(queue[i].key) then
			table.remove(queue, i)
		end
	end
	for i = #probes, 1, -1 do
		if not probes[i].own and not LI.Allowed(probes[i].key) then
			table.remove(probes, i)
		end
	end
end

local function ScanLeft()
	if not scanRun or pending then
		return
	end
	for _, job in ipairs(probes) do
		if job.scan then
			return
		end
	end
	EndScan(true)
end

local function NextJob()
	for i = #queue, 1, -1 do
		if not queue[i].built then
			return table.remove(queue, i)
		end
	end
	return table.remove(queue)
end

function Reader.QueueSize()
	return #queue
end

local function MouseFocus()
	if GetMouseFoci then
		local foci = LI.Try(GetMouseFoci)
		return type(foci) == "table" and foci[1] or nil, true
	elseif GetMouseFocus then
		return LI.Try(GetMouseFocus), true
	end
	return nil, false
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

local TINY = 0.01
local savedScale, savedMouse

local function Conceal(frame)
	if not concealed then
		savedScale = LI.Try(frame.GetScale, frame) or 1
		savedMouse = LI.Try(frame.IsMouseEnabled, frame)
	end
	frame:SetAlpha(0)
	LI.Try(frame.SetScale, frame, TINY)
	LI.Try(frame.EnableMouse, frame, false)
	concealed = true
end

local function Reveal()
	if concealed and ProfessionsFrame then
		local frame = ProfessionsFrame
		LI.Try(frame.SetAlpha, frame, 1)
		LI.Try(frame.SetScale, frame, savedScale or 1)
		if savedMouse ~= nil then
			LI.Try(frame.EnableMouse, frame, savedMouse)
		end
	end
	concealed = false
end

local function LinkState()
	local api = C_TradeSkillUI
	if not api or not api.IsTradeSkillLinked then
		return nil, false
	end
	local linked, name = LI.Try(api.IsTradeSkillLinked)
	linked, name = LI.Safe(linked), LI.Safe(name)
	local mine = linked == true and type(name) == "string" and name ~= "" and LI.playerKey ~= nil and Reader.NameMatches(name, LI.playerKey)
	return linked, mine
end

local function LateReply()
	if pending or Now() - lastDone > LATE or Now() - userClickAt <= USER_CLICK then
		return false
	end
	local linked, mine = LinkState()
	return linked == true and not mine
end

local concealedHideAt = -60
local ShowOwnFrame

local function HookFrame()
	local frame = ProfessionsFrame
	if hooked or not frame or not frame.HookScript then
		return hooked
	end
	hooked = true
	frame:HookScript("OnShow", function(self)
		UserFrame(self)
	end)
	frame:HookScript("OnHide", function()
		if not concealed then
			restUntil = Now() + REST
		else
			concealedHideAt = Now()
		end
		Reveal()
	end)
	if hooksecurefunc and type(ToggleProfessionsBook) == "function" then
		hooksecurefunc("ToggleProfessionsBook", function()
			if Now() - concealedHideAt < 0.2 and not FrameShown() then
				LI.After(0, function()
					if not FrameShown() then
						ShowOwnFrame()
					end
				end)
			end
		end)
	end
	return true
end

local meter = { base = nil, open = false, untilAt = nil, worst = 0, n = 0, sum = 0, top = 0, last = 0 }
local METER_TAIL = 0.6

local function MeterTick(_, elapsed)
	if type(elapsed) ~= "number" then
		return
	end
	if meter.open then
		meter.worst = math.max(meter.worst, elapsed)
		if meter.untilAt and Now() >= meter.untilAt then
			meter.open = false
			if meter.count then
				local freeze = math.max(0, (meter.worst - (meter.base or 0)) * 1000)
				meter.n = meter.n + 1
				meter.sum = meter.sum + freeze
				meter.top = math.max(meter.top, freeze)
				meter.last = freeze
				if meter.n == 5 or meter.n % 25 == 0 then
					LI.Log(string.format("Profession loads freeze the game about %d ms on average, worst %d ms (%d loads)", math.floor(meter.sum / meter.n + 0.5), math.floor(meter.top + 0.5), meter.n))
				end
			end
		end
	elseif elapsed < 0.25 then
		meter.base = meter.base and (meter.base * 0.95 + elapsed * 0.05) or elapsed
	end
end

local function MeterStart()
	if not meter.frame and CreateFrame then
		meter.frame = CreateFrame("Frame")
		meter.frame:SetScript("OnUpdate", MeterTick)
	end
end
LI.Listen("Ready", MeterStart)

local function MeterOpen()
	MeterStart()
	meter.open, meter.untilAt, meter.worst, meter.count = true, nil, 0, false
end

local function MeterClose(counts)
	if meter.open then
		meter.count = counts
		meter.untilAt = Now() + METER_TAIL
	end
end

function Reader.Freeze()
	return meter.n, meter.n > 0 and meter.sum / meter.n or 0, meter.top
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
	if concealed or ours then
		ours = false
		if C_TradeSkillUI and C_TradeSkillUI.CloseTradeSkill then
			LI.Try(C_TradeSkillUI.CloseTradeSkill)
		end
		Reveal()
	end
end

local Kick

ShowOwnFrame = function()
	local frame = ProfessionsFrame
	if not frame or FrameShown() then
		return
	end
	if ShowUIPanel then
		LI.Try(ShowUIPanel, frame)
	end
	if not FrameShown() and frame.Show then
		LI.Try(frame.Show, frame)
	end
end

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
	EndScan()
end

EndScan = function(force)
	local run = scanRun
	if not run then
		return
	end
	if force then
		run.total = run.done
	end
	if run.done >= run.total then
		scanRun = nil
		local crafters = 0
		for _ in pairs(run.found) do
			crafters = crafters + 1
		end
		if run.quiet and run.players == 1 and run.who then
			LI.Log(string.format("Checked %s: %d %s in %.0fs", LI.ShortName(run.who), run.found[run.who] or 0, (run.found[run.who] or 0) == 1 and "profession" or "professions", Now() - run.started))
		end
		if not run.quiet then
			LI.Print(string.format("Scan done: %d %s among %d %s nearby.", crafters, crafters == 1 and "crafter" or "crafters", run.players, run.players == 1 and "player" or "players"))
			LI.Log(string.format("Scan: %d crafters among %d players", crafters, run.players))
		end
		LI.Fire("ScanDone")
	end
end

local silenced
local QUIET_EVENTS = { "TRADE_SKILL_SHOW" }
local QUIET_HOLD = 8
local holdUntil = 0
local quietTries, quietWorks, quietOff = 0, 0, false

local function Silence()
	if quietOff or not GetFramesRegisteredForEvent then
		return
	end
	quietTries = quietTries + 1
	if silenced then
		return
	end
	silenced = {}
	for _, event in ipairs(QUIET_EVENTS) do
		local frames = { LI.Try(GetFramesRegisteredForEvent, event) }
		for _, frame in ipairs(frames) do
			if type(frame) == "table" and frame ~= LI.eventFrame and frame.UnregisterEvent then
				if pcall(frame.UnregisterEvent, frame, event) then
					silenced[#silenced + 1] = { frame = frame, event = event }
				end
			end
		end
	end
end

local function Unsilence()
	if not silenced then
		return
	end
	for _, entry in ipairs(silenced) do
		pcall(entry.frame.RegisterEvent, entry.frame, entry.event)
	end
	silenced = nil
end
Reader.Unsilence = Unsilence

local function Hold()
	if not silenced then
		return
	end
	holdUntil = Now() + QUIET_HOLD
	LI.After(QUIET_HOLD + 0.1, function()
		if not pending and Now() >= holdUntil then
			Unsilence()
		end
	end)
end

function Reader.SilentReads()
	return not quietOff and GetFramesRegisteredForEvent ~= nil
end

function Reader.QuietState()
	return quietOff, quietTries, quietWorks
end

local function Finish(job, outcome)
	lastDone = Now()
	MeterClose(outcome == "ok" and not job.own)
	if not job.own and (outcome == "ok" or outcome == "timeout") and type(job.link) == "string" then
		LI.NoteServerRead(job.link:match("^trade:(Player%-[%w%-]+):"), outcome == "ok")
	end
	if silenced and outcome == "ok" then
		quietWorks = quietWorks + 1
	end
	if not quietOff and quietWorks == 0 and quietTries >= 8 then
		quietOff = true
		LI.Log("Quiet reading got no answers; reading with the hidden window instead")
	end
	if quietOff then
		Unsilence()
	else
		Hold()
	end
	if job.probe then
		pending = nil
		nextAt = math.max(nextAt, Now() + (job.scan and GAP or 2))
		if job.scan then
			ScanStep(job, outcome == "ok" and job.found == true)
		elseif LI.ProbeResult and not job.notified then
			LI.ProbeResult(job.key, outcome == "ok")
		end
		LI.After(0.01, function()
			Kick()
		end)
		return
	end
	if job.built then
		readsSinceScan = readsSinceScan + 1
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
	readsSinceScan = readsSinceScan + 1
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
	if auto.streak >= GIVE_UP then
		auto.streak = 0
		pausedUntil = Now() + PAUSE
		LI.Log(string.format("%d links in a row got no answer; pausing a minute", GIVE_UP))
	end
	pending = nil
	nextAt = math.max(Now() + GAP, pausedUntil)
	LI.Fire("TestChanged")
	LI.After(0.05, function()
		Kick()
	end)
end

local function OwnShown()
	local api = C_TradeSkillUI
	local linked, mine = LinkState()
	if linked ~= false and not mine then
		return false
	end
	if pending and pending.own then
		local base = api.GetBaseProfessionInfo and LI.Try(api.GetBaseProfessionInfo)
		local name = type(base) == "table" and LI.Safe(base.professionName)
		return type(name) == "string" and LI.ProfKey(name) ~= pending.prof
	end
	return true
end

local function Yield(why)
	local job = pending
	if not job then
		return
	end
	pending = nil
	lastDone = Now()
	Hold()
	local again = {}
	for k, v in pairs(job) do
		again[k] = v
	end
	again.replied, again.started, again.notified, again.found = nil, nil, nil, nil
	if job.probe then
		table.insert(probes, 1, again)
	else
		queue[#queue + 1] = again
	end
	LI.Log(why or "You opened a profession window; background reading waits until it closes")
end

local function UserOpened()
	ours = false
	userShown = true
	local api = C_TradeSkillUI
	local base = api and api.GetBaseProfessionInfo and LI.Try(api.GetBaseProfessionInfo)
	ownProf = type(base) == "table" and LI.Safe(base.professionID) or nil
	ownAt = Now()
	local missed = silenced ~= nil
	Unsilence()
	Yield()
	Reveal()
	if missed then
		LI.After(0, function()
			if tradeOpen then
				ShowOwnFrame()
			end
		end)
	end
end

local function ClearForUser()
	restUntil = math.max(restUntil, Now() + CLICK_HOLD)
	local hidden = tradeOpen and not FrameVisible()
	if not pending and not hidden then
		return
	end
	ours = false
	Yield("Stepped aside for your click")
	local api = C_TradeSkillUI
	if hidden and api and api.CloseTradeSkill then
		LI.Try(api.CloseTradeSkill)
	end
	Reveal()
	restUntil = math.max(restUntil, Now() + REST)
end

local function ShownBy()
	if not debugstack then
		return nil
	end
	local stack = LI.Try(debugstack, 2, 60, 0)
	if type(stack) ~= "string" then
		return nil
	end
	if stack:find("ToggleProfessionsBook", 1, true) or stack:find("MicroButton", 1, true) then
		return "user"
	end
	if stack:find("HandleTradeSkillShow", 1, true) or stack:find("ShowProfessionsFrame", 1, true) then
		return "event"
	end
	return nil
end

local function Unasked()
	if Now() - userClickAt <= USER_CLICK then
		return false
	end
	local api = C_TradeSkillUI
	if api and api.IsTradeSkillGuild and LI.Safe(LI.Try(api.IsTradeSkillGuild)) then
		return false
	end
	if api and api.IsNPCCrafting and LI.Safe(LI.Try(api.IsNPCCrafting)) then
		return false
	end
	local linked, mine = LinkState()
	return linked == true and not mine
end

local function HideUnasked(frame)
	Conceal(frame)
	ours = true
	lateAt = Now()
	LI.After(4, function()
		if concealed and not pending and FrameShown() then
			CloseHidden()
		end
	end)
	if pending then
		return
	end
	LI.Log("A profession reply tried to open the window; hid it before it showed")
	LI.After(SETTLE, function()
		if ours and not pending then
			CloseHidden()
		end
	end)
end

UserFrame = function(frame)
	if ShownBy() == "event" and Unasked() then
		HideUnasked(frame)
		return
	end
	if Reader.SilentReads() then
		if Now() - lateAt > 0.5 then
			local linked, mine = LinkState()
			local foreign = tradeOpen and linked == true and not mine and Now() - userClickAt > USER_CLICK
			UserOpened()
			if foreign then
				local api = C_TradeSkillUI
				LI.Log("Your profession window opened on someone else's book; closed it so it opens on yours next time")
				if api and api.CloseTradeSkill then
					LI.Try(api.CloseTradeSkill)
				end
			end
		end
		return
	end
	if pending or LateReply() then
		Conceal(frame)
	end
end

local Start

local function Pump()
	Outsiders()
	ScanLeft()
	if not pending and #probes == 0 and LI.DiscoverUrgent and LI.DiscoverUrgent() and LI.DiscoverStep() then
		return
	end
	if #probes > 0 then
		Kick()
		return
	end
	if not LI.ready or not LI.AutoReading() or pending or tradeOpen or FrameVisible() or Reader.IsBroken() or Now() < restUntil then
		return
	end
	if #queue == 0 or Now() < nextAt then
		return
	end
	if InCombatLockdown and InCombatLockdown() then
		return
	end
	if not Reader.SilentReads() and (ChatActive() or PanelOpen()) then
		return
	end
	local job = NextJob()
	if job.built then
		LI.test.built.tries = LI.test.built.tries + 1
	else
		LI.test.auto.tries = LI.test.auto.tries + 1
	end
	Start(job)
end

Start = function(job)
	EnsureFrame()
	MeterOpen()
	pending = job
	job.started = Now()
	local t = Tip()
	LI.Try(t.SetOwner, t, WorldFrame or UIParent, "ANCHOR_NONE")
	Silence()
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

local lastWaitLog = -30

local function Waiting(reason)
	if Now() - lastWaitLog >= 30 and probes[1] then
		lastWaitLog = Now()
		LI.Log(string.format("Checking %s has to wait: %s", LI.ShortName(probes[1].key), reason))
	end
end

Kick = function()
	if not LI.ready then
		return
	end
	Outsiders()
	ScanLeft()
	if pending then
		if #probes > 0 and Now() - (pending.started or 0) > 4 then
			Waiting(pending.probe and "another check" or "a profession read")
		end
		return
	end
	if #probes == 0 then
		CloseHidden()
		return
	end
	if FrameVisible() or (tradeOpen and Now() - ownAt <= OWN_BACK + SETTLE) or Now() < restUntil then
		Waiting("a profession window is open")
		return
	end
	if InCombatLockdown and InCombatLockdown() then
		Waiting("in combat")
		return
	end
	if not Reader.SilentReads() and PanelOpen() then
		Waiting("a game window is open")
		return
	end
	Start(table.remove(probes, 1))
end

function Reader.Probe(key, link)
	if not LI.ready or not key or type(link) ~= "string" or not LI.Allowed(key) then
		return false
	end
	if pending and pending.probe and pending.key == key then
		return true
	end
	local slot = #probes + 1
	for i, job in ipairs(probes) do
		if job.key == key and not job.scan then
			return true
		end
		if job.scan and slot > i then
			slot = i
		end
	end
	table.insert(probes, slot, { key = key, link = link, probe = true })
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

function Reader.Idle(urgent)
	if pending ~= nil or #probes > 0 then
		return false
	end
	if urgent or #queue == 0 or Now() < pausedUntil then
		return true
	end
	for _, q in ipairs(queue) do
		if not q.built then
			return false
		end
	end
	return readsSinceScan >= FAIR_TURN
end

function Reader.Scan(candidates, quiet)
	if not LI.ready or scanRun or #candidates == 0 then
		return false
	end
	readsSinceScan = 0
	local run = { total = 0, done = 0, found = {}, players = #candidates, quiet = quiet, started = Now(), who = candidates[1].key }
	for _, cand in ipairs(candidates) do
		for _, profKey in ipairs(LI.Allowed(cand.key) and cand.profs or {}) do
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

function Reader.ReadOwn(only)
	local guid = UnitGUID and LI.Safe(LI.Try(UnitGUID, "player"))
	if not LI.ready or not LI.playerKey or type(guid) ~= "string" then
		return 0
	end
	local added = 0
	for profKey, nums in pairs(LI.ownLinks or {}) do
		if not only or only == profKey then
			local queued = pending and pending.own and pending.prof == profKey
			for _, job in ipairs(probes) do
				if job.own and job.prof == profKey then
					queued = true
				end
			end
			if not queued then
				probes[#probes + 1] = {
					key = LI.playerKey,
					link = string.format("trade:%s:%d:%d", guid, nums.spell, nums.line),
					prof = profKey,
					probe = true,
					own = true,
				}
				added = added + 1
			end
		end
	end
	if added > 0 then
		Kick()
	end
	return added
end

function Reader.Busy(key)
	return pending ~= nil and pending.key == key and Now() - (pending.started or 0) < PROBE_MAX + 1
end

function Reader.Queued(key)
	for _, job in ipairs(probes) do
		if job.key == key and not job.scan and not job.own then
			return true
		end
	end
	return false
end

function Reader.Drop(key)
	for i = #probes, 1, -1 do
		local job = probes[i]
		if job.key == key and not job.scan and not job.own then
			table.remove(probes, i)
		end
	end
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
	pausedUntil = 0
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

local function KnownRecipe(id, profKey)
	local meta = LI.db.recipes[id]
	return type(meta) == "table" and meta.n ~= nil and meta.p == profKey and meta.r ~= nil and (meta.item ~= nil or meta.k == "enchant")
end

local function RecipeEntry(id, info, profKey)
	local name = LI.Safe(info.name)
	if KnownRecipe(id, profKey) then
		return { id = id, name = name }
	end
	local item, outIcon = OutputItem(id)
	local cat = LI.Safe(info.categoryID)
	if type(cat) == "number" then
		LI.NoteCategory(cat)
	else
		cat = nil
	end
	return {
		id = id,
		name = name,
		icon = outIcon or LI.Safe(info.icon),
		item = item,
		kind = LI.KindOf(item, profKey),
		cat = cat,
		reagents = LI.Reagents(id),
	}
end

local ScheduleRead

local function CollectRecipes(profKey)
	local list = {}
	for _, id in ipairs(RecipeIDs()) do
		local info = LI.Try(C_TradeSkillUI.GetRecipeInfo, id)
		if type(info) == "table" and LI.Safe(info.learned) and LI.Safe(info.name) then
			list[#list + 1] = RecipeEntry(id, info, profKey)
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

local SLICE = 250
local BUDGET_MS = 3
local collecting

local function SessionKey(api)
	local base = LI.Try(api.GetBaseProfessionInfo)
	local linked, linkedName = false, nil
	if api.IsTradeSkillLinked then
		linked, linkedName = LI.Try(api.IsTradeSkillLinked)
	end
	return table.concat({ tostring(type(base) == "table" and LI.Safe(base.professionID)), tostring(LI.Safe(linked)), tostring(LI.Safe(linkedName)) }, "|")
end

local function TierOf(api, catID, cache)
	if type(catID) ~= "number" or not api.GetCategoryInfo then
		return nil
	end
	if cache[catID] ~= nil then
		return cache[catID] or nil
	end
	local id, info, steps = catID, LI.Try(api.GetCategoryInfo, catID), 0
	while type(info) == "table" and LI.Safe(info.skillLineCurrentLevel) == nil and LI.Safe(info.parentCategoryID) and steps < 8 do
		id = LI.Safe(info.parentCategoryID)
		info = LI.Try(api.GetCategoryInfo, id)
		steps = steps + 1
	end
	local tier = false
	if type(info) == "table" and LI.Safe(info.skillLineCurrentLevel) ~= nil and LI.Safe(info.name) then
		tier = { id = id, n = LI.Safe(info.name), c = LI.Safe(info.skillLineCurrentLevel) or 0, m = LI.Safe(info.skillLineMaxLevel) or 0, o = LI.Safe(info.uiOrder) or 0 }
		if type(LI.db.cats[catID]) == "table" then
			LI.db.cats[catID].t = tier.n
			LI.db.cats[catID].to = tier.o
		end
	end
	cache[catID] = tier
	return tier or nil
end

local function Collect(profKey, done)
	if not LI.RETAIL then
		done(CollectRecipes(profKey))
		return
	end
	local api = C_TradeSkillUI
	local ids = RecipeIDs()
	local session = SessionKey(api)
	local list, i = {}, 1
	local cache, tiers = {}, {}
	local run = {}
	collecting = run
	local function Step()
		if collecting ~= run then
			return
		end
		if SessionKey(api) ~= session then
			collecting = nil
			ScheduleRead()
			return
		end
		local last = math.min(#ids, i + SLICE - 1)
		local started = debugprofilestop and debugprofilestop()
		for j = i, last do
			if started and j > i and debugprofilestop() - started > BUDGET_MS then
				last = j - 1
				break
			end
			local id = ids[j]
			local info = LI.Try(api.GetRecipeInfo, id)
			if type(info) == "table" and LI.Safe(info.learned) and LI.Safe(info.name) then
				list[#list + 1] = RecipeEntry(id, info, profKey)
				local cat = LI.Safe(info.categoryID)
				if type(cat) == "number" then
					LI.NoteCategory(cat)
					local tier = TierOf(api, cat, cache)
					if tier then
						tiers[tier.id] = tier
					end
				end
			end
		end
		i = last + 1
		if i <= #ids then
			LI.After(0, Step)
		else
			collecting = nil
			local sorted = {}
			for _, tier in pairs(tiers) do
				sorted[#sorted + 1] = { n = tier.n, c = tier.c, m = tier.m, o = tier.o }
			end
			table.sort(sorted, function(a, b)
				if a.o ~= b.o then
					return a.o < b.o
				end
				return a.n < b.n
			end)
			list.tiers = #sorted > 0 and sorted or nil
			done(list)
		end
	end
	Step()
end

local function AfterCollect(fn, job, tries)
	local waiting = collecting or (job and not job.readDone)
	if waiting and ((tries or 0) < 40 or (collecting and (tries or 0) < 300)) then
		LI.After(0.1, function()
			AfterCollect(fn, job, (tries or 0) + 1)
		end)
		return
	end
	fn()
end

local Store

function Reader.Read()
	readScheduled = false
	local api = C_TradeSkillUI
	if not LI.ready or not api or collecting then
		return
	end
	if ((api.IsDataSourceChanging and LI.Safe(LI.Try(api.IsDataSourceChanging))) or (api.IsTradeSkillReady and LI.Safe(LI.Try(api.IsTradeSkillReady)) == false)) then
		ScheduleRead()
		return
	end
	local base = LI.Try(api.GetBaseProfessionInfo)
	local name = type(base) == "table" and LI.Safe(base.professionName)
	if not name or name == "" then
		return
	end
	local job = pending
	if (api.IsTradeSkillGuild and LI.Safe(LI.Try(api.IsTradeSkillGuild))) or (api.IsNPCCrafting and LI.Safe(LI.Try(api.IsNPCCrafting))) then
		if job then
			job.readDone = true
		end
		return
	end
	local linked, linkedName = false, nil
	if api.IsTradeSkillLinked then
		linked, linkedName = LI.Try(api.IsTradeSkillLinked)
		linked = LI.Safe(linked)
	end
	local profKey = LI.ProfKeyForLine(LI.Safe(base.professionID)) or LI.ProfKey(name)
	Collect(profKey, function(list)
		if job then
			job.readDone = true
		end
		Store(api, base, name, linked, linkedName, profKey, list)
	end)
end

Store = function(api, base, name, linked, linkedName, profKey, list)
	local icon = base.professionID and api.GetTradeSkillTexture and LI.Safe(LI.Try(api.GetTradeSkillTexture, base.professionID))
	local info = {
		key = profKey,
		name = name,
		icon = icon or LI.PROFESSION_ICONS[profKey],
		rank = LI.Safe(base.skillLevel),
		max = LI.Safe(base.maxSkillLevel),
	}
	if LI.RETAIL and api.GetChildProfessionInfo then
		local child = LI.Try(api.GetChildProfessionInfo)
		local childMax = type(child) == "table" and LI.Safe(child.maxSkillLevel)
		if type(childMax) == "number" and childMax > 0 then
			info.rank = LI.Safe(child.skillLevel)
			info.max = childMax
			info.tier = LI.Safe(child.expansionName) or LI.Safe(child.professionName)
		end
	end
	info.tiers = list.tiers
	local newest = list.tiers and list.tiers[1]
	if newest and (not info.max or info.max == 0) then
		info.rank, info.max, info.tier = newest.c, newest.m, newest.n
	end
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
		if job and job.own then
			via = "own"
		end
		local count = LI.SetRecipes(key, info, list, via)
		if job then
			lastAuto = { key = key, at = Now() }
			if job.own then
				LI.Fire("OwnRecipesChanged")
				LI.Log(string.format("Read your own %s (%d recipes)", name, count))
			elseif job.built or job.scan then
				local c = LI.crafters[key]
				if c then
					c.class = c.class or job.class
					c.where = job.where or c.where
				end
				job.found = count > 0
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
		local ownJob = pending and pending.own and pending or nil
		if not ownJob then
			Reveal()
		end
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
		if ownJob then
			lastAuto = { key = LI.playerKey, at = Now() }
			CloseHidden()
			Finish(ownJob, "ok")
		end
	end
	LI.Fire("TestChanged")
end

ScheduleRead = function()
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
	local short = LI.ShortName(LI.FullName(name) or "")
	return (short:match("^(.-)%-[^%-]+$") or short):lower()
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
	LI.After(SETTLE, function()
		AfterCollect(function()
			if pending == job then
				CloseHidden()
				Finish(job, "ok")
			end
		end, job)
	end)
end

LI.On("TRADE_SKILL_SHOW", function()
	tradeOpen = true
	if OwnShown() then
		UserOpened()
	elseif Now() - userClickAt <= USER_CLICK then
		ours = false
	elseif pending then
		ours = true
	elseif silenced then
		ours = true
		lateAt = Now()
		LI.Log("A late reply arrived while the window was muted; read and closed it unseen")
		LI.After(SETTLE, function()
			if ours and not pending then
				CloseHidden()
			end
		end)
	elseif LateReply() then
		ours = true
		lateAt = Now()
		LI.Log("A late reply opened a profession window; closed it")
		LI.After(0, function()
			if ours and not pending and FrameShown() then
				Conceal(ProfessionsFrame)
			end
		end)
		LI.After(SETTLE, function()
			if not pending then
				CloseHidden()
			end
		end)
	else
		ours = false
	end
	userShown = not ours
	Replied()
	ScheduleRead()
end)
local function OnInterface()
	local focus, known = MouseFocus()
	if not known then
		return true
	end
	return focus ~= nil and focus ~= WorldFrame
end

LI.On("GLOBAL_MOUSE_DOWN", function()
	if LI.ready and OnInterface() then
		ClearForUser()
	end
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
LI.On("PLAYER_REGEN_DISABLED", function()
	Unsilence()
end)

LI.On("PLAYER_LOGOUT", function()
	Unsilence()
end)

LI.On("PLAYER_ENTERING_WORLD", function()
	lastDone = Now()
end)

LI.On("TRADE_SKILL_CLOSE", function()
	if userShown then
		restUntil = Now() + REST
	end
	userShown = false
	tradeOpen = false
	ours = false
	LI.After(0.01, function()
		Kick()
	end)
end)

LI.On("ADDON_LOADED", function(name)
	if name == "Blizzard_Professions" then
		HookFrame()
	end
end)

LI.On("NEW_RECIPE_LEARNED", function(recipeID)
	recipeID = LI.Safe(recipeID)
	if not LI.ready then
		return
	end
	local prof = type(recipeID) == "number" and LI.ProfessionOfRecipe(recipeID) or nil
	LI.After(3, function()
		Reader.ReadOwn(prof)
	end)
end)

LI.Listen("Ready", function()
	LI.After(15, function()
		Reader.ReadOwn()
	end)
	if hooksecurefunc then
		hooksecurefunc("SetItemRef", function(link)
			link = LI.Safe(link)
			if type(link) ~= "string" or link:sub(1, 6) ~= "trade:" then
				return
			end
			userClickAt = Now()
			Unsilence()
			local parsed = LI.ParseTrade(link:sub(7))
			local key = parsed and parsed.guid and LI.guids[parsed.guid]
			clicked = key and { key = key, at = Now() } or nil
		end)
	end
	LI.Every(PUMP_EVERY, Pump)
end)

Reader.Pump = Pump
