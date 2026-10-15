// ═══════════════════════════════════════════════════════════════
// YINETSU AI — Multi-Model Fallback (Groq)
// Auto-switches model if rate limit hit on one
// ═══════════════════════════════════════════════════════════════

const GROQ_ENDPOINT = 'https://api.groq.com/openai/v1/chat/completions';

// Fallback chain — try in order
// Total daily budget: ~1.3M tokens/day (vs 200K with single model)
const MODEL_CHAIN = [
    'llama-3.1-8b-instant',       // 500K tokens/day — fastest, primary
    'llama-3.3-70b-versatile',    // 100K tokens/day — smart fallback
    'gemma2-9b-it',               // 500K tokens/day — Google fallback
    'openai/gpt-oss-120b',        // 200K tokens/day — last resort (original)
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

    const messages = [{ role: 'system', content: systemPrompt }];

    if (historyRaw) {
        try {
            const history = typeof historyRaw === 'string' ? JSON.parse(historyRaw) : historyRaw;
            if (Array.isArray(history)) {
                for (const item of history) {
                    if (item && item.role && item.content) {
                        messages.push({
                            role: item.role === 'user' ? 'user' : 'assistant',
                            content: String(item.content)
                        });
                    }
                }
            }
        } catch (e) { /* ignore */ }
    }

    messages.push({ role: 'user', content: message });

    // ═══ TRY EACH MODEL IN CHAIN ═══
    let lastError = null;
    let lastErrorStatus = 500;
    let lastErrMsg = 'Unknown error';

    for (let i = 0; i < MODEL_CHAIN.length; i++) {
        const model = MODEL_CHAIN[i];

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

            // ═══ RATE LIMIT → try next model ═══
            if (response.status === 429) {
                lastErrorStatus = 429;
                lastErrMsg = data?.error?.message || 'Rate limit';
                console.log(`[Yinetsu] ${model} rate limited → trying next model`);
                continue;
            }

            // ═══ OTHER API ERROR → try next model ═══
            if (data.error) {
                lastErrorStatus = response.status || 500;
                lastErrMsg = data.error.message || 'API error';
                console.log(`[Yinetsu] ${model} error: ${lastErrMsg.substring(0, 100)}`);
                continue;
            }

            // ═══ SUCCESS ═══
            const reply = data.choices?.[0]?.message?.content;
            if (!reply) {
                lastErrMsg = 'Empty response';
                console.log(`[Yinetsu] ${model} returned empty response`);
                continue;
            }

            console.log(`[Yinetsu] ✅ Reply via ${model} (${data.usage?.total_tokens || '?'} tokens)`);
            return res.status(200).json({
                reply: reply,
                model: model,
                usage: data.usage || null
            });

        } catch (err) {
            lastError = err;
            lastErrMsg = err?.message || String(err);
            lastErrorStatus = 500;
            console.log(`[Yinetsu] ${model} exception: ${lastErrMsg}`);
            continue;
        }
    }

    // ═══ ALL MODELS EXHAUSTED ═══
    console.log(`[Yinetsu] ❌ All models exhausted. Last error: ${lastErrMsg}`);

    // Friendly rate-limit message
    if (lastErrorStatus === 429) {
        return res.status(429).json({
            reply: `⏰ All AI models are currently rate limited. Please try again in a few minutes.\n\nLast error: ${lastErrMsg.substring(0, 150)}`,
            error: 'All models rate limited',
            tried_models: MODEL_CHAIN
        });
    }

    return res.status(500).json({
        reply: `⚠️ AI temporarily unavailable. Please try again.\n\nError: ${lastErrMsg.substring(0, 150)}`,
        error: 'All models failed',
        tried_models: MODEL_CHAIN
    });
}