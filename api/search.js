export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const query = req.query.q || req.query.query || "";
    const type = (req.query.type || "web").toLowerCase();

    if (!query) {
        return res.status(200).json({
            status: "alive",
            message: "search.js working",
            usage: "?q=your_query&type=web|audio|game|user|script"
        });
    }

    try {
        if (type === "audio" || type === "music") return await searchAudio(query, res);
        if (type === "game") return await searchGame(query, res);
        if (type === "user") return await searchUser(query, res);
        if (type === "script") return await searchScript(query, res);
        return await searchWeb(query, res);
    } catch (err) {
        return res.status(200).json({
            query: query, type: type, count: 0, results: [],
            error: String(err && err.message ? err.message : err)
        });
    }
}

// ============================================
// ROBLOX AUDIO SEARCH
// ============================================
async function searchAudio(query, res) {
    try {
        const url = 'https://catalog.roblox.com/v1/search/items/details?Category=Audio&Keyword=' + encodeURIComponent(query) + '&Limit=30&SortType=Relevance';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Roblox/WinInet',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(200).json({
                query: query, type: "audio", count: 0, results: [],
                note: "Roblox returned " + response.status
            });
        }

        const data = await response.json();
        const results = [];

        if (Array.isArray(data.data)) {
            for (let i = 0; i < data.data.length; i++) {
                const item = data.data[i];
                if (item && item.id) {
                    results.push({
                        id: String(item.id),
                        name: item.name || "Untitled",
                        creator: item.creatorName || "Unknown",
                        duration: item.duration || 0,
                        url: "https://www.roblox.com/library/" + item.id
                    });
                }
            }
        }

        return res.status(200).json({
            query: query, type: "audio",
            count: results.length,
            results: results.slice(0, 12)
        });
    } catch (err) {
        return res.status(200).json({
            query: query, type: "audio", count: 0, results: [],
            error: String(err && err.message ? err.message : err)
        });
    }
}

// ============================================
// ROBLOX GAME SEARCH
// ============================================
async function searchGame(query, res) {
    try {
        const url = 'https://games.roblox.com/v1/games/list?model.keyword=' + encodeURIComponent(query) + '&model.maxRows=20';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Roblox/WinInet',
                'Accept': 'application/json'
            }
        });

        if (!response.ok) {
            return res.status(200).json({
                query: query, type: "game", count: 0, results: [],
                note: "Roblox returned " + response.status
            });
        }

        const data = await response.json();
        const results = [];

        if (Array.isArray(data.games)) {
            for (let i = 0; i < data.games.length; i++) {
                const g = data.games[i];
                results.push({
                    id: String(g.universeId || g.placeId || ""),
                    name: g.name || "Untitled",
                    creator: g.creatorName || "Unknown",
                    playing: g.playerCount || 0,
                    url: g.placeId ? "https://www.roblox.com/games/" + g.placeId : ""
                });
            }
        }

        return res.status(200).json({
            query: query, type: "game",
            count: results.length,
            results: results.slice(0, 10)
        });
    } catch (err) {
        return res.status(200).json({
            query: query, type: "game", count: 0, results: [],
            error: String(err && err.message ? err.message : err)
        });
    }
}

// ============================================
// ROBLOX USER SEARCH
// ============================================
async function searchUser(query, res) {
    try {
        const url = 'https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(query) + '&limit=10';
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                'Accept': 'application/json'
            }
        });

        if (response.ok) {
            const data = await response.json();
            const results = [];
            if (Array.isArray(data.data)) {
                for (let i = 0; i < data.data.length; i++) {
                    const u = data.data[i];
                    results.push({
                        id: String(u.id),
                        name: u.name || "Unknown",
                        displayName: u.displayName || u.name,
                        url: "https://www.roblox.com/users/" + u.id + "/profile"
                    });
                }
            }
            if (results.length > 0) {
                return res.status(200).json({
                    query: query, type: "user",
                    count: results.length,
                    results: results.slice(0, 10)
                });
            }
        }

        const fbUrl = 'https://users.roblox.com/v1/usernames/users';
        const fbResp = await fetch(fbUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            },
            body: JSON.stringify({
                usernames: [query],
                excludeBannedUsers: true
            })
        });

        if (fbResp.ok) {
            const fbData = await fbResp.json();
            const results = [];
            if (Array.isArray(fbData.data)) {
                for (let i = 0; i < fbData.data.length; i++) {
                    const u = fbData.data[i];
                    results.push({
                        id: String(u.id),
                        name: u.name || "Unknown",
                        displayName: u.displayName || u.name,
                        url: "https://www.roblox.com/users/" + u.id + "/profile"
                    });
                }
            }
            return res.status(200).json({
                query: query, type: "user",
                count: results.length, results: results
            });
        }

        return res.status(200).json({
            query: query, type: "user", count: 0, results: [],
            note: "Roblox user API unavailable"
        });
    } catch (err) {
        return res.status(200).json({
            query: query, type: "user", count: 0, results: [],
            error: String(err && err.message ? err.message : err)
        });
    }
}

