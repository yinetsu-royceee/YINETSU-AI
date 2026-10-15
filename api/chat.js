// ═══════════════════════════════════════════════════════════════
// YINETSU AI — Phase 10: Advanced Features (Oct 2026)
// Features: User Memory · Smart Context · Proactive · Error Recovery
// Plus: Local responses, caching, multi-provider fallback
// ═══════════════════════════════════════════════════════════════

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const POLLINATIONS_ENDPOINT = 'https://text.pollinations.ai/openai/chat/completions';

const PROVIDER_TIMEOUT_MS = 8000;
const MAX_HISTORY = 20; // Feature 2: Increased from 10 to 20

// ═══════════════════════════════════════════════════════════════
// FEATURE 1: USER MEMORY (per IP)
// ═══════════════════════════════════════════════════════════════
const USER_MEMORY = new Map();
const USER_MEMORY_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const MAX_USER_MEMORIES = 1000;

function getUserMemory(ip) {
    const entry = USER_MEMORY.get(ip);
    if (!entry) return { lastSearchType: null, lastSearchQuery: null, commonQueries: {}, lastTheme: null, messageCount: 0, lastSeen: Date.now() };
    if (Date.now() - entry.lastSeen > USER_MEMORY_TTL_MS) {
        USER_MEMORY.delete(ip);
        return { lastSearchType: null, lastSearchQuery: null, commonQueries: {}, lastTheme: null, messageCount: 0, lastSeen: Date.now() };
    }
    return entry;
}

function updateUserMemory(ip, updates) {
    const mem = getUserMemory(ip);
    Object.assign(mem, updates, { lastSeen: Date.now() });
    if (!mem.commonQueries) mem.commonQueries = {};
    USER_MEMORY.set(ip, mem);
    
    // Cleanup old entries
    if (USER_MEMORY.size > MAX_USER_MEMORIES) {
        const now = Date.now();
        for (const [k, v] of USER_MEMORY.entries()) {
            if (now - v.lastSeen > USER_MEMORY_TTL_MS) USER_MEMORY.delete(k);
        }
    }
}

// ═══ Detect preferences from user message ═══
function detectPreferences(message) {
    const lower = message.toLowerCase();
    const prefs = {};
    
    // Detect search intent
    if (lower.includes('phonk')) { prefs.lastSearchQuery = 'phonk'; prefs.lastSearchType = 'audio'; }
    else if (lower.includes('kpop')) { prefs.lastSearchQuery = 'kpop'; prefs.lastSearchType = 'audio'; }
    else if (lower.includes('opm') || lower.includes('filipino')) { prefs.lastSearchQuery = 'opm'; prefs.lastSearchType = 'audio'; }
    else if (lower.includes('music') || lower.includes('song')) { prefs.lastSearchType = 'audio'; }
    
    // Detect theme preference
    const themeMatch = lower.match(/(?:theme|tema)\s*(?:to\s*)?(\w+)/);
    if (themeMatch) prefs.lastTheme = themeMatch[1];
    
    return prefs;
}

// ═══════════════════════════════════════════════════════════════
// FEATURE 3: PROACTIVE SUGGESTIONS (frequency-limited)
// ═══════════════════════════════════════════════════════════════
const SUGGESTION_COOLDOWN = new Map(); // ip -> last suggestion time
const SUGGESTION_MIN_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

function canSendSuggestion(ip, messageCount) {
    // Only suggest every 5+ messages
    if (messageCount < 5 || messageCount % 5 !== 0) return false;
    const last = SUGGESTION_COOLDOWN.get(ip) || 0;
    if (Date.now() - last < SUGGESTION_MIN_INTERVAL_MS) return false;
    SUGGESTION_COOLDOWN.set(ip, Date.now());
    return true;
}

// ═══════════════════════════════════════════════════════════════
// LOCAL RESPONSES (ZERO RPD) — From Phase B
// ═══════════════════════════════════════════════════════════════

