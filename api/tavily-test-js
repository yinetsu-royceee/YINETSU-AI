export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const tavilyKey = process.env.TAVILY_API_KEY;

    if (!tavilyKey) {
        return res.status(200).json({ error: "No TAVILY_API_KEY found" });
    }

    const query = req.query.q || "roblox";

    try {
        const response = await fetch('https://api.tavily.com/search', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + tavilyKey
            },
            body: JSON.stringify({
                query: query,
                search_depth: "basic",
                max_results: 5
            })
        });

        const status = response.status;
        const data = await response.json();

        return res.status(200).json({
            status: status,
            ok: response.ok,
            keyPreview: tavilyKey.substring(0, 8) + "...",
            data: data
        });
    } catch (err) {
        return res.status(200).json({
            error: String(err && err.message ? err.message : err),
            keyPreview: tavilyKey ? tavilyKey.substring(0, 8) + "..." : "none"
        });
    }
}