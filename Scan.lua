local ADDON, LI = ...

local Scan = {}
LI.Scan = Scan

local PLATES = "nameplateShowFriendlyPlayers"
local CHECK_EVERY = 3

local active = false
local startedAt = 0
local startedInCity = false

local function CVar()
	local getter = (C_CVar and C_CVar.GetCVar) or GetCVar
	return getter and LI.Safe(LI.Try(getter, PLATES)) or nil
end

local function SetCVarValue(value)
	local setter = (C_CVar and C_CVar.SetCVar) or SetCVar
	if setter and value ~= nil then
		LI.Try(setter, PLATES, tostring(value))
	end
end

function LI.ReadsChat()
	local s = LI.settings
	if not s or not s.autoRead or s.readChat == false then
		return false
	end
	return not LI.RETAIL or active or (LI.InCity ~= nil and LI.InCity())
end

function LI.ReadsNearby()
	local s = LI.settings
	if not s or not s.autoRead then
		return false
	end
	if LI.RETAIL then
		return active
	end
	return s.readNearby ~= false
end

function Scan.StopsInCity()
	return startedInCity
end

function Scan.Needed()
	return LI.RETAIL == true
end

function Scan.Active()
	return active
end

function Scan.Since()
	return active and startedAt or nil
end

function Scan.Found()
	if not active then
		return 0
	end
	local n = 0
	for key, c in pairs(LI.crafters or {}) do
		if key ~= LI.playerKey and type(c) == "table" and type(c.profs) == "table" then
			for _, p in pairs(c.profs) do
				if type(p) == "table" and (p.read or 0) >= startedAt then
					n = n + 1
					break
				end
			end
		end
	end
	return n
end

local function RestorePlates()
	local saved = LI.settings and LI.settings.scanPlates
	if saved ~= nil then
		SetCVarValue(saved)
		LI.settings.scanPlates = nil
	end
end

function Scan.Stop(why)
	if not active then
		return false
	end
	local found = Scan.Found()
	active = false
	RestorePlates()
	LI.Print(string.format("Scan stopped%s. %s read.", why and (": " .. why) or "", found == 1 and "1 crafter" or (found .. " crafters")))
	LI.Log(string.format("Scan stopped%s after %d seconds, %d crafters read", why and (" (" .. why .. ")") or "", math.floor(time() - startedAt), found))
	LI.Fire("StatusChanged")
	return true
end

function Scan.Start()
	if active or not LI.ready then
		return false
	end
	if InCombatLockdown and InCombatLockdown() then
		LI.Print("Can't start a scan in combat.")
		return false
	end
	if not LI.settings.autoRead then
		LI.settings.autoRead = true
	end
	active = true
	startedAt = time()
	startedInCity = LI.InCity and LI.InCity() or false
	if LI.settings.scanPlates == nil then
		LI.settings.scanPlates = CVar() or "0"
	end
	SetCVarValue("1")
	LI.After(0.5, function()
		if active and LI.ReadPlates then
			LI.ReadPlates()
		end
	end)
	LI.Print("Scanning for crafters. Expect the odd hitch while it runs; it stops when you leave the city or enter combat.")
	LI.Log("Scan started")
	LI.Fire("StatusChanged")
	if LI.DiscoverStep then
		LI.After(1, LI.DiscoverStep)
	end
	return true
end

function Scan.Toggle()
	if active then
		return Scan.Stop()
	end
	return Scan.Start()
end

local function Check()
	if not active then
		return
	end
	if InCombatLockdown and InCombatLockdown() then
		Scan.Stop("you entered combat")
		return
	end
	local inInstance = IsInInstance and LI.Safe(LI.Try(IsInInstance))
	if inInstance then
		Scan.Stop("you entered an instance")
		return
	end
	local inCity = LI.InCity and LI.InCity()
	if inCity then
		startedInCity = true
	elseif startedInCity then
		Scan.Stop("you left the city")
	end
end

LI.On("PLAYER_REGEN_DISABLED", function()
	Scan.Stop("you entered combat")
end)
LI.On("PLAYER_LOGOUT", function()
	RestorePlates()
end)
LI.Listen("Ready", function()
	RestorePlates()
	LI.Every(CHECK_EVERY, Check)
end)
