export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    
    const message = req.query.message || (req.body && req.body.message);
    
    if (!message) {
        return res.status(400).json({ reply: "No message provided." });
    }
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                model: 'llama-3.3-70b-versatile',
                messages: [
                    {
                        role: 'system',
                        content: 'You are Yinetsu AI, the built-in assistant for the Yinetsu Remote Spy Roblox script. Features: Remote Spy (log remotes, multi-select, sniper mode), Cheats (Fly, Noclip, Fullbright, Anti-Fling, Auto-Click, Teleport, Speed, Jump), Music Player (playlist, shuffle, repeat, favorites), Themes (15+ themes, RGB animations), Utilities (FPS boost, Server hop), File Manager (save/load remote logs). Answer briefly and helpfully in the user language (Tagalog or English). Max 3 short sentences.'
                    },
                    { role: 'user', content: message }
                ],
                max_tokens: 250,
                temperature: 0.7
            })
        });
        
        const data = await response.json();
        
        if (!data.choices || !data.choices[0]) {
            return res.status(500).json({ reply: "AI error: " + JSON.stringify(data) });
        }
        
        res.status(200).json({ reply: data.choices[0].message.content.trim() });
    } catch (err) {
        res.status(500).json({ reply: "Error: " + err.message });
    }
}