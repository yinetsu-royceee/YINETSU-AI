// ═══════════════════════════════════════════════════════════════
// YINETSU AI — Pollinations ONLY TEST
// ═══════════════════════════════════════════════════════════════

const POLLINATIONS_ENDPOINT = 'https://text.pollinations.ai/openai/chat/completions';

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

    // ═══ POLLINATIONS ═══
    if (process.env.POLLINATIONS_API_KEY) {
        try {
            console.log(`[Yinetsu] Trying Pollinations...`);

            const response = await fetch(POLLINATIONS_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${process.env.POLLINATIONS_API_KEY}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    model: 'openai',
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
                debugLog.push(`Pollinations: invalid JSON — ${rawText.substring(0, 100)}`);
            }

            if (data) {
                if (response.status === 429) {
                    debugLog.push(`Pollinations: rate limited`);
                } else if (response.status !== 200) {
                    const errMsg = data.error?.message || data.error || rawText.substring(0, 100);
                    debugLog.push(`Pollinations: HTTP ${response.status} — ${errMsg}`);
                } else {
                    const reply = data.choices?.[0]?.message?.content;
                    if (reply && reply.trim() !== '') {
                        console.log(`[Yinetsu] ✅ Pollinations/openai`);
                        return res.status(200).json({
                            reply: reply.trim(),
                            provider: 'pollinations',
                            model: data.model || 'openai',
                            usage: data.usage || null
                        });
                    } else {
                        debugLog.push(`Pollinations: empty reply`);
                    }
                }
            }
        } catch (err) {
            debugLog.push(`Pollinations: ${(err.message || '').substring(0, 100)}`);
        }
    } else {
        debugLog.push('Pollinations: API key missing');
    }

    console.log('[Yinetsu] ❌ Pollinations failed:', debugLog.join(' | '));

    return res.status(503).json({
        reply: `⏰ Pollinations test failed. Debug: ${debugLog.join(' | ').substring(0, 300)}`,
        error: 'Pollinations exhausted',
        debug_log: debugLog
    });
}