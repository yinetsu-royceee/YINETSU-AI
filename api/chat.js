// ═══════════════════════════════════════════════════════════════
// YINETSU AI — HuggingFace ONLY TEST (Router Endpoint)
// ═══════════════════════════════════════════════════════════════

const HF_ENDPOINT = 'https://router.huggingface.co/v1/chat/completions';

const HF_MODELS = [
    'meta-llama/Llama-3.3-70B-Instruct',
    'Qwen/Qwen3.8-27B',
    'meta-llama/Meta-Llama-3-8B-Instruct',
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

    // ═══ HUGGING FACE ROUTER ═══
    if (process.env.HUGGINGFACE_API_KEY) {
        for (const model of HF_MODELS) {
            try {
                console.log(`[Yinetsu] Trying HuggingFace/${model}...`);

                const response = await fetch(HF_ENDPOINT, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${process.env.HUGGINGFACE_API_KEY}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        model: model,
                        messages: messages,
                        temperature: 0.6,
                        max_tokens: 1024
                    })
                });

                const rawText = await response.text();
                let data = null;
                try {
                    data = JSON.parse(rawText);
                } catch (e) {
                    debugLog.push(`HF/${model}: invalid JSON — ${rawText.substring(0, 80)}`);
                    continue;
                }

                if (response.status === 429) {
                    debugLog.push(`HF/${model}: rate limited`);
                    continue;
                }
                if (response.status === 503 || (data.error && data.error.includes('loading'))) {
                    debugLog.push(`HF/${model}: model loading, retrying...`);
                    await new Promise(r => setTimeout(r, 3000));
                    continue;
                }
                if (response.status !== 200) {
                    const errMsg = data.error || rawText.substring(0, 100);
                    debugLog.push(`HF/${model}: HTTP ${response.status} — ${errMsg}`);
                    continue;
                }

                const reply = data.choices?.[0]?.message?.content;
                if (!reply || reply.trim() === '') {
                    debugLog.push(`HF/${model}: empty reply`);
                    continue;
                }

                console.log(`[Yinetsu] ✅ HuggingFace/${model}`);
                return res.status(200).json({
                    reply: reply.trim(),
                    provider: 'huggingface',
                    model: model,
                    usage: data.usage || null
                });

            } catch (err) {
                debugLog.push(`HF/${model}: ${(err.message || '').substring(0, 80)}`);
                continue;
            }
        }
    } else {
        debugLog.push('HuggingFace: API key missing');
    }

    console.log('[Yinetsu] ❌ HuggingFace failed:', debugLog.join(' | '));

    return res.status(503).json({
        reply: `⏰ HuggingFace test failed. Debug: ${debugLog.join(' | ').substring(0, 300)}`,
        error: 'HuggingFace exhausted',
        debug_log: debugLog
    });
}