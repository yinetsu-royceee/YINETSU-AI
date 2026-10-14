
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const query = req.query.q || "";
  const type = (req.query.type || "web").toLowerCase();

  if (!query) {
    return res.status(200).json({ 
      status: "alive", 
      message: "search endpoint working",
      query: null,
      type: type
    });
  }

  return res.status(200).json({
    status: "alive",
    query: query,
    type: type,
    message: "search endpoint received query"
  });
}
