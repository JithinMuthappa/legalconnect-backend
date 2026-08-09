const https = require('https');
const NEWS_API_KEY = process.env.NEWS_API_KEY || process.env.NEWSAPI_API_KEY;
const NEWS_API_BASE = 'https://newsapi.org/v2/everything';
const LEGAL_QUERY = 'India law OR legal OR court OR judiciary OR IPC OR CrPC OR Supreme Court OR legal update OR legal rights';

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
    if (!NEWS_API_KEY) {
      return res.status(500).json({
        success: false,
        message:
          'NEWS_API_KEY is not configured. Please add it to your environment variables.',
      });
    }

    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 20);
    const url = `${NEWS_API_BASE}?q=${encodeURIComponent(LEGAL_QUERY)}&language=en&sortBy=publishedAt&pageSize=${limit}&apiKey=${NEWS_API_KEY}`;

    const { status, body } = await fetchJson(url);
    if (status !== 200) {
      console.error('News API error:', status, body);
      return res.status(502).json({
        success: false,
        message: 'Failed to fetch legal news from external provider.',
      });
    }

    const articles = (body.articles || []).map((article) => ({
      title: article.title,
      description: article.description,
      url: article.url,
      imageUrl: article.urlToImage,
      publishedAt: article.publishedAt,
      source: article.source && article.source.name ? article.source.name : 'Unknown',
      content: article.content,
      videoUrl: article.videoUrl || null,
    }));

    res.json({ success: true, articles });
  } catch (error) {
    console.error('News fetch error:', error.message || error);
    res.status(500).json({ success: false, message: 'Unable to load news.' });
  }
};

module.exports = { getLegalNews };