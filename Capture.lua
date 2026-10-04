local ADDON, LI = ...

local FORMAT_SAMPLES = 6

local EVENTS = {
	CHAT_MSG_CHANNEL = false,
	CHAT_MSG_SAY = "Say",
	CHAT_MSG_YELL = "Yell",
	CHAT_MSG_EMOTE = "Emote",
	CHAT_MSG_GUILD = "Guild",
	CHAT_MSG_OFFICER = "Guild",
	CHAT_MSG_PARTY = "Party",
	CHAT_MSG_PARTY_LEADER = "Party",
	CHAT_MSG_RAID = "Raid",
	CHAT_MSG_RAID_LEADER = "Raid",
	CHAT_MSG_INSTANCE_CHAT = "Instance",
	CHAT_MSG_INSTANCE_CHAT_LEADER = "Instance",
	CHAT_MSG_WHISPER = "Whisper",
}

function LI.ParseTrade(payload)
	if type(payload) ~= "string" then
		return nil
	end
	local guid, numbers, longest = nil, {}, 0
	for field in (payload .. ":"):gmatch("([^:]*):") do
		if not guid and field:find("^Player%-") then
			guid = field
		elseif field:match("^%-?%d+$") then
			numbers[#numbers + 1] = tonumber(field)
		end
		longest = math.max(longest, #field)
	end
	return { guid = guid, numbers = numbers, longest = longest, payload = payload }
end

local function ProfessionName(text)
	text = LI.Trim(text)
	local after = text:match("^.-'s%s+(.+)$")
	return after or text
end

local function SpellIcon(spellID)
	if not spellID then
		return nil
	end
	if C_Spell and C_Spell.GetSpellTexture then
		local icon = LI.Safe(LI.Try(C_Spell.GetSpellTexture, spellID))
		if icon then
			return icon
		end
	end
	if GetSpellTexture then
		return LI.Safe(LI.Try(GetSpellTexture, spellID))
	end
	return nil
end

local function KeyFromGUID(guid)
	if not guid or not GetPlayerInfoByGUID then
		return nil, nil
	end
	local _, classFile, _, _, _, name, realm = LI.Try(GetPlayerInfoByGUID, guid)
	name, realm, classFile = LI.Safe(name), LI.Safe(realm), LI.Safe(classFile)
	if type(name) ~= "string" or name == "" then
		return nil, classFile
	end
	if type(realm) == "string" and realm ~= "" and not name:find("-", 1, true) then
		name = name .. "-" .. realm:gsub("[%s%-]", "")
	end
	return LI.FullName(name), classFile
end

local function NoteFormat(parsed, text)
	local formats = LI.test.formats
	local shape = string.format("%d fields, longest %d", #parsed.numbers + (parsed.guid and 1 or 0), parsed.longest)
	for _, f in ipairs(formats) do
		if f.shape == shape then
			f.count = (f.count or 1) + 1
			return
		end
	end
	if #formats < FORMAT_SAMPLES then
		formats[#formats + 1] = { shape = shape, sample = ("trade:" .. parsed.payload):sub(1, 160), text = text, count = 1 }
	end
end

local function Where(event, channelBase)
	local label = EVENTS[event]
	if label then
		return label
	end
	channelBase = LI.Safe(channelBase)
	if type(channelBase) == "string" and channelBase ~= "" then
		return (channelBase:gsub("%s*%-.*$", ""))
	end
	return "Chat"
end

local function RecipeLinks(msg)
	local profs = {}
	for kind, id in msg:gmatch("|H(%a+):(%d+)") do
		id = tonumber(id)
		local recipe
		if kind == "enchant" or kind == "spell" then
			recipe = id
		elseif kind == "item" then
			recipe = LI.RecipeForItem(id)
		end
		local profKey = recipe and LI.ProfessionOfRecipe(recipe)
		if profKey and not LI.GATHERING[profKey] then
			profs[profKey] = true
		end
	end
	return profs
end

LI.Listen("Ready", function()
	for _, c in pairs(LI.crafters) do
		for profKey, p in pairs(c.profs) do
			local have = LI.db.profLinks[profKey]
			if (not have or have.default) and type(p.link) == "string" then
				local parsed = LI.ParseTrade(p.link:match("^trade:(.+)$"))
				if parsed then
					LI.NoteProfLink(profKey, parsed.numbers)
				end
			end
		end
	end
end)

function LI.TryBuilt(msg, senderKey, senderGUID, event, channelBase)
	if not msg:find("|H", 1, true) or msg:find("|Htrade:", 1, true) then
		return
	end
	for profKey in pairs(RecipeLinks(msg)) do
		local link = LI.BuildLink(senderGUID, profKey)
		if link then
			local _, classFile = KeyFromGUID(senderGUID)
			LI.Reader.Want(senderKey, LI.PROFESSION_NAMES[profKey] or profKey, link, {
				built = true,
				class = classFile,
				where = Where(event, channelBase),
			})
		else
			LI.Log("Saw a " .. profKey .. " recipe from " .. LI.ShortName(senderKey) .. ", but no " .. profKey .. " link to copy yet")
		end
	end
end

function LI.HandleChat(event, msg, sender, channelBase, senderGUID)
	if not LI.ready or type(msg) ~= "string" then
		return
	end
	local senderKey = type(sender) == "string" and LI.FullName(sender) or nil
	if senderKey and LI.crafters[senderKey] then
		LI.MarkSeen(senderKey)
	end
	if not LI.Allowed(senderKey) then
		return
	end
	if senderKey and senderGUID and LI.Discover then
		LI.Discover(senderKey, senderGUID, LI.PRIO.chat)
	end
	if senderKey and senderKey ~= LI.playerKey and senderGUID then
		LI.TryBuilt(msg, senderKey, senderGUID, event, channelBase)
	end
	if not msg:find("|Htrade:", 1, true) then
		return
	end
	for payload, text in msg:gmatch("|Htrade:([^|]+)|h%[([^%]]*)%]|h") do
		local parsed = LI.ParseTrade(payload)
		if parsed then
			LI.test.links = LI.test.links + 1
			NoteFormat(parsed, text)
			local key, classFile
			if parsed.guid and senderGUID and parsed.guid == senderGUID then
				key = senderKey
				classFile = select(2, KeyFromGUID(parsed.guid))
			elseif parsed.guid then
				key, classFile = KeyFromGUID(parsed.guid)
				key = key or (LI.guids and LI.guids[parsed.guid])
			else
				key = senderKey
			end
			local name = ProfessionName(text)
			if key and not LI.Allowed(key) then
				LI.NoteProfLink(LI.ProfKey(name), parsed.numbers)
			elseif key and LI.IsLow(key, LI.ProfKey(name)) then
				LI.NoteProfLink(LI.ProfKey(name), parsed.numbers)
			elseif key then
				local spellID = parsed.numbers[1]
				LI.NoteProfLink(LI.ProfKey(name), parsed.numbers)
				local info = {
					name = name,
					icon = SpellIcon(spellID) or LI.PROFESSION_ICONS[LI.ProfKey(name) or ""],
					link = "trade:" .. payload,
					text = "[" .. text .. "]",
					guid = parsed.guid,
					class = classFile,
					where = Where(event, channelBase),
				}
				local isNew = LI.NoteProfession(key, info)
				if isNew then
					LI.Log(string.format("New: %s linked %s in %s", LI.ShortName(key), name, info.where))
				end
				if LI.Reader and key ~= LI.playerKey then
					LI.Reader.Want(key, name, info.link)
				end
			else
				LI.Log("Could not tell whose " .. tostring(text) .. " link that was")
			end
		end
	end
	LI.Fire("TestChanged")
end

local HIDE_IN = {
	CHAT_MSG_CHANNEL = true,
	CHAT_MSG_SAY = true,
	CHAT_MSG_YELL = true,
}

function LI.HideLink(_, event, msg, sender)
	if not LI.ready or not LI.settings.hideLinks or not HIDE_IN[event] then
		return false
	end
	msg = LI.Safe(msg)
	if type(msg) ~= "string" or not msg:find("|Htrade:", 1, true) then
		return false
	end
	sender = LI.Safe(sender)
	if type(sender) == "string" and LI.FullName(sender) == LI.playerKey then
		return false
	end
	return true
end

LI.Listen("Ready", function()
	local addFilter = (ChatFrameUtil and ChatFrameUtil.AddMessageEventFilter) or ChatFrame_AddMessageEventFilter
	if addFilter then
		for event in pairs(HIDE_IN) do
			LI.Try(addFilter, event, LI.HideLink)
		end
	end
end)

for event in pairs(EVENTS) do
	LI.On(event, function(msg, sender, _, _, _, _, _, _, channelBase, _, _, senderGUID)
		LI.HandleChat(event, LI.Safe(msg), LI.Safe(sender), channelBase, LI.Safe(senderGUID))
	end)
end
