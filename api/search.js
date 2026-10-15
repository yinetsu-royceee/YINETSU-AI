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
            status: "alive", message: "search.js working",
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
// AUDIO SEARCH — Toolbox + Web Hybrid (TRUE Universal)
// ============================================
async function searchAudio(query, res) {
    const allResults = [];
    const seenIds = new Set();
    const tavilyKey = process.env.TAVILY_API_KEY;

    // LAYER 1: Roblox Toolbox Service
    async function searchToolbox(keyword) {
        try {
            const url = 'https://apis.roblox.com/toolbox-service/v1/marketplace/5?keyword=' + encodeURIComponent(keyword) + '&limit=30';
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Roblox/WinInet', 'Accept': 'application/json' }
            });
            if (!response.ok) return;
            const text = await response.text();
            let data;
            try { data = JSON.parse(text); } catch (e) {
                const match = text.match(/\{[\s\S]*\}/);
                if (match) data = JSON.parse(match[0]); else return;
            }
            let items = data.data || data.creatorStoreAssets || data.results || (Array.isArray(data) ? data : []);
            for (const item of items) {
                const asset = item.asset || item;
                if (!asset || !asset.id) continue;
                const assetType = asset.assetType || asset.type;
                if (assetType && assetType !== 3 && assetType !== "Audio") continue;
                const pid = String(asset.id);
                if (seenIds.has(pid)) continue;
                seenIds.add(pid);
                allResults.push({
                    id: pid,
                    name: asset.name || "Untitled",
                    creator: (asset.creator && asset.creator.name) || asset.creatorName || "Unknown",
                    duration: asset.duration || 0,
                    isVerified: false,
                    source: "toolbox",
                    url: "https://www.roblox.com/library/" + pid
                });
            }
        } catch (e) { /* continue */ }
    }

    // LAYER 2: Legacy Catalog API
    async function searchCatalog(keyword) {
        try {
            const url = 'https://catalog.roblox.com/v1/search/items/details?Category=Audio&Keyword=' + encodeURIComponent(keyword) + '&Limit=30&SortType=Relevance';
            const response = await fetch(url, {
                headers: { 'User-Agent': 'Roblox/WinInet', 'Accept': 'application/json' }
            });
            if (!response.ok) return;
            const data = await response.json();
            if (!Array.isArray(data.data)) return;
            for (const item of data.data) {
                if (!item || !item.id) continue;
                if (item.isPublic === false) continue;
                if ((item.duration || 0) === 0) continue;
                const pid = String(item.id);
                if (seenIds.has(pid)) continue;
                seenIds.add(pid);
                allResults.push({
                    id: pid,
                    name: item.name || "Untitled",
                    creator: item.creatorName || "Unknown",
                    duration: item.duration || 0,
                    isVerified: item.isVerified || false,
                    source: "catalog",
                    url: "https://www.roblox.com/library/" + pid
                });
            }
        } catch (e) { /* continue */ }
    }

    // LAYER 3: Universal Web Search via Tavily (this is the "whole web" part)
    async function searchWebAudio(keyword) {
        if (!tavilyKey || tavilyKey.length < 10) return;
        try {
            const resp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + tavilyKey
                },
                body: JSON.stringify({
                    query: keyword + " roblox audio ID library",
                    search_depth: "advanced",
                    max_results: 10
                })
            });
            if (!resp.ok) return;
            const data = await resp.json();
            if (!Array.isArray(data.results)) return;
            for (const r of data.results) {
                const combined = (r.title || "") + " " + (r.content || "") + " " + (r.url || "");
                const matches = combined.match(/roblox\.com\/library\/(\d{6,})/g) || [];
                for (const m of matches) {
                    const idMatch = m.match(/(\d{6,})/);
                    if (idMatch) {
                        const pid = idMatch[1];
                        if (seenIds.has(pid)) continue;
                        seenIds.add(pid);
                        allResults.push({
                            id: pid,
                            name: (r.title || "Roblox Audio").replace(/\s*[|\-–].*$/, "").trim(),
                            creator: "From web",
                            duration: 0,
                            isVerified: false,
                            source: "web",
                            url: "https://www.roblox.com/library/" + pid
                        });
                    }
                }
            }
        } catch (e) { /* continue */ }
    }

    // Run all layers
    await searchToolbox(query);
    if (allResults.length < 5) await searchCatalog(query);
    if (allResults.length < 5) await searchWebAudio(query);

    // Related keywords (universal language support)
    const lower = query.toLowerCase();
    const relatedTerms = {
        "opm": ["opm", "filipino", "tagalog", "pinoy"],
        "filipino": ["filipino", "opm", "tagalog", "pinoy"],
        "tagalog": ["tagalog", "filipino", "opm", "pinoy"],
        "pinoy": ["pinoy", "opm", "filipino"],
        "kpop": ["kpop", "korean"],
        "anime": ["anime", "japanese", "jpop"],
        "lofi": ["lofi", "chill", "study"],
        "phonk": ["phonk", "drift"],
        "edm": ["edm", "electronic"],
        "hiphop": ["hiphop", "rap"],
        "rock": ["rock", "metal"],
        "jazz": ["jazz"],
        "classical": ["classical", "piano"],
    };

    for (const [key, terms] of Object.entries(relatedTerms)) {
        if (lower.includes(key)) {
            for (const term of terms.slice(1, 3)) {
                if (!seenIds.has("q_" + term)) {
                    seenIds.add("q_" + term);
                    await searchToolbox(term);
                    await searchWebAudio(term);
                }
            }
        }
    }

    // Sort: verified first, shorter duration
    allResults.sort((a, b) => {
        if (a.isVerified !== b.isVerified) return b.isVerified - a.isVerified;
        return (a.duration || 0) - (b.duration || 0);
    });

    return res.status(200).json({
        query: query, type: "audio",
        count: allResults.length,
        results: allResults.slice(0, 20)
    });
}

