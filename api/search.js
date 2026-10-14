export default function handler(req, res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');

    const query = req.query.q || "";
    const type = (req.query.type || "web").toLowerCase();

    if (!query) {
        return res.status(200).json({ status: "alive", message: "search.js test mode" });
    }

    return res.status(200).json({
        status: "alive",
        query: query,
        type: type,
        message: "Search received query"
    });
}