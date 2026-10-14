async function searchWeb(query, res) {
    const tavilyKey = process.env.TAVILY_API_KEY;
    
    // Try Tavily first (best quality)
    if (tavilyKey && tavilyKey.length > 10) {
        try {
            const tavilyResp = await fetch('https://api.tavily.com/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    api_key: tavilyKey,
                    query: query,
                    search_depth: "basic",
                    max_results: 8,
                    include_answer: true,
                    include_raw_content: false
                })
            });

            if (tavilyResp.ok) {
                const tavilyData = await tavilyResp.json();
                const results = [];

                // Add AI answer if available
                if (tavilyData.answer) {
                    results.push({
                        title: "AI Answer",
                        snippet: tavilyData.answer,
                        url: ""
                    });
                }

                // Add search results
                if (Array.isArray(tavilyData.results)) {
                    for (const r of tavilyData.results) {
                        results.push({
                            title: r.title || "Result",
                            snippet: r.content || r.snippet || "",
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
            } else {
                // Rate limited or error → fallback
                console.warn('[Search] Tavily returned ' + tavilyResp.status + ' — using DDG fallback');
            }
        } catch (e) {
            console.warn('[Search] Tavily failed: ' + e.message + ' — using DDG fallback');
        }
    }

    // Fallback: Wikipedia
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

    // Final fallback: DuckDuckGo
    try {
        const ddgUrl = 'https://api.duckduckgo.com/?q=' + encodeURIComponent(query) + '&format=json&no_html=1&skip_disambig=1';
        const ddgResp = await fetch(ddgUrl, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
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