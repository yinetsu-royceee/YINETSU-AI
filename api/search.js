// api/search.js
export default async function handler(req, res) {
  try {
    // 1. Handle CORS so frontends can call this API
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    // 2. Extract query parameter (works for both standard Node/Express and Vercel routing)
    const url = new URL(req.url, `http://${req.headers.host}`);
    const query = url.searchParams.get('q');

    // 3. Ensure a search query was provided
    if (!query) {
      return res.status(400).json({ error: 'Missing search query parameter "q"' });
    }

    // 4. Sample database to query against
    const dataItems = [
      { id: 1, name: "Yinetsu AI Chatbot", type: "AI Feature" },
      { id: 2, name: "JavaScript API Integration", type: "Guide" },
      { id: 3, name: "Vercel Production Deployment", type: "DevOps" },
      { id: 4, name: "Next.js Serverless Functions", type: "Framework" }
    ];

    // 5. Filter items match (case-insensitive)
    const matches = dataItems.filter(item => 
      item.name.toLowerCase().includes(query.toLowerCase()) ||
      item.type.toLowerCase().includes(query.toLowerCase())
    );

    // 6. Return response
    return res.status(200).json({ success: true, results: matches });

  } catch (error) {
    return res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
}