// ============================================
// GAME SEARCH — Universal + Player Count
// ============================================
async function searchGame(query, res) {
    const rawResults = [];
    const seenIds = new Set();
    const lowerQuery = query.toLowerCase().trim();

    const tavilyKey = process.env.TAVILY_API_KEY;
    try {
        if (tavilyKey && tavilyKey.length > 10) {
            const r1 = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tavilyKey },
                body: JSON.stringify({
                    query: query + " roblox game site:roblox.com/games",
                    search_depth: "advanced",
                    max_results: 12
                })
            });
            if (r1.ok) {
                const d1 = await r1.json();
                if (Array.isArray(d1.results)) {
                    for (const r of d1.results) {
                        const matches = (r.url || "").match(/roblox\.com\/games\/(\d{6,})/g) || [];
                        for (const m of matches) {
                            const idMatch = m.match(/(\d{6,})/);
                            if (idMatch) {
                                const pid = idMatch[1];
                                if (!seenIds.has(pid)) {
                                    seenIds.add(pid);
                                    rawResults.push({
                                        id: pid, placeId: pid,
                                        name: (r.title || "Roblox Game").replace(/\s*[|\-–].*$/, "").trim(),
                                        creator: "Roblox User", playing: 0,
                                        url: "https://www.roblox.com/games/" + pid,
                                        snippet: (r.content || "").slice(0, 120)
                                    });
                                }
                            }
                        }
                    }
                }
            }
        }
    } catch (e) { /* ignore */ }

    if (lowerQuery.includes("blox fruit") && !seenIds.has("2753915549")) {
        seenIds.add("2753915549");
        rawResults.unshift({
            id: "2753915549", placeId: "2753915549",
            name: "Blox Fruits", creator: "Gamer Robot Inc", playing: 0,
            url: "https://www.roblox.com/games/2753915549",
            snippet: "Welcome to Blox Fruits!"
        });
    }

    if (rawResults.length > 0) {
        try {
            const targetGames = rawResults.slice(0, 10);
            const universeMap = {};
            await Promise.all(targetGames.map(async (g) => {
                try {
                    const uResp = await fetch(`https://apis.roblox.com/universes/v1/places/${g.placeId}/universe`, {
                        headers: { 'User-Agent': 'Mozilla/5.0' }
                    });
                    if (uResp.ok) {
                        const uData = await uResp.json();
                        if (uData && uData.universeId) universeMap[g.placeId] = String(uData.universeId);
                    }
                } catch (e) { /* ignore */ }
            }));

            const universeIds = Object.values(universeMap);
            if (universeIds.length > 0) {
                const gamesUrl = `https://games.roblox.com/v1/games?universeIds=${universeIds.join(",")}`;
                const gResp = await fetch(gamesUrl, {
                    headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
                });
                if (gResp.ok) {
                    const gData = await gResp.json();
                    if (gData && Array.isArray(gData.data)) {
                        const infoMap = {};
                        for (const item of gData.data) {
                            infoMap[String(item.id)] = {
                                playing: item.playing || 0,
                                name: item.name,
                                creator: item.creator ? item.creator.name : "Unknown"
                            };
                        }
                        for (const game of rawResults) {
                            const uId = universeMap[game.placeId];
                            if (uId && infoMap[uId]) {
                                game.playing = infoMap[uId].playing;
                                game.name = infoMap[uId].name || game.name;
                                game.creator = infoMap[uId].creator || game.creator;
                                game.snippet = "Creator: " + game.creator + " · Playing: " + game.playing.toLocaleString();
                            }
                        }
                    }
                }
            }
        } catch (e) { /* ignore */ }
    }

    rawResults.sort((a, b) => {
        const aExact = a.name.toLowerCase() === lowerQuery ? 1 : 0;
        const bExact = b.name.toLowerCase() === lowerQuery ? 1 : 0;
        if (aExact !== bExact) return bExact - aExact;
        return b.playing - a.playing;
    });

    return res.status(200).json({
        query: query, type: "game",
        count: rawResults.length,
        results: rawResults.slice(0, 12)
    });
}