// ============================================
// SCRIPT SEARCH (Tavily + Auto-Fetch + Safety)
// ============================================
async function searchScript(query, res) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    let searchResults = [];

    // Step 1: Search via Tavily
    if (tavilyKey && tavilyKey.length > 10) {
        try {
            const tavilyResp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + tavilyKey
                },
                body: JSON.stringify({
                    query: query + " roblox script loadstring",
                    search_depth: "basic",
                    max_results: 5
                })
            });
            if (tavilyResp.ok) {
                const tavilyData = await tavilyResp.json();
                if (Array.isArray(tavilyData.results)) {
                    for (const r of tavilyData.results) {
                        searchResults.push({
                            title: r.title || "Result",
                            url: r.url || "",
                            snippet: r.content || ""
                        });
                    }
                }
            }
        } catch (e) { /* ignore */ }
    }

    // Step 2: Try to auto-fetch top result from allowed host
    let fetchedCode = null;
    let safety = { level: "UNKNOWN", flags: [] };
    let loadedFrom = null;

    const allowedHosts = [
        'pastebin.com',
        'raw.githubusercontent.com',
        'githubusercontent.com',
        'gist.githubusercontent.com',
        'rentry.co',
        'hastebin.com',
        'pastes.io'
    ];

    for (const result of searchResults) {
        if (!result.url) continue;
        try {
            const parsed = new URL(result.url);
            const host = parsed.hostname.replace('www.', '');
            const isAllowed = allowedHosts.some(h => host === h || host.endsWith('.' + h));
            if (!isAllowed) continue;

            let fetchUrl = result.url;
            if (host === 'pastebin.com' && !fetchUrl.includes('/raw/')) {
                const match = fetchUrl.match(/pastebin\.com\/([A-Za-z0-9]+)/);
                if (match) fetchUrl = 'https://pastebin.com/raw/' + match[1];
            }

            const codeResp = await fetch(fetchUrl, {
                headers: { 'User-Agent': 'Mozilla/5.0' },
                redirect: 'follow'
            });

            if (codeResp.ok) {
                const code = await codeResp.text();
                if (code && code.length > 10 && code.length < 100000) {
                    fetchedCode = code.slice(0, 5000);
                    loadedFrom = fetchUrl;
                    safety = analyzeScriptSafety(code, host);
                    break;
                }
            }
        } catch (e) { /* continue */ }
    }

    return res.status(200).json({
        query: query,
        type: "script",
        searchResults: searchResults.slice(0, 5),
        fetched: fetchedCode ? {
            from: loadedFrom,
            code: fetchedCode,
            safety: safety
        } : null
    });
}

function analyzeScriptSafety(code, host) {
    const lower = code.toLowerCase();
    const flags = [];
    let score = 0;

    if (lower.includes('roblosecurity')) { flags.push("🚨 Cookie stealer detected"); score -= 5; }
    if (lower.includes('getuseridfromcookie')) { flags.push("🚨 Cookie grabber"); score -= 5; }
    if (lower.includes('discord.com/api/webhooks') || lower.includes('discordapp.com/api/webhooks')) {
        flags.push("🚨 Discord webhook (token logger pattern)"); score -= 4;
    }
    if (lower.includes('syn.request') || lower.includes('http_request')) {
        flags.push("⚠️ Makes external HTTP requests"); score -= 1;
    }
    if (/[a-z0-9]{100,}/.test(code)) { flags.push("⚠️ Possible obfuscation"); score -= 1; }
    if (code.length > 50000) { flags.push("⚠️ Very large script (50k+ chars)"); score -= 1; }
    if (host === 'raw.githubusercontent.com' || host === 'githubusercontent.com' || host === 'gist.githubusercontent.com') {
        flags.push("✅ GitHub source (transparent)"); score += 3;
    }
    if (code.includes('loadstring')) { flags.push("ℹ️ Uses loadstring (common pattern)"); }
    if (lower.includes('made by') || lower.includes('-- [')) { flags.push("✅ Has author signature"); score += 2; }

    let level = "CAUTION";
    if (score >= 3) level = "SAFE";
    else if (score >= 1) level = "LIKELY_SAFE";
    else if (score <= -4) level = "DANGER";
    else if (score <= -1) level = "SUSPICIOUS";

    return { level: level, score: score, flags: flags };
}

