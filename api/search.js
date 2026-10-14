export default async function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (req.method === 'OPTIONS') return res.status(200).end();

    const query = req.query.q || "";
    const type = req.query.type || "web";

    if (!query) {
        return res.status(200).json({ test: "OK", message: "search.js is working!" });
    }

    return res.status(200).json({
        test: "OK",
        query: query,
        type: type,
        message: "search.js is alive!"
    });
}