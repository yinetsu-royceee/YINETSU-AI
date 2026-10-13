export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const message = req.query.message || (req.body && req.body.message);
    const customSystem = req.query.system || (req.body && req.body.system);

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
2. If user speaks Korean → reply in Korean (한국어).
3. If user speaks Portuguese → reply in Portuguese (Português).
4. If user speaks Spanish → reply in Spanish (Español).
5. If user speaks Tagalog/Taglish → reply in Tagalog/Taglish.
6. If user mixes languages → match their style.
7. NEVER force English unless the user writes in English.

ACTION RULES:
- If user asks you to DO something (change theme, set speed, play music, etc.), output the action tag on its own line.
- Extract the INTENT even if user speaks another language. Example: "palitan mo ng ocean" → output [ACTION:change_theme:ocean]
- After the action tag, write a short confirmation in the SAME language as the user.
- Be concise and friendly.`;

    const systemPrompt = customSystem
        ? customSystem + "\n\n⚠️ CRITICAL LANGUAGE RULE: Detect the user's language and ALWAYS reply in that exact same language. Korean → Korean. Portuguese → Portuguese. Spanish → Spanish. Tagalog → Tagalog. Never default to English unless user speaks English."
        : defaultSystem;

    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'openai/gpt-oss-120b',
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: message }
                ],
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