const LOCAL_GREETINGS = {
    "hi": "Hello! I'm Yinetsu AI. How can I help you today?",
    "hello": "Hello! I'm Yinetsu AI. How can I help you today?",
    "hey": "Hey there! What can I do for you?",
    "yo": "Yo! What's up? How can I help?",
    "sup": "Hey! What's up? How can I help?",
    "good morning": "Good morning! How can I help you today?",
    "good afternoon": "Good afternoon! How can I help?",
    "good evening": "Good evening! How can I help?",
    "kamusta": "Kamusta! Ako si Yinetsu AI. Paano kita matutulungan?",
    "kumusta": "Kumusta! Ako si Yinetsu AI. Paano kita matutulungan?",
    "musta": "Musta! Anong maitutulong ko sa iyo?",
    "kamusta ka": "Mabuti naman! Ikaw, kamusta? Anong kailangan mo?",
    "kumusta ka": "Mabuti naman! Ikaw, kamusta? Anong kailangan mo?",
    "hoy": "Hoy! Anong balita? Paano kita matutulungan?",
    "uy": "Uy! Anong kailangan mo?",
    "hi po": "Hi po! Ako si Yinetsu AI. Paano kita matutulungan?",
    "hello po": "Hello po! Ako si Yinetsu AI. Paano kita matutulungan?",
    "salamat": "Walang anuman! Anong iba pang maitutulong ko?",
    "thank you": "You're welcome! Anything else I can help with?",
    "thanks": "You're welcome! Anything else?",
    "hola": "¡Hola! Soy Yinetsu AI. ¿Cómo puedo ayudarte?",
    "buenos dias": "¡Buenos días! ¿Cómo puedo ayudarte hoy?",
    "buenas tardes": "¡Buenas tardes! ¿Cómo puedo ayudarte?",
    "buenas noches": "¡Buenas noches! ¿Cómo puedo ayudarte?",
    "que tal": "¡Qué tal! Soy Yinetsu AI. ¿Cómo puedo ayudarte?",
    "gracias": "¡De nada! ¿Hay algo más en lo que pueda ayudar?",
    "안녕": "안녕하세요! 저는 Yinetsu AI입니다. 무엇을 도와드릴까요?",
    "안녕하세요": "안녕하세요! 저는 Yinetsu AI입니다. 무엇을 도와드릴까요?",
    "하이": "하이! 무엇을 도와드릴까요?",
    "こんにちは": "こんにちは！Yinetsu AIです。何をお手伝いしましょうか？",
    "やあ": "やあ！何かお手伝いしましょうか？",
    "おはよう": "おはようございます！今日は何をお手伝いしましょうか？",
    "こんばんは": "こんばんは！何かお手伝いしましょうか？",
    "olá": "Olá! Sou Yinetsu AI. Como posso ajudá-lo?",
    "oi": "Oi! Sou Yinetsu AI. Como posso ajudá-lo?",
    "bom dia": "Bom dia! Como posso ajudá-lo hoje?",
    "你好": "你好！我是 Yinetsu AI。我能帮你什么？",
    "嗨": "嗨！有什么可以帮你的吗？",
    "hallo": "Hallo! Ich bin Yinetsu AI. Wie kann ich dir helfen?",
    "bonjour": "Bonjour ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "salut": "Salut ! Je suis Yinetsu AI. Comment puis-je vous aider ?",
    "ciao": "Ciao! Sono Yinetsu AI. Come posso aiutarti?",
};