// ============================================
// WEB SEARCH (Tavily → Wikipedia → DDG fallback)
// ============================================
async function searchWeb(query, res) {
    const tavilyKey = process.env.TAVILY_API_KEY;

    if (tavilyKey && tavilyKey.length > 10) {
        try {
            const tavilyResp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + tavilyKey
                },
                body: JSON.stringify({
                    query: query,
                    search_depth: "basic",
                    max_results: 8,
                    include_answer: true
                })
            });

            if (tavilyResp.ok) {
                const tavilyData = await tavilyResp.json();
                const results = [];

                if (tavilyData.answer) {
                    results.push({
                        title: "AI Answer",
                        snippet: tavilyData.answer,
                        url: ""
                    });
                }

                if (Array.isArray(tavilyData.results)) {
                    for (let i = 0; i < tavilyData.results.length; i++) {
                        const r = tavilyData.results[i];
                        results.push({
                            title: r.title || "Result",
                            snippet: r.content || "",
                            url: r.url || ""
                        });
                    }
                }

                if (results.length > 0) {
                    return res.status(200).json({
                        query: query, type: "web", source: "tavily",
                        count: results.length,
                        results: results.slice(0, 8)
                    });
                }
            }
        } catch (e) { /* fall through */ }
    }

    try {
        const wikiTitle = encodeURIComponent(query.replace(/ /g, '_'));
        const wikiUrl = 'https://en.wikipedia.org/api/rest_v1/page/summary/' + wikiTitle;
        const wikiResp = await fetch(wikiUrl, { headers: { 'User-Agent': 'Mozilla/5.0' } });

        if (wikiResp.ok) {
            const wikiData = await wikiResp.json();
            if (wikiData && wikiData.extract) {
                let pageUrl = "https://en.wikipedia.org/wiki/" + wikiTitle;
                if (wikiData.content_urls && wikiData.content_urls.desktop && wikiData.content_urls.desktop.page) {
                    pageUrl = wikiData.content_urls.desktop.page;
                }
                return res.status(200).json({
                    query: query, type: "web", source: "wikipedia", count: 1,
                    results: [{
                        title: wikiData.title || query,
                        snippet: wikiData.extract,
                        url: pageUrl
                    }]
                });
            }
        }
    } catch (e) { /* fall through */ }

    try {
        const ddgUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1';
        const ddgResp = await fetch(ddgUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0' }
        });

        if (ddgResp.ok) {
            const data = await ddgResp.json();
            const results = [];
            if (data.AbstractText) {
                results.push({ title: data.Heading || "Answer", snippet: data.AbstractText, url: data.AbstractURL || "" });
            }
            if (data.Definition) {
                results.push({ title: "Definition", snippet: data.Definition, url: data.DefinitionURL || "" });
            }
            if (Array.isArray(data.RelatedTopics)) {
                for (let i = 0; i < data.RelatedTopics.length && results.length < 8; i++) {
                    const t = data.RelatedTopics[i];
                    if (t && t.Text && t.FirstURL) {
                        results.push({
                            title: t.Text.split(" - ")[0] || "Result",
                            snippet: t.Text,
                            url: t.FirstURL
                        });
                    }
                }
            }
            if (results.length > 0) {
                return res.status(200).json({
                    query: query, type: "web", source: "duckduckgo",
                    count: results.length, results: results.slice(0, 8)
                });
            }
        }
    } catch (e) { /* fall through */ }

    return res.status(200).json({
        query: query, type: "web", source: "fallback", count: 1,
        results: [{
            title: 'Search "' + query + '" on the web',
            snippet: "Click to search online.",
            url: "https://www.google.com/search?q=" + encodeURIComponent(query)
        }]
    });
}