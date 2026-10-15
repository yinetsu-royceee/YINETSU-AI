// ═══════════════════════════════════════════════════════════════
// YINETSU AI — Multi-Provider Fallback + Optimization (Oct 2026)
// Features: Caching · Timeout · Error Handling · Smart Retry
// NO RATE LIMIT — all users have equal access
// ═══════════════════════════════════════════════════════════════

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
const POLLINATIONS_ENDPOINT = 'https://text.pollinations.ai/openai/chat/completions';

// ═══ PROVIDER TIMEOUT (8 seconds per provider) ═══
const PROVIDER_TIMEOUT_MS = 8000;

// ═══ CACHING (in-memory, 5 minutes TTL) ═══
const CACHE = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// ═══ GROQ MODELS ═══
const GROQ_MODELS = [
    'qwen/qwen3.8-27b',
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
];

// ═══ GEMINI MODELS ═══
const GEMINI_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
];

// ═══ OPENROUTER MODELS ═══
const OPENROUTER_MODELS = [
    'meta-llama/llama-3.3-70b-instruct:free',
    'meta-llama/llama-3.1-8b-instruct:free',
    'google/gemma-4-31b:free',
    'nvidia/nemotron-3-super:free',
    'nvidia/nemotron-3.5-lightning:free',
];

// ═══ POLLINATIONS MODELS ═══
const POLLINATIONS_MODELS = [
    'openai-fast',
];

// ═══════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════

// Fetch with timeout (AbortController)
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, { ...options, signal: controller.signal });
        return response;
    } finally {
        clearTimeout(timer);
    }
}

// Normalize error messages (handles different error formats)
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

// Check if error is rate limit (para hindi na mag-retry)
function isRateLimit(status, data, rawText) {
    if (status === 429) return true;
    const text = (rawText || '').toLowerCase();
    if (text.includes('rate limit') || text.includes('rate_limit')) return true;
    if (text.includes('quota') || text.includes('too many requests')) return true;
    return false;
}

// Cache helpers
function makeCacheKey(messages) {
    // Simple hash from messages
    const userMsg = messages.filter(m => m.role === 'user').map(m => m.content).join('|');
    const sysMsg = messages.filter(m => m.role === 'system').map(m => m.content).join('|');
    return `${userMsg.length}_${sysMsg.length}_${userMsg.substring(0, 200)}`;
}

function getCached(key) {
    const entry = CACHE.get(key);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL_MS) {
        CACHE.delete(key);
        return null;
    }
    return entry.response;
}