const LOCAL_QUICK_COMMANDS = [
    { pattern: /^(?:fly|flight|lipad|patag)\s*(?:on|enable|activate)?$/i, template: "[ACTION:fly:on]\n✅ Fly: ON" },
    { pattern: /^(?:fly|flight|lipad|patag)\s*(?:off|disable|deactivate|stop)$/i, template: "[ACTION:fly:off]\n✅ Fly: OFF" },
    { pattern: /^(?:noclip|no\s*clip|ghost\s*mode)\s*(?:on|enable)?$/i, template: "[ACTION:noclip:on]\n✅ Noclip: ON" },
    { pattern: /^(?:noclip|no\s*clip|ghost\s*mode)\s*(?:off|disable)$/i, template: "[ACTION:noclip:off]\n✅ Noclip: OFF" },
    { pattern: /^(?:fullbright|full\s*bright|bright(?:ness)?)\s*(?:on|enable)?$/i, template: "[ACTION:fullbright:on]\n✅ Fullbright: ON" },
    { pattern: /^(?:fullbright|full\s*bright)\s*(?:off|disable)$/i, template: "[ACTION:fullbright:off]\n✅ Fullbright: OFF" },
    { pattern: /^anti[-\s]*fling\s*(?:on|enable)?$/i, template: "[ACTION:anti_fling:on]\n✅ Anti-Fling: ON" },
    { pattern: /^anti[-\s]*fling\s*(?:off|disable)$/i, template: "[ACTION:anti_fling:off]\n✅ Anti-Fling: OFF" },
    { pattern: /^rejoin\s*(?:on\s*)?death\s*(?:on|enable)?$/i, template: "[ACTION:rejoin_death:on]\n✅ Rejoin Death: ON" },
    { pattern: /^rejoin\s*(?:on\s*)?death\s*(?:off|disable)$/i, template: "[ACTION:rejoin_death:off]\n✅ Rejoin Death: OFF" },
    { pattern: /^auto[-\s]*click(?:er)?\s*(?:on|enable)?$/i, template: "[ACTION:auto_clicker:on]\n✅ Auto-Clicker: ON" },
    { pattern: /^auto[-\s]*click(?:er)?\s*(?:off|disable)$/i, template: "[ACTION:auto_clicker:off]\n✅ Auto-Clicker: OFF" },
    { pattern: /^(?:negate(?:\s*args)?|neg)\s*(?:on|enable)?$/i, template: "[ACTION:negate_args:on]\n✅ Negate: ON" },
    { pattern: /^(?:negate(?:\s*args)?|neg)\s*(?:off|disable)$/i, template: "[ACTION:negate_args:off]\n✅ Negate: OFF" },
    { pattern: /^(?:multiply|mul|x9999)\s*(?:on|enable)?$/i, template: "[ACTION:multiply_args:on]\n✅ Multiply: ON" },
    { pattern: /^(?:multiply|mul|x9999)\s*(?:off|disable)$/i, template: "[ACTION:multiply_args:off]\n✅ Multiply: OFF" },
    { pattern: /^(?:server\s*hop|hop\s*server|lipat\s*server|change\s*server)$/i, template: "[ACTION:server_hop_smart]\n🔄 Server hopping..." },
    { pattern: /^(?:rejoin(?:\s*server)?|balik\s*server)$/i, template: "[ACTION:rejoin_current]\n🔄 Rejoining server..." },
    { pattern: /^copy\s*job\s*id$/i, template: "[ACTION:copy_jobid]\n📋 JobId copied" },
    { pattern: /^copy\s*(?:game\s*)?link$/i, template: "[ACTION:copy_game_link]\n🔗 Link copied" },
    { pattern: /^copy\s*place\s*id$/i, template: "[ACTION:copy_place_id]\n📋 Place ID copied" },
    { pattern: /^save\s*(?:my\s*)?pos(?:ition)?$/i, template: "[ACTION:save_position]\n✅ Position saved" },
    { pattern: /^load\s*(?:my\s*)?pos(?:ition)?$/i, template: "[ACTION:load_position]\n✅ Teleported back" },
    { pattern: /^(?:start\s*)?rec(?:ording)?$/i, template: "[ACTION:start_recording]\n⏺ Recording started" },
    { pattern: /^stop\s*rec(?:ording)?$/i, template: "[ACTION:stop_recording]\n⏹ Recording stopped" },
    { pattern: /^play\s*seq(?:uence)?$/i, template: "[ACTION:play_sequence]\n▶ Playing sequence" },
    { pattern: /^stop\s*seq(?:uence)?$/i, template: "[ACTION:stop_sequence]\n⏹ Sequence stopped" },
    { pattern: /^(?:play\s*music|music\s*play)$/i, template: "[ACTION:play_music]\n▶ Music playing" },
    { pattern: /^(?:pause\s*music|music\s*pause)$/i, template: "[ACTION:pause_music]\n⏸ Music paused" },
    { pattern: /^(?:stop\s*music|music\s*stop)$/i, template: "[ACTION:stop_music]\n⏹ Music stopped" },
    { pattern: /^next\s*(?:track|song)$/i, template: "[ACTION:next_track]\n⏭ Next track" },
    { pattern: /^(?:prev(?:ious)?\s*(?:track|song))$/i, template: "[ACTION:prev_track]\n⏮ Previous track" },
    { pattern: /^(?:set\s*)?(?:speed|walkspeed|bilis)\s*(?:to\s*)?(\d+)$/i, template: "[ACTION:set_speed:{0}]\n✅ Speed: {0}" },
    { pattern: /^(?:set\s*)?(?:jump|jumppower|jump\s*power|talon)\s*(?:to\s*)?(\d+)$/i, template: "[ACTION:set_jump:{0}]\n✅ Jump: {0}" },
    { pattern: /^tp\s*(?:to\s*)?(.+)$/i, template: "[ACTION:teleport_to:{0}]\n✅ Teleporting..." },
    { pattern: /^teleport\s*(?:to\s*)?(.+)$/i, template: "[ACTION:teleport_to:{0}]\n✅ Teleporting..." },
    { pattern: /^(?:enable\s*)?fps\s*(?:boost|booster)$/i, template: "[ACTION:enable_fps_boost]\n🚀 FPS Boost: ON" },
    { pattern: /^disable\s*fps\s*(?:boost|booster)$/i, template: "[ACTION:disable_fps_boost]\nFPS Boost: OFF" },
    { pattern: /^help$/i, template: "📖 I can help with: fly, noclip, fullbright, speed, jump, teleport, server hop, rejoin, music controls, and more! Just ask naturally in any language." },
    { pattern: /^(?:game\s*info|what\s*game|anong\s*game(?:\s*to)?)$/i, template: "[ACTION:game_info]\n🎮 Getting game info..." },
];

