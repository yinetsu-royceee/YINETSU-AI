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

async function searchAudio(query, res) {
    try {
        const url = 'https://catalog.roblox.com/v1/search/items/details?Category=Audio&Keyword=' + encodeURIComponent(query) + '&Limit=30&SortType=Relevance';
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Roblox/WinInet', 'Accept': 'application/json' }
        });
        if (!response.ok) {
            return res.status(200).json({ query: query, type: "audio", count: 0, results: [], note: "Roblox " + response.status });
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
        return res.status(200).json({ query: query, type: "audio", count: results.length, results: results.slice(0, 12) });
    } catch (err) {
        return res.status(200).json({ query: query, type: "audio", count: 0, results: [], error: String(err && err.message ? err.message : err) });
    }
}

// ============================================
// GAME SEARCH — ROBLOX GAMES SEARCH V2 API (FIXED)
// ============================================
async function searchGame(query, res) {
    try {
        const url = 'https://games.roblox.com/v1/games/search?keyword=' + encodeURIComponent(query) + '&maxRows=15';
        const response = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0', 'Accept': 'application/json' }
        });
        
        if (!response.ok) {
            return res.status(200).json({ query: query, type: "game", count: 0, results: [] });
        }

        const data = await response.json();
        const results = [];

        const gamesList = data.games || data.data || [];
        if (Array.isArray(gamesList)) {
            for (let i = 0; i < gamesList.length; i++) {
                const game = gamesList[i];
                const placeId = game.rootPlaceId || game.placeId || game.id;
                if (placeId) {
                    results.push({
                        id: String(placeId),
                        placeId: String(placeId),
                        name: game.name || game.title || "Untitled Game",
                        creator: game.creatorName || game.builder || "Unknown",
                        playing: game.playerCount || game.playing || game.activePlayers || 0,
                        url: "https://www.roblox.com/games/" + placeId,
                        snippet: "Creator: " + (game.creatorName || "Unknown") + " · Active: " + (game.playerCount || 0)
                    });
                }
            }
        }

        // I-sort para unahin ang original na may pinakamataas na player count
        results.sort((a, b) => b.playing - a.playing);

        return res.status(200).json({ 
            query: query, 
            type: "game", 
            count: results.length, 
            results: results.slice(0, 10) 
        });
    } catch (err) {
        return res.status(200).json({ query: query, type: "game", count: 0, results: [], error: String(err && err.message ? err.message : err) });
    }
}

// ============================================
// USER SEARCH
// ============================================
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
        return res.status(200).json({ query: query, type: "user", count: 0, results: [], error: String(err && err.message ? err.message : err) });
    }
}

// ============================================
// SCRIPT SEARCH
// ============================================
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
                        code: code,
                        source: result.url,
                        sourceTitle: result.title,
                        safety: analyzeScriptSafety(code)
                    });
                }
            }
        } catch (e) { /* continue */ }
        if (extractedScripts.length >= 15) break;
    }

    return res.status(200).json({
        query: query,
        type: "script",
        searchResults: searchResults.slice(0, 5).map(r => ({
            title: r.title, url: r.url,
            snippet: (r.snippet || "").slice(0, 200)
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
