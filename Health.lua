local ADDON, LI = ...

local Health = {}
LI.Health = Health

local JOIN_GRACE = 60
local RANK = { ok = 1, warn = 2, bad = 3 }
local WORD = { ok = "All good", warn = "Worth a look", bad = "Not working" }
local COLOR = { ok = { 0.55, 0.82, 0.55 }, warn = { 0.92, 0.76, 0.42 }, bad = { 0.88, 0.48, 0.45 } }
local TEXTURE = {
	ok = "Interface\\COMMON\\Indicator-Green",
	warn = "Interface\\COMMON\\Indicator-Yellow",
	bad = "Interface\\COMMON\\Indicator-Red",
}

local function Worst(a, b)
	return RANK[b] > RANK[a] and b or a
end

local function Plural(n, one, many)
	return string.format("%d %s", n, n == 1 and one or many)
end

function Health.Compute()
	local rows, level = {}, "ok"
	local function Add(title, text, rowLevel, counts)
		rows[#rows + 1] = { title = title, text = text, level = rowLevel }
		if counts then
			level = Worst(level, rowLevel)
		end
	end
	local Sync, Reader = LI.Sync, LI.Reader
	if not LI.ready or not Sync then
		return "warn", { { title = "Linked Inn", text = "starting", level = "warn" } }
	end
	local since = GetTime() - (LI.readyAt or GetTime())
	if LI.settings.guildOnly then
		Add("Hidden channel", "off (Guild and friends only)", "ok", true)
	elseif Sync.IsJoined() then
		Add("Hidden channel", "joined", "ok", true)
	elseif since < JOIN_GRACE then
		Add("Hidden channel", "joining", "warn", false)
	else
		Add("Hidden channel", "not joined", "bad", true)
	end
	Add("Linked Inn users", Plural(Sync.LiveCount(), "heard recently", "heard recently"), "ok", false)
	local s = Sync.session
	if Sync.IsPaused() then
		Add("Sending", "paused (combat or instance)", "ok", false)
	elseif s.failed == 0 then
		local held = s.throttled > 0 and string.format(", %d held back by the game and sent later", s.throttled) or ""
		Add("Sending", string.format("%s sent%s", Plural(s.sent, "message", "messages"), held), "ok", true)
	else
		local ratio = s.failed / math.max(1, s.sent + s.failed)
		Add("Sending", string.format("%d of %d refused by the game", s.failed, s.sent + s.failed), (ratio < 0.05 or s.failed < 3) and "warn" or "bad", true)
	end
	if Reader then
		local waiting = Reader.QueueSize()
		if not LI.settings.autoRead then
			Add("Reading", "off in settings", "ok", false)
		elseif Reader.IsBroken() then
			Add("Reading", "paused a minute after several failed reads", "warn", true)
		else
			Add("Reading", waiting > 0 and string.format("working, %d waiting", waiting) or "working", "ok", true)
		end
	end
	if LI.Bridge and not LI.RETAIL and not LI.settings.guildOnly then
		local friends = #LI.Bridge.Friends()
		Add("Battle.net friends", friends > 0 and Plural(friends, "friend in Forever", "friends in Forever") or "none in Forever right now", "ok", false)
	end
	return level, rows
end

function Health.Paint(dot)
	local level = Health.Compute()
	dot.level = level
	dot.icon:SetTexture(TEXTURE[level])
	if dot.icon.SetDesaturated then
		dot.icon:SetDesaturated(true)
	end
	local c = COLOR[level]
	dot.icon:SetVertexColor(c[1], c[2], c[3], 0.95)
end

function Health.Tooltip(owner)
	local level, rows = Health.Compute()
	local c = COLOR[level]
	GameTooltip:SetOwner(owner, "ANCHOR_TOP")
	GameTooltip:SetText("Linked Inn network", 1, 0.82, 0)
	GameTooltip:AddLine(WORD[level], c[1], c[2], c[3])
	for _, row in ipairs(rows) do
		local rc = COLOR[row.level]
		GameTooltip:AddDoubleLine(row.title, row.text, 0.9, 0.88, 0.82, rc[1], rc[2], rc[3])
	end
	GameTooltip:AddLine(" ")
	GameTooltip:AddLine("Type /li status for details.", 0.62, 0.6, 0.56)
	GameTooltip:Show()
end

function Health.Create(parent)
	local dot = CreateFrame("Button", nil, parent)
	dot:SetSize(16, 16)
	dot.icon = dot:CreateTexture(nil, "ARTWORK")
	dot.icon:SetAllPoints()
	dot:SetScript("OnEnter", function(self)
		Health.Tooltip(self)
	end)
	dot:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	Health.Paint(dot)
	LI.Every(5, function()
		if dot:IsVisible() then
			Health.Paint(dot)
		end
	end)
	return dot
end
