local ADDON, LI = ...

local Premium = {}
LI.Premium = Premium

local CLICKS = 7
local WINDOW = 4
local CHECK = "Interface\\RAIDFRAME\\ReadyCheck-Ready"

local QUIPS = {
	"Premium can't be cancelled. That's what makes it premium.",
	"Your Premium is already as premium as it gets.",
	"Thank you for your continued superiority.",
	"Premium support is available. It's this message.",
	"Still premium. Still smug. Still free.",
}

local clicks = {}
local check

function Premium.Has()
	return LI.db and LI.db.premium == true
end

local function TitleText(main)
	if main.liTitle then
		return main.liTitle
	end
	local box = main.TitleContainer
	return (box and box.TitleText) or main.TitleText
end

local function Show()
	if check then
		check:SetShown(Premium.Has())
	end
end

function Premium.Unlock()
	if Premium.Has() then
		return false
	end
	LI.db.premium = true
	Show()
	if PlaySound and SOUNDKIT and SOUNDKIT.IG_QUEST_LIST_COMPLETE then
		LI.Try(PlaySound, SOUNDKIT.IG_QUEST_LIST_COMPLETE)
	end
	LI.Print("|cffffd100Linked Inn Premium activated.|r You now get exactly the same crafters as everyone else, but you get them smugly.")
	return true
end

function Premium.Click()
	local now = GetTime()
	clicks[#clicks + 1] = now
	while clicks[1] and now - clicks[1] > WINDOW do
		table.remove(clicks, 1)
	end
	if #clicks >= CLICKS then
		clicks = {}
		return Premium.Unlock()
	end
	return false
end

function Premium.Attach(main)
	local hit = CreateFrame("Button", nil, main)
	hit:SetSize(62, 62)
	if main.emblem then
		hit:SetAllPoints(main.emblem)
	else
		hit:SetPoint("TOPLEFT", main, "TOPLEFT", -4, 6)
	end
	hit:SetFrameLevel(main:GetFrameLevel() + 10)
	hit:RegisterForClicks("LeftButtonUp")
	hit:SetScript("OnClick", Premium.Click)
	main.premiumHit = hit

	check = CreateFrame("Button", nil, main)
	check:SetSize(16, 16)
	local title = TitleText(main)
	if title then
		check:SetPoint("LEFT", title, "RIGHT", 4, 0)
	else
		check:SetPoint("TOP", main, "TOP", 46, -4)
	end
	check:SetFrameLevel(main:GetFrameLevel() + 10)
	check.icon = check:CreateTexture(nil, "OVERLAY")
	check.icon:SetAllPoints()
	check.icon:SetTexture(CHECK)
	if check.icon.SetDesaturated then
		check.icon:SetDesaturated(true)
	end
	check.icon:SetVertexColor(0.45, 0.72, 1)
	check:SetScript("OnEnter", function(self)
		GameTooltip:SetOwner(self, "ANCHOR_BOTTOM")
		GameTooltip:SetText("Linked Inn Premium", 0.45, 0.72, 1)
		GameTooltip:AddLine("Verified better than regular Linked Inn users.", 1, 1, 1, true)
		GameTooltip:AddLine("Benefits: this checkmark.", 0.62, 0.6, 0.56)
		GameTooltip:AddLine("Price: seven clicks and your dignity.", 0.62, 0.6, 0.56)
		GameTooltip:Show()
	end)
	check:SetScript("OnLeave", function()
		GameTooltip:Hide()
	end)
	check:SetScript("OnClick", function()
		LI.Print(QUIPS[math.random(#QUIPS)])
	end)
	main.premiumCheck = check
	Show()
end
