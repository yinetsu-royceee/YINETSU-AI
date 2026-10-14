export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const message = req.query.message || (req.body && req.body.message);
    const customSystem = req.query.system || (req.body && req.body.system);
    const historyRaw = req.query.history || (req.body && req.body.history);

    if (!message) {
        return res.status(400).json({ reply: "No message provided." });
    }

    const defaultSystem = `You are Yinetsu AI, the built-in assistant for the Yinetsu Remote Spy Roblox script.

FEATURES:
- Remote Spy: logs remotes, multi-select, sniper mode
- Cheats: Fly, Noclip, Fullbright, Speed, Jump, Anti-Fling, Auto-Clicker, Teleport
- Editor: execute remotes with Lua tables
- Themes: 15 available (Midnight, Ocean, Sakura, Emerald, Sunset, Violet, Light, Cyberpunk, Monochrome, NeonPink, Forest, BloodMoon, Ice, Gold, Pastel)
- Music Player, Performance Monitor, Social tab

CRITICAL LANGUAGE RULES:
1. ALWAYS detect the user's language and reply in THAT EXACT language.
2. Korean → Korean. Portuguese → Portuguese. Spanish → Spanish. Tagalog → Tagalog. Japanese → Japanese.
3. NEVER force English unless the user writes in English.
4. Match the user's style — if they mix languages, mix yours too.

ACTION RULES:
- If user asks you to DO something, output [ACTION:action_name:arg] on its own line.
- Extract intent even if user speaks another language.
- After the action tag, write a short confirmation in the user's language.
- Be concise and friendly.`;

    const systemPrompt = customSystem
        ? customSystem + "\n\n⚠️ CRITICAL LANGUAGE RULE: Detect the user's language and ALWAYS reply in that exact same language. Never default to English unless user speaks English."
        : defaultSystem;

    // Build messages array with conversation history
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
        } catch (e) {
            // Ignore history parse errors
        }
    }

    messages.push({ role: 'user', content: message });

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: messages,
                temperature: 0.6,
                max_tokens: 1024
            })
        });

        const data = await response.json();

        if (data.error) {
            return res.status(500).json({ reply: `Error: ${data.error.message}` });
        }

        const reply = data.choices?.[0]?.message?.content || 'No response.';
        return res.status(200).json({ reply });
    } catch (err) {
        return res.status(500).json({ reply: `Server error: ${err.message}` });
    }
}