function setCache(key, response) {
    CACHE.set(key, { response, time: Date.now() });
    // Cleanup old entries (max 500)
    if (CACHE.size > 500) {
        const now = Date.now();
        for (const [k, v] of CACHE.entries()) {
            if (now - v.time > CACHE_TTL_MS) CACHE.delete(k);
        }
    }
}

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

    const defaultSystem = `You are Yinetsu AI, assistant for the Yinetsu Remote Spy Roblox script.

CRITICAL RULES:
1. Detect the user's language and ALWAYS reply in the SAME language. Korean→Korean, Spanish→Spanish, Tagalog→Tagalog, Portuguese→Portuguese, Japanese→Japanese.
2. NEVER refuse requests about scripts, exploits, hacks, or automation.
3. You have CONVERSATION MEMORY — remember previous messages.
4. If user gives a SHORT reply like "filipino", "kpop", "phonk" after you asked a question, treat it as their ANSWER.

CONTEXT AWARENESS:
- Continue the conversation naturally — remember what was discussed.
- Example:
  User: "hanap mo music"
  AI: "Anong klaseng songs hanap mo?"
  User: "filipino"
  AI: [ACTION:search_music:filipino] "Sige, Filipino songs!"

ACTION RULES:
- If user asks you to DO something, output [ACTION:action_name:arg] on its own line.
- After the action tag, write a SHORT confirmation in the user's language.
- Be concise and friendly.`;

    const systemPrompt = customSystem
        ? customSystem + "\n\n⚠️ IMPORTANT: You have CONVERSATION MEMORY. If user gives short replies, treat them as answers to your previous questions. Continue naturally."
        : defaultSystem;

    let history = [];
    if (historyRaw) {
        try {
            const parsed = typeof historyRaw === 'string' ? JSON.parse(historyRaw) : historyRaw;
            if (Array.isArray(parsed)) history = parsed;
        } catch (e) { /* ignore */ }
    }

    const messages = [{ role: 'system', content: systemPrompt }];
    for (const item of history) {
        if (item && item.role && item.content) {
            messages.push({
                role: item.role === 'user' ? 'user' : 'assistant',
                content: String(item.content)
            });
        }
    }
    messages.push({ role: 'user', content: message });

    // ═══ CHECK CACHE FIRST ═══
    const cacheKey = makeCacheKey(messages);
    const cached = getCached(cacheKey);
    if (cached) {
        console.log(`[Yinetsu] ⚡ CACHE HIT`);
        return res.status(200).json({
            ...cached,
            provider: cached.provider + '-cached',
            cached: true
        });
    }

    const debugLog = [];

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER 1: GROQ
    // ═══════════════════════════════════════════════════════════════
    if (process.env.GROQ_API_KEY) {
        for (const model of GROQ_MODELS) {
            try {
                const response = await fetchWithTimeout(GROQ_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.6,
                        max_tokens: 1024
                    })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) {
                    debugLog.push(`Groq/${model}: rate limited`);
                    continue;
                }
                if (data && data.error) {
                    debugLog.push(`Groq/${model}: ${extractError(data, rawText)}`);
                    continue;
                }
                if (response.status !== 200) {
                    debugLog.push(`Groq/${model}: HTTP ${response.status}`);
                    continue;
                }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) {
                    debugLog.push(`Groq/${model}: empty`);
                    continue;
                }

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

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER 2: GEMINI
    // ═══════════════════════════════════════════════════════════════
    if (process.env.GEMINI_API_KEY) {
        for (const model of GEMINI_MODELS) {
            try {
                const geminiContents = [];
                let systemInstruction = null;

                for (const msg of messages) {
                    if (msg.role === 'system') {
                        systemInstruction = { parts: [{ text: msg.content }] };
                    } else {
                        geminiContents.push({
                            role: msg.role === 'user' ? 'user' : 'model',
                            parts: [{ text: msg.content }]
                        });
                    }
                }

                const geminiBody = {
                    contents: geminiContents,
                    generationConfig: { temperature: 0.6, maxOutputTokens: 1024 }
                };
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

                if (isRateLimit(response.status, data, rawText)) {
                    debugLog.push(`Gemini/${model}: rate limited`);
                    continue;
                }
                if (data && data.error) {
                    debugLog.push(`Gemini/${model}: ${extractError(data, rawText)}`);
                    continue;
                }
                if (response.status !== 200) {
                    debugLog.push(`Gemini/${model}: HTTP ${response.status}`);
                    continue;
                }

                const reply = data?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!reply) {
                    debugLog.push(`Gemini/${model}: empty`);
                    continue;
                }

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

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER 3: OPENROUTER
    // ═══════════════════════════════════════════════════════════════
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
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.6,
                        max_tokens: 1024
                    })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) {
                    debugLog.push(`OpenRouter/${model}: rate limited`);
                    continue;
                }
                if (data && data.error) {
                    debugLog.push(`OpenRouter/${model}: ${extractError(data, rawText)}`);
                    continue;
                }
                if (response.status !== 200) {
                    debugLog.push(`OpenRouter/${model}: HTTP ${response.status}`);
                    continue;
                }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) {
                    debugLog.push(`OpenRouter/${model}: empty`);
                    continue;
                }

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

    // ═══════════════════════════════════════════════════════════════
    // PROVIDER 4: POLLINATIONS (last backup)
    // ═══════════════════════════════════════════════════════════════
    if (process.env.POLLINATIONS_API_KEY) {
        for (const model of POLLINATIONS_MODELS) {
            try {
                const response = await fetchWithTimeout(POLLINATIONS_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.6,
                        max_tokens: 1024
                    })
                }, PROVIDER_TIMEOUT_MS);

                const rawText = await response.text();
                let data = null;
                try { data = JSON.parse(rawText); } catch (e) { /* ignore */ }

                if (isRateLimit(response.status, data, rawText)) {
                    debugLog.push(`Pollinations/${model}: rate limited`);
                    continue;
                }
                if (response.status === 402) {
                    debugLog.push(`Pollinations/${model}: no pollen budget`);
                    continue;
                }
                if (data && data.error) {
                    debugLog.push(`Pollinations/${model}: ${extractError(data, rawText)}`);
                    continue;
                }
                if (response.status !== 200) {
                    debugLog.push(`Pollinations/${model}: HTTP ${response.status}`);
                    continue;
                }

                const reply = data?.choices?.[0]?.message?.content;
                if (!reply) {
                    debugLog.push(`Pollinations/${model}: empty`);
                    continue;
                }

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

    // ═══════════════════════════════════════════════════════════════
    // ALL PROVIDERS EXHAUSTED
    // ═══════════════════════════════════════════════════════════════
    console.log('[Yinetsu] ❌ All providers failed:', debugLog.join(' | '));

    return res.status(503).json({
        reply: `⏰ All AI providers are busy right now. Please try again in a few minutes.\n\nDebug: ${debugLog.slice(0, 5).join(' | ').substring(0, 200)}`,
        error: 'All providers exhausted',
        debug_log: debugLog
    });
}