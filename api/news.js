export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST,PUT,DELETE');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  // Handle OPTIONS request for CORS preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const API_KEY = process.env.VITE_NEWS_API_KEY;
  const { endpoint, ...queryParams } = req.query;

  try {
    // Construct the URL with query parameters
    const queryString = new URLSearchParams({
      ...queryParams,
      apiKey: API_KEY
    }).toString();

    const apiUrl = `https://newsapi.org/v2/${endpoint}?${queryString}`;
    
    const response = await fetch(apiUrl);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'Failed to fetch news');
    }

    res.status(200).json(data);
  } catch (error) {
    console.error('News API Error:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
}