async function searchUser(query, res) {
    try {
        const url = 'https://users.roblox.com/v1/users/search?keyword=' + encodeURIComponent(query) + '&limit=10';
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        if (response.ok) {
            const data = await response.json();
            const results = [];
            if (Array.isArray(data.data)) {
                for (let i = 0; i < data.data.length; i++) {
                    const u = data.data[i];
                    results.push({
                        id: String(u.id), name: u.name || "Unknown",
                        displayName: u.displayName || u.name,
                        url: "https://www.roblox.com/users/" + u.id + "/profile"
                    });
                }
            }
            if (results.length > 0) return res.status(200).json({ query, type: "user", count: results.length, results: results.slice(0, 10) });
        }
        return res.status(200).json({ query, type: "user", count: 0, results: [] });
    } catch (err) {
        return res.status(200).json({ query, type: "user", count: 0, results: [], error: String(err && err.message ? err.message : err) });
    }
}

async function searchScript(query, res) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    let searchResults = [];

    if (tavilyKey && tavilyKey.length > 10) {
        try {
            const tavilyResp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer ' + tavilyKey
                },
                body: JSON.stringify({
                    query: query + " roblox script loadstring working",
                    search_depth: "advanced",
                    max_results: 8
                })
            });
            if (tavilyResp.ok) {
                const tavilyData = await tavilyResp.json();
                if (Array.isArray(tavilyData.results)) {
                    for (const r of tavilyData.results) {
                        searchResults.push({ title: r.title || "Result", url: r.url || "", snippet: r.content || "" });
                    }
                }
            }
        } catch (e) { /* ignore */ }
    }

    const extractedScripts = [];
    const seenCodes = new Set();

    for (const result of searchResults.slice(0, 6)) {
        if (!result.url) continue;
        try {
            const pageResp = await fetch(result.url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml'
                },
                redirect: 'follow',
                signal: AbortSignal.timeout(8000)
            });
            if (!pageResp.ok) continue;
            const html = await pageResp.text();
            const patterns = extractLoadstrings(html);
            for (const code of patterns) {
                if (!seenCodes.has(code)) {
                    seenCodes.add(code);
                    extractedScripts.push({
                        code: code, source: result.url, sourceTitle: result.title,
                        safety: analyzeScriptSafety(code)
                    });
                }
            }
        } catch (e) { /* continue */ }
        if (extractedScripts.length >= 15) break;
    }

    return res.status(200).json({
        query: query, type: "script",
        searchResults: searchResults.slice(0, 5).map(r => ({
            title: r.title, url: r.url, snippet: (r.snippet || "").slice(0, 200)
        })),
        extractedCount: extractedScripts.length,
        scripts: extractedScripts.slice(0, 12)
    });
}

