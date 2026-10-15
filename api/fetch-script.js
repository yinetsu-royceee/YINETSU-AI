// ═══════════════════════════════════════════════════════════════
// YINETSU FETCH-SCRIPT — Optimized (Oct 2026 FINAL)
// Features: 3-Week Caching · Timeout · Known Safe Whitelist
// ═══════════════════════════════════════════════════════════════

const FETCH_TIMEOUT_MS = 8000;

// ═══ CACHING (3 weeks TTL, by URL) ═══
const SCRIPT_CACHE = new Map();
const CACHE_TTL_MS = 3 * 7 * 24 * 60 * 60 * 1000; // 21 days

// ═══ KNOWN SAFE SCRIPTS (whitelist para sa safety boost) ═══
const KNOWN_SAFE_SCRIPTS = [
    "infiniteyield",
    "edgeiy/infiniteyield",
    "rayfield",
    "orion-library",
    "kavo-ui-library",
    "wally",
    "synapse",
    "krnl",
];

function getCachedScript(url) {
    const entry = SCRIPT_CACHE.get(url);
    if (!entry) return null;
    if (Date.now() - entry.time > CACHE_TTL_MS) {
        SCRIPT_CACHE.delete(url);
        return null;
    }
    return entry.data;
}

function setCachedScript(url, data) {
    SCRIPT_CACHE.set(url, { data, time: Date.now() });
    if (SCRIPT_CACHE.size > 500) {
        const now = Date.now();
        for (const [k, v] of SCRIPT_CACHE.entries()) {
            if (now - v.time > CACHE_TTL_MS) SCRIPT_CACHE.delete(k);
        }
    }
}

// ═══ FETCH WITH TIMEOUT ═══
async function fetchWithTimeout(url, options, timeoutMs) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, { ...options, signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

// ═══ MAIN HANDLER ═══
export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    res.setHeader('Content-Type', 'application/json');

    if (req.method === 'OPTIONS') return res.status(200).end();

    const url = req.query.url;
    if (!url) {
        return res.status(400).json({ error: "No URL provided" });
    }

    // ═══ CHECK CACHE FIRST ═══
    const cached = getCachedScript(url);
    if (cached) {
        console.log(`[Yinetsu Fetch] ⚡ CACHE HIT: ${url.substring(0, 60)}`);
        return res.status(200).json({
            ...cached,
            cached: true
        });
    }

    // ═══ WHITELIST CHECK ═══
    const allowedHosts = [
        'pastebin.com',
        'raw.githubusercontent.com',
        'github.com',
        'gist.githubusercontent.com',
        'rentry.co',
        'hastebin.com',
        'controlc.com',
        'pastes.io'
    ];

    let parsedUrl;
    try {
        parsedUrl = new URL(url);
    } catch (e) {
        return res.status(400).json({ error: "Invalid URL" });
    }

    const host = parsedUrl.hostname.replace('www.', '');
    if (!allowedHosts.some(h => host === h || host.endsWith('.' + h))) {
        return res.status(200).json({
            error: "URL not from allowed source",
            allowed: allowedHosts,
            safety: { level: "UNKNOWN", reason: "Untrusted domain" }
        });
    }

    // ═══ FETCH WITH TIMEOUT ═══
    try {
        const response = await fetchWithTimeout(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
            redirect: 'follow'
        }, FETCH_TIMEOUT_MS);

        if (!response.ok) {
            return res.status(200).json({
                error: "Failed to fetch: " + response.status,
                safety: { level: "UNKNOWN" }
            });
        }

        const code = await response.text();
        const safety = analyzeCode(code, host);

        const result = {
            url: url,
            host: host,
            length: code.length,
            safety: safety,
            code: code.slice(0, 5000),
            truncated: code.length > 5000
        };

        // ═══ SAVE TO CACHE ═══
        setCachedScript(url, result);
        console.log(`[Yinetsu Fetch] ✅ Fetched & cached: ${url.substring(0, 60)}`);

        return res.status(200).json(result);
    } catch (err) {
        const msg = err.name === 'AbortError' ? 'Request timed out' : err.message;
        return res.status(200).json({
            error: "Fetch error: " + msg,
            safety: { level: "UNKNOWN" }
        });
    }
}

// ═══ SAFETY ANALYSIS ═══
function analyzeCode(code, host) {
    const lower = code.toLowerCase();
    const flags = [];
    let score = 0;

    // DANGER patterns (score -3 each)
    if (lower.includes('roblosecurity')) { flags.push("🚨 Attempts to steal Roblox cookie"); score -= 3; }
    if (lower.includes('getuseridfromcookie')) { flags.push("🚨 Cookie grabber detected"); score -= 3; }
    if (lower.includes('webhook') && (lower.includes('discord') || lower.includes('discord.com'))) {
        flags.push("🚨 Discord webhook (token grabber pattern)"); score -= 3;
    }
    if (lower.includes('http_request') && lower.includes('post') && lower.includes('password')) {
        flags.push("🚨 Phishing pattern detected"); score -= 3;
    }

    // SUSPICIOUS patterns (score -1 each)
    if (lower.includes('game:getservice("httpsservice")')) { flags.push("⚠️ HTTPS request"); score -= 1; }
    if (code.length > 10000 && (code.match(/[a-z0-9]{50,}/g) || []).length > 5) {
        flags.push("⚠️ Heavily obfuscated"); score -= 1;
    }
    if (lower.includes('while true do') && !lower.includes('wait')) {
        flags.push("⚠️ Infinite loop without wait (crash risk)"); score -= 1;
    }
    if (host === 'pastebin.com' && !code.includes('--') && !code.includes('local')) {
        flags.push("⚠️ No comments / no local (possible obfuscated)"); score -= 1;
    }
    if (lower.includes('request') && lower.includes('.xyz')) { flags.push("⚠️ Fetches from sketchy .xyz domain"); score -= 1; }
    if (lower.includes('request') && lower.includes('.tk')) { flags.push("⚠️ Fetches from .tk domain"); score -= 1; }

    // SAFE patterns (score +2 each)
    if (host === 'raw.githubusercontent.com' || host === 'gist.githubusercontent.com') {
        flags.push("✅ GitHub source (transparent)"); score += 2;
    }
    if (code.includes('--') && code.length < 3000) { flags.push("✅ Readable code with comments"); score += 2; }
    if (lower.includes('made by') || lower.includes('author') || lower.includes('-- [')) {
        flags.push("✅ Has author signature"); score += 1;
    }

    // ═══ KNOWN SAFE SCRIPTS BOOST ═══
    const isKnownSafe = KNOWN_SAFE_SCRIPTS.some(name =>
        code.toLowerCase().includes(name) || host.toLowerCase().includes(name)
    );
    if (isKnownSafe) {
        flags.push("✅ Known safe script");
        score += 5; // Boost to SAFE
    }

    // Determine level
    let level = "CAUTION";
    if (score >= 3) level = "SAFE";
    else if (score <= -3) level = "DANGER";
    else if (score >= 1) level = "LIKELY_SAFE";
    else if (score <= -1) level = "SUSPICIOUS";

    return { level: level, score: score, flags: flags };
}