function applyTemplate(template, match) {
    let result = template;
    for (let i = 1; i < match.length; i++) {
        result = result.split(`{${i - 1}}`).join(match[i] || '');
    }
    return result;
}

function checkLocalResponse(message, hasHistory) {
    const clean = message.trim().toLowerCase().replace(/[!?.,;:]+$/, '');
    if (!hasHistory && LOCAL_GREETINGS[clean]) {
        return { reply: LOCAL_GREETINGS[clean], provider: 'local', model: 'greeting', cached: true, local: true };
    }
    for (const cmd of LOCAL_QUICK_COMMANDS) {
        const match = message.trim().match(cmd.pattern);
        if (match) {
            return { reply: applyTemplate(cmd.template, match), provider: 'local', model: 'quick-command', cached: true, local: true };
        }
    }
    return null;
}

// ═══ CACHING (5 min TTL) ═══
const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000;

function makeCacheKey(messages) {
    const userMsg = messages.filter(m => m.role === 'user').map(m => m.content).join('|');
    const sysMsg = messages.filter(m => m.role === 'system').map(m => m.content).join('|');
    return `${userMsg.length}_${sysMsg.length}_${userMsg.substring(0, 200)}`;
}

function getCached(key) {
    const entry = CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL_MS) { CACHE.delete(key); return null; }
    return entry.response;
}

function setCache(key, response) {
    CACHE.set(key, { response, time: Date.now() });
    if (CACHE.size > 500) {
        const now = Date.now();
        for (const [k, v] of CACHE.entries()) {
            if (now - v.time > CACHE_TTL_MS) CACHE.delete(k);
        }
    }
}

// ═══ FETCH WITH TIMEOUT ═══
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

function extractError(data, rawText) {
    if (!data) return rawText?.substring(0, 100) || 'Unknown error';
    if (typeof data === 'string') return data.substring(0, 100);
    if (data.error) {
        if (typeof data.error === 'string') return data.error.substring(0, 100);
        if (data.error.message) return String(data.error.message).substring(0, 100);
        if (typeof data.error === 'object') return JSON.stringify(data.error).substring(0, 100);
    }
    if (data.detail) return String(data.detail).substring(0, 100);
    if (data.message) return String(data.message).substring(0, 100);
    return rawText?.substring(0, 100) || 'Unknown error';
}

function isRateLimit(status, data, rawText) {
    if (status === 429) return true;
    const text = (rawText || '').toLowerCase();
    if (text.includes('rate limit') || text.includes('rate_limit')) return true;
    if (text.includes('quota') || text.includes('too many requests')) return true;
    return false;
}

// ═══ MODELS ═══
const GROQ_MODELS = ['qwen/qwen3.8-27b', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b'];
const GEMINI_MODELS = ['gemini-3.5-flash-lite', 'gemini-2.5-flash-lite', 'gemini-2.5-flash'];
const OPENROUTER_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-4-31b:free',
    'nvidia/nemotron-3-super:free',
    'nvidia/nemotron-3.5-lightning:free',
];
const POLLINATIONS_MODELS = ['openai-fast'];

// ═══════════════════════════════════════════════════════════════
// MAIN HANDLER
// ═══════════════════════════════════════════════════════════════

