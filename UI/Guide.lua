local ADDON, LI = ...

local Guide = {}
LI.Guide = Guide

local WIDTH, HEIGHT = 400, 330
local TITLE_FONT = "Fonts\\MORPHEUS.TTF"

local PAGES = {
	{
		icon = nil,
		title = "Welcome to Linked Inn",
		body = "Linked Inn keeps a list of every crafter you come across and everything they can make.\n\nYou don't have to do anything: it fills up while you play. Search for an item and you'll see who can make it, who's online right now, and whisper them with one click.",
	},
	{
		icon = "Interface\\Icons\\INV_Misc_Spyglass_02",
		title = "Helping it fill up",
		body = "Profession links in chat, people crafting near you, your group and your guild are all checked quietly in the background.\n\nIn cities, friendly nameplates (Shift+V) find a lot more crafters. Other Linked Inn users share their whole list with you right away.",
	},
	{
		icon = "Interface\\Icons\\INV_Misc_Note_01",
		title = "Getting things made",
		body = "Click a profession icon to see someone's recipes, then click a recipe to ask them to make it.\n\nNobody around? The Work tab lets you post what you need, and crafters who can make it get a notice. The gear at the top has the settings.",
	},
}

local frame
local page = 1

local function Seen()
	LI.db.guideSeen = true
end

local function Paint()
	local p = PAGES[page]
	frame.icon:SetTexture(p.icon or LI.ICON)
	frame.head:SetText(p.title)
	frame.body:SetText(p.body)
	for i, dot in ipairs(frame.dots) do
		dot:SetVertexColor(1, 0.82, 0, i == page and 1 or 0.25)
	end
	frame.back:SetEnabled(page > 1)
	frame.next:SetText(page < #PAGES and "Next" or "Get started")
end

local function Create()
	frame = CreateFrame("Frame", "LinkedInnGuide", UIParent, "ButtonFrameTemplate")
	frame:SetSize(WIDTH, HEIGHT)
	frame:SetPoint("CENTER", 0, 60)
	frame:SetFrameStrata("DIALOG")
	frame:EnableMouse(true)
	if frame.SetTitle then
		frame:SetTitle(LI.TITLE)
	end
	if frame.SetPortraitToAsset then
		LI.Try(frame.SetPortraitToAsset, frame, LI.ICON)
	end
	if ButtonFrameTemplate_HideButtonBar then
		LI.Try(ButtonFrameTemplate_HideButtonBar, frame)
	end
	tinsert(UISpecialFrames, "LinkedInnGuide")
	LI.Theme.Skin(frame, nil, { card = false })
	frame.icon = frame:CreateTexture(nil, "ARTWORK")
	frame.icon:SetSize(48, 48)
	frame.icon:SetPoint("TOP", 0, -28)
	frame.head = frame:CreateFontString(nil, "OVERLAY", "GameFontNormalLarge")
	frame.head:SetFont(TITLE_FONT, 22, "")
	frame.head:SetTextColor(1, 0.82, 0)
	frame.head:SetPoint("TOP", frame.icon, "BOTTOM", 0, -10)
	frame.body = frame:CreateFontString(nil, "OVERLAY", "GameFontHighlight")
	frame.body:SetWidth(WIDTH - 60)
	frame.body:SetJustifyH("CENTER")
	frame.body:SetSpacing(3)
	frame.body:SetPoint("TOP", frame.head, "BOTTOM", 0, -12)
	frame.dots = {}
	for i = 1, #PAGES do
		local dot = frame:CreateTexture(nil, "ARTWORK")
		dot:SetSize(8, 8)
		dot:SetColorTexture(1, 1, 1, 1)
		dot:SetPoint("BOTTOM", (i - (#PAGES + 1) / 2) * 14, 44)
		frame.dots[i] = dot
	end
	frame.back = LI.Theme.Button(CreateFrame("Button", nil, frame, "UIPanelButtonTemplate"))
	frame.back:SetSize(90, 22)
	frame.back:SetPoint("BOTTOMLEFT", 16, 14)
	frame.back:SetText("Back")
	frame.back:SetScript("OnClick", function()
		page = math.max(1, page - 1)
		Paint()
	end)
	frame.next = LI.Theme.Button(CreateFrame("Button", nil, frame, "UIPanelButtonTemplate"))
	frame.next:SetSize(110, 22)
	frame.next:SetPoint("BOTTOMRIGHT", -16, 14)
	frame.next:SetScript("OnClick", function()
		if page < #PAGES then
			page = page + 1
			Paint()
		else
			frame:Hide()
		end
	end)
	frame:SetScript("OnHide", Seen)
	frame:Hide()
end

function Guide.Show(at)
	if not LI.ready then
		return
	end
	if not frame then
		Create()
	end
	page = at or 1
	Paint()
	frame:Show()
end

function Guide.Frame()
	return frame
end

function Guide.MaybeShow()
	if LI.ready and not LI.db.guideSeen then
		Guide.Show(1)
	end
end

function Guide.CreateButton(parent)
	local b = CreateFrame("Button", nil, parent)
	b:SetSize(18, 18)
	b.text = b:CreateFontString(nil, "OVERLAY", "GameFontNormal")
	b.text:SetPoint("CENTER", 0, 0)
	b.text:SetText("?")
	b:SetScript("OnClick", function()
		Guide.Show(1)
	end)
	b:SetScript("OnEnter", function(self)
		self.text:SetTextColor(1, 1, 1)
		GameTooltip:SetOwner(self, "ANCHOR_TOP")
		GameTooltip:SetText("How Linked Inn works", 1, 0.82, 0)
		GameTooltip:Show()
	end)
	b:SetScript("OnLeave", function(self)
		self.text:SetTextColor(1, 0.82, 0)
		GameTooltip:Hide()
	end)
	return b
end
