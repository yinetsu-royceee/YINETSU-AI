export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const query = req.query.q || req.query.query || (req.body && req.body.q);
    const type = (req.query.type || "web").toLowerCase();

    if (!query) {
        return res.status(400).json({ error: "No query provided", results: [] });
    }

    try {
        if (type === "audio" || type === "music") {
            return await searchRobloxAudio(query, res);
        }
        if (type === "game") {
            return await searchRobloxGame(query, res);
        }
        if (type === "user") {
            return await searchRobloxUser(query, res);
        }
        return await searchWeb(query, res);
    } catch (err) {
        return res.status(500).json({
            error: err.message,
            query: query,
            type: type,
            results: []
        });
    }
}

async function searchRobloxAudio(query, res) {
    try {
        const url = `https://catalog.roblox.com/v1/search/items/details?Category=Audio&Keyword=${encodeURIComponent(query)}&Limit=30&SortType=Relevance`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(200).json({
                query, type: "audio", count: 0, results: [],
                note: `Roblox API returned ${response.status}`
            });
        }

        const data = await response.json();
        const results = [];

        if (Array.isArray(data.data)) {
            for (const item of data.data) {
                if (item.id) {
                    results.push({
                        id: String(item.id),
                        name: item.name || "Untitled",
                        creator: item.creatorName || "Unknown",
                        duration: item.duration || 0,
                        verified: item.isVerified || false,
                        url: `https://www.roblox.com/library/${item.id}`
                    });
                }
            }
        }

        return res.status(200).json({
            query, type: "audio", count: results.length,
            results: results.slice(0, 12)
        });
    } catch (err) {
        return res.status(200).json({
            query, type: "audio", count: 0, results: [],
            error: err.message
        });
    }
}

async function searchRobloxGame(query, res) {
    try {
        const url = `https://games.roblox.com/v1/games/list?model.keyword=${encodeURIComponent(query)}&model.maxRows=20`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(200).json({
                query, type: "game", count: 0, results: [],
                note: `Roblox API returned ${response.status}`
            });
        }

        const data = await response.json();
        const results = [];

        if (Array.isArray(data.games)) {
            for (const g of data.games) {
                results.push({
                    id: String(g.universeId || g.placeId || ""),
                    name: g.name || "Untitled",
                    creator: g.creatorName || "Unknown",
                    playing: g.playerCount || 0,
                    url: g.placeId ? `https://www.roblox.com/games/${g.placeId}` : ""
                });
            }
        }

        return res.status(200).json({
            query, type: "game", count: results.length,
            results: results.slice(0, 10)
        });
    } catch (err) {
        return res.status(200).json({
            query, type: "game", count: 0, results: [],
            error: err.message
        });
    }
}

async function searchRobloxUser(query, res) {
    try {
        const url = `https://users.roblox.com/v1/users/search?keyword=${encodeURIComponent(query)}&limit=20`;
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(200).json({
                query, type: "user", count: 0, results: [],
                note: `Roblox API returned ${response.status}`
            });
        }

        const data = await response.json();
        const results = [];

        if (Array.isArray(data.data)) {
            for (const u of data.data) {
                results.push({
                    id: String(u.id),
                    name: u.name || "Unknown",
                    displayName: u.displayName || u.name,
                    url: `https://www.roblox.com/users/${u.id}/profile`
                });
            }
        }

        return res.status(200).json({
            query, type: "user", count: results.length,
            results: results.slice(0, 10)
        });
    } catch (err) {
        return res.status(200).json({
            query, type: "user", count: 0, results: [],
            error: err.message
        });
    }
}

async function searchWeb(query, res) {
    try {
        const apiUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
        const apiResp = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
            }
        });

        if (!apiResp.ok) {
            return res.status(200).json({
                query, type: "web", source: "error",
                count: 1,
                results: [{
                    title: "Search manually",
                    snippet: "Web service unavailable. Click to search online.",
                    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
                }]
            });
        }

        const data = await apiResp.json();
        const results = [];

        if (data.AbstractText) {
            results.push({
                title: data.Heading || "Answer",
                snippet: data.AbstractText,
                url: data.AbstractURL || ""
            });
        }
        if (data.Definition) {
            results.push({
                title: "Definition",
                snippet: data.Definition,
                url: data.DefinitionURL || ""
            });
        }
        if (Array.isArray(data.RelatedTopics)) {
            for (const t of data.RelatedTopics.slice(0, 8)) {
                if (t.Text && t.FirstURL) {
                    results.push({
                        title: t.Text.split(" - ")[0] || "Result",
                        snippet: t.Text,
                        url: t.FirstURL
                    });
                }
            }
        }

        if (results.length === 0) {
            results.push({
                title: "Search on DuckDuckGo",
                snippet: `No instant answer found. Click to search "${query}" online.`,
                url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`
            });
        }

        return res.status(200).json({
            query, type: "web", source: "duckduckgo",
            count: results.length,
            results: results.slice(0, 8)
        });
    } catch (err) {
        return res.status(200).json({
            query, type: "web", source: "error",
            count: 1,
            results: [{
                title: "Search manually",
                snippet: "Click to search online.",
                url: `https://www.google.com/search?q=${encodeURIComponent(query)}`
            }]
        });
    }
}