function extractLoadstrings(text) {
    const scripts = [];
    if (!text || typeof text !== 'string') return scripts;
    const patterns = [
        /loadstring\s*\(\s*game\s*:\s*HttpGet(?:Async)?\s*\(\s*["']([^"'\s]{20,}?)["']\s*\)\s*\)/g,
        /game\s*:\s*HttpGet(?:Async)?\s*\(\s*["']([^"'\s]{20,}?)["']\s*\)/g
    ];
    for (const pattern of patterns) {
        let match;
        while ((match = pattern.exec(text)) !== null) {
            let url = match[1].trim();
            url = url.replace(/[,\.\)\]\>"']+$/, '');
            url = url.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").replace(/&#x2F;/g, '/');
            if (url && url.startsWith('http') && url.length > 25 && url.length < 500) {
                const fullCode = 'loadstring(game:HttpGet("' + url + '"))()';
                if (!scripts.includes(fullCode)) scripts.push(fullCode);
            }
        }
    }
    return scripts;
}

function analyzeScriptSafety(code) {
    const lower = code.toLowerCase();
    const flags = [];
    let score = 0;
    if (lower.includes('roblosecurity')) { flags.push("🚨 Cookie stealer"); score -= 5; }
    if (lower.includes('discord.com/api/webhooks')) { flags.push("🚨 Discord webhook"); score -= 4; }
    if (lower.includes('syn.request') || lower.includes('http_request')) { flags.push("⚠️ External requests"); score -= 1; }
    if (code.length > 200) { flags.push("⚠️ Very long URL"); score -= 1; }
    if (lower.includes('pastebin') || lower.includes('githubusercontent') || lower.includes('rentry') || lower.includes('raw.')) {
        flags.push("✅ Known script host"); score += 2;
    }
    if (lower.includes('roblox.com')) { flags.push("✅ Roblox domain"); score += 1; }
    let level = "CAUTION";
    if (score >= 3) level = "SAFE";
    else if (score >= 1) level = "LIKELY_SAFE";
    else if (score <= -4) level = "DANGER";
    else if (score <= -1) level = "SUSPICIOUS";
    return { level, score, flags };
}

async function searchWeb(query, res) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    if (tavilyKey && tavilyKey.length > 10) {
        try {
            const tavilyResp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + tavilyKey },
                body: JSON.stringify({ query, search_depth: "basic", max_results: 8, include_answer: true })
            });
            if (tavilyResp.ok) {
                const tavilyData = await tavilyResp.json();
                const results = [];
                if (tavilyData.answer) results.push({ title: "AI Answer", snippet: tavilyData.answer, url: "" });
                if (Array.isArray(tavilyData.results)) {
                    for (const r of tavilyData.results) {
                        results.push({ title: r.title || "Result", snippet: r.content || "", url: r.url || "" });
                    }
                }
                if (results.length > 0) return res.status(200).json({ query, type: "web", source: "tavily", count: results.length, results: results.slice(0, 8) });
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
                if (wikiData.content_urls && wikiData.content_urls.desktop && wikiData.content_urls.desktop.page) pageUrl = wikiData.content_urls.desktop.page;
                return res.status(200).json({ query, type: "web", source: "wikipedia", count: 1, results: [{ title: wikiData.title || query, snippet: wikiData.extract, url: pageUrl }] });
            }
        }
    } catch (e) { /* fall through */ }
    return res.status(200).json({
        query, type: "web", source: "fallback", count: 1,
        results: [{ title: 'Search "' + query + '"', snippet: "Click to search online.", url: "https://www.google.com/search?q=" + encodeURIComponent(query) }]
    });
}