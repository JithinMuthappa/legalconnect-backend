const https = require('https');
const GNEWS_API_BASE = 'https://gnews.io/api/v4/search';
const LEGAL_QUERY = 'India law OR legal OR court OR judiciary OR IPC OR CrPC OR Supreme Court OR legal update OR legal rights';
const DEFAULT_GNEWS_API_KEY = '6438717dcc4d2a66305bafef07bed783';
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.GNEWS_API_KEY || DEFAULT_GNEWS_API_KEY;

const fetchJson = (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let body = '';

        res.on('data', (chunk) => {
          body += chunk;
        });

        res.on('end', () => {
          try {
            const parsed = JSON.parse(body);
            resolve({ status: res.statusCode, body: parsed });
          } catch (error) {
            reject(error);
          }
        });
      })
      .on('error', reject);
  });
};

const getLegalNews = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const query = req.query.q || LEGAL_QUERY;
    const url = `${GNEWS_API_BASE}?q=${encodeURIComponent(query)}&lang=en&country=in&max=${limit}&token=${NEWS_API_KEY}`;

    const { status, body } = await fetchJson(url);
    if (status !== 200) {
      console.error('GNews API error:', status, body);
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch legal news from external provider.',
      });
    }

    const articles = (body.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.image || null,
      publishedAt: article.publishedAt,
      source: article.source && article.source.name ? article.source.name : 'Unknown',
      content: article.content || article.description || '',
      videoUrl: article.video?.url || null,
    }));

    res.json({ success: true, articles });
  } catch (error) {
    console.error('News fetch error:', error.message || error);
    res.status(500).json({ success: false, message: 'Unable to load news.' });
  }
};

module.exports = { getLegalNews };