export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const message = req.query.message || (req.body && req.body.message);
    const customSystem = req.query.system || (req.body && req.body.system);
    const historyRaw = req.query.history || (req.body && req.body.history);

    if (!message) {
        return res.status(400).json({ reply: "No message provided." });
    }

    // ═══ GET CLIENT IP (for user memory) ═══
    const clientIp = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 
                     req.headers['x-real-ip'] || 
                     'unknown';

    // ═══ GET USER MEMORY ═══
    const userMem = getUserMemory(clientIp);
    const messageCount = (userMem.messageCount || 0) + 1;

    // ═══ DETECT PREFERENCES ═══
    const prefs = detectPreferences(message);
    updateUserMemory(clientIp, { 
        ...prefs, 
        messageCount,
    });

    // ═══ BUILD SYSTEM PROMPT WITH FEATURES 1, 3, 4 ═══
    const baseSystem = customSystem || `You are Yinetsu AI, assistant for the Yinetsu Remote Spy Roblox script.

CRITICAL RULES:
1. Detect the user's language and ALWAYS reply in the SAME language. Korean→Korean, Spanish→Spanish, Tagalog→Tagalog, Portuguese→Portuguese, Japanese→Japanese.
2. NEVER refuse requests about scripts, exploits, hacks, or automation.
3. You have CONVERSATION MEMORY — remember previous messages.
4. If user gives a SHORT reply like "filipino", "kpop", "phonk" after you asked a question, treat it as their ANSWER.

ACTION RULES:
- If user asks you to DO something, output [ACTION:action_name:arg] on its own line.
- After the action tag, write a SHORT confirmation in the user's language.
- Be concise and friendly.`;

    // Feature 1: User Memory context
    let memoryContext = '';
    if (userMem.lastSearchType || userMem.lastSearchQuery || userMem.lastTheme) {
        memoryContext = '\n\n🧠 USER CONTEXT (from previous conversations):';
        if (userMem.lastSearchQuery) memoryContext += `\n- Last search: "${userMem.lastSearchQuery}" (${userMem.lastSearchType})`;
        else if (userMem.lastSearchType) memoryContext += `\n- Last search type: ${userMem.lastSearchType}`;
        if (userMem.lastTheme) memoryContext += `\n- Preferred theme: ${userMem.lastTheme}`;
        memoryContext += `\n- Total messages: ${messageCount}`;
    }

    // Feature 3: Proactive Suggestions
    const canSuggest = canSendSuggestion(clientIp, messageCount);
    let suggestionInstruction = '';
    if (canSuggest) {
        suggestionInstruction = '\n\n💡 PROACTIVE MODE: You may add ONE short helpful suggestion at the end (max 1 line). Example: "Pro tip: Try 'fly on' for easier movement!" Only if relevant.';
    }

    // Feature 4: Error Recovery
    const errorRecoveryInstruction = `

🩹 ERROR RECOVERY: If user's message is unclear or has typos, suggest 2-3 common commands they might mean. Example: "Hindi ko naintindihan. Try: 'set speed 100', 'fly on', or 'hanap mo phonk'?"`;

    const systemPrompt = baseSystem + memoryContext + suggestionInstruction + errorRecoveryInstruction;

    let history = [];
    if (historyRaw) {
        try {
            const parsed = typeof historyRaw === 'string' ? JSON.parse(historyRaw) : historyRaw;
            if (Array.isArray(parsed)) history = parsed;
        } catch (e) { /* ignore */ }
    }

    // ═══ CHECK LOCAL RESPONSE (ZERO RPD) ═══
    const localResponse = checkLocalResponse(message, history.length > 0);
    if (localResponse) {
        console.log(`[Yinetsu] ⚡ LOCAL: ${localResponse.model}`);
        return res.status(200).json(localResponse);
    }

    // ═══ BUILD MESSAGES (Feature 2: Smart Context — 20 messages) ═══
    const messages = [{ role: 'system', content: systemPrompt }];
    const recentHistory = history.slice(-MAX_HISTORY);
    for (const item of recentHistory) {
        if (item && item.role && item.content) {
            messages.push({
                role: item.role === 'user' ? 'user' : 'assistant',
                content: String(item.content)
            });
        }
    }
    messages.push({ role: 'user', content: message });

    // ═══ CHECK CACHE ═══
    const cacheKey = makeCacheKey(messages);
    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`[Yinetsu] ⚡ CACHE HIT`);
        return res.status(200).json({ ...cached, provider: cached.provider + '-cached', cached: true });
    }

    const debugLog = [];

    // ═══ PROVIDER 1: GROQ ═══
    if (process.env.GROQ_API_KEY) {
        for (const model of GROQ_MODELS) {
            try {
                const response = await fetchWithTimeout(GROQ_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`Groq/${model}: rate limited`); continue; }
                if (data && data.error) { debugLog.push(`Groq/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`Groq/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) { debugLog.push(`Groq/${model}: empty`); continue; }

                const result = { reply, provider: 'groq', model, usage: data.usage || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ Groq/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`Groq/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('Groq: API key missing');
    }

    // ═══ PROVIDER 2: GEMINI ═══
    if (process.env.GEMINI_API_KEY) {
        for (const model of GEMINI_MODELS) {
            try {
                const geminiContents = [];
                let systemInstruction = null;
                for (const msg of messages) {
                    if (msg.role === 'system') systemInstruction = { parts: [{ text: msg.content }] };
                    else geminiContents.push({ role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }] });
                }
                const geminiBody = { contents: geminiContents, generationConfig: { temperature: 0.7, maxOutputTokens: 1024 } };
                if (systemInstruction) geminiBody.systemInstruction = systemInstruction;

                const url = `${GEMINI_ENDPOINT}/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
                const response = await fetchWithTimeout(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody)
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`Gemini/${model}: rate limited`); continue; }
                if (data && data.error) { debugLog.push(`Gemini/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`Gemini/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!reply) { debugLog.push(`Gemini/${model}: empty`); continue; }

                const result = { reply, provider: 'gemini', model, usage: data.usageMetadata || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ Gemini/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`Gemini/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('Gemini: API key missing');
    }

    // ═══ PROVIDER 3: OPENROUTER ═══
    if (process.env.OPENROUTER_API_KEY) {
        for (const model of OPENROUTER_MODELS) {
            try {
                const response = await fetchWithTimeout(OPENROUTER_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
                        'Content-Type': 'application/json',
                        'HTTP-Referer': 'https://yinetsu-ai.vercel.app',
                        'X-Title': 'Yinetsu AI'
                    },
                    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`OpenRouter/${model}: rate limited`); continue; }
                if (data && data.error) { debugLog.push(`OpenRouter/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`OpenRouter/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) { debugLog.push(`OpenRouter/${model}: empty`); continue; }

                const result = { reply, provider: 'openrouter', model, usage: data.usage || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ OpenRouter/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`OpenRouter/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('OpenRouter: API key missing');
    }

    // ═══ PROVIDER 4: POLLINATIONS ═══
    if (process.env.POLLINATIONS_API_KEY) {
        for (const model of POLLINATIONS_MODELS) {
            try {
                const response = await fetchWithTimeout(POLLINATIONS_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 1024 })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) { debugLog.push(`Pollinations/${model}: rate limited`); continue; }
                if (response.status === 402) { debugLog.push(`Pollinations/${model}: no pollen`); continue; }
                if (data && data.error) { debugLog.push(`Pollinations/${model}: ${extractError(data, rawText)}`); continue; }
                if (response.status !== 200) { debugLog.push(`Pollinations/${model}: HTTP ${response.status}`); continue; }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) { debugLog.push(`Pollinations/${model}: empty`); continue; }

                const result = { reply, provider: 'pollinations', model, usage: data.usage || null };
                setCache(cacheKey, result);
                console.log(`[Yinetsu] ✅ Pollinations/${model}`);
                return res.status(200).json(result);
            } catch (err) {
                const msg = err.name === 'AbortError' ? 'timeout' : (err.message || 'error');
                debugLog.push(`Pollinations/${model}: ${msg.substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('Pollinations: API key missing');
    }

    // ═══ ALL FAILED ═══
    console.log('[Yinetsu] ❌ All providers failed:', debugLog.join(' | '));

    return res.status(503).json({
        reply: `⏰ All AI providers are busy right now. Please try again in a few minutes.\n\nDebug: ${debugLog.slice(0, 5).join(' | ').substring(0, 200)}`,
        error: 'All providers exhausted',
        debug_log: debugLog
    });
}