// ═══════════════════════════════════════════════════════════════
// YINETSU AI — Multi-Provider Fallback (Oct 2026)
// TEST BUILD: openai/gpt-oss-120b COMMENTED OUT
// ═══════════════════════════════════════════════════════════════

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';
const GEMINI_ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const OPENROUTER_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';

// Groq model chain — gpt-oss-120b commented out for testing
const GROQ_MODELS = [
    'llama-3.1-8b-instant',
    'llama-3.3-70b-versatile',
    'gemma2-9b-it',
    // 'openai/gpt-oss-120b',   ← COMMENTED OUT FOR TEST
];

const GEMINI_MODELS = [
    'gemini-3.5-flash-lite',
    'gemini-2.5-flash-lite',
    'gemini-2.5-flash',
];

const OPENROUTER_MODELS = [
    'google/gemma-4-31b:free',
    'nvidia/nemotron-3-super:free',
    'nvidia/nemotron-3.5-lightning:free',
    'thinkingmachines/inkling-small:free',
];

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

    const debugLog = [];

    // ═══ PROVIDER 1: GROQ ═══
    if (process.env.GROQ_API_KEY) {
        for (const model of GROQ_MODELS) {
            try {
                const response = await fetch(GROQ_ENDPOINT, {
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
                });

                const data = await response.json();

                if (response.status === 429) {
                    debugLog.push(`Groq/${model}: rate limited`);
                    continue;
                }
                if (data.error) {
                    debugLog.push(`Groq/${model}: ${(data.error.message || '').substring(0, 60)}`);
                    continue;
                }
                const reply = data.choices?.[0]?.message?.content;
                if (!reply) {
                    debugLog.push(`Groq/${model}: empty`);
                    continue;
                }

                console.log(`[Yinetsu] ✅ Groq/${model}`);
                return res.status(200).json({ reply, provider: 'groq', model, usage: data.usage || null });
            } catch (err) {
                debugLog.push(`Groq/${model}: ${(err.message || '').substring(0, 60)}`);
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
                const response = await fetch(url, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(geminiBody)
                });

                const data = await response.json();

                if (response.status === 429) {
                    debugLog.push(`Gemini/${model}: rate limited`);
                    continue;
                }
                if (data.error) {
                    debugLog.push(`Gemini/${model}: ${(data.error.message || '').substring(0, 60)}`);
                    continue;
                }
                const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
                if (!reply) {
                    debugLog.push(`Gemini/${model}: empty`);
                    continue;
                }

                console.log(`[Yinetsu] ✅ Gemini/${model}`);
                return res.status(200).json({ reply, provider: 'gemini', model, usage: data.usageMetadata || null });
            } catch (err) {
                debugLog.push(`Gemini/${model}: ${(err.message || '').substring(0, 60)}`);
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
                const response = await fetch(OPENROUTER_ENDPOINT, {
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
                });

                const data = await response.json();

                if (response.status === 429) {
                    debugLog.push(`OpenRouter/${model}: rate limited`);
                    continue;
                }
                if (data.error) {
                    debugLog.push(`OpenRouter/${model}: ${(data.error.message || '').substring(0, 60)}`);
                    continue;
                }
                const reply = data.choices?.[0]?.message?.content;
                if (!reply) {
                    debugLog.push(`OpenRouter/${model}: empty`);
                    continue;
                }

                console.log(`[Yinetsu] ✅ OpenRouter/${model}`);
                return res.status(200).json({ reply, provider: 'openrouter', model, usage: data.usage || null });
            } catch (err) {
                debugLog.push(`OpenRouter/${model}: ${(err.message || '').substring(0, 60)}`);
                continue;
            }
        }
    } else {
        debugLog.push('OpenRouter: API key missing');
    }

    // ═══ ALL FAILED ═══
    console.log('[Yinetsu] ❌ All providers failed:', debugLog.join(' | '));

    return res.status(503).json({
        reply: `⏰ All AI providers are busy right now. Please try again in a few minutes.\n\nDebug: ${debugLog.slice(0, 5).join(' | ').substring(0, 200)}`,
        error: 'All providers exhausted',
        debug_log: debugLog
    });
}