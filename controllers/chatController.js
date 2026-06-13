const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LEGAL_SYSTEM_PROMPT = `You are LegalConnect AI, a professional legal assistant for Indian law. 
You help users understand their legal rights, explain legal terms, provide general legal guidance, 
and help them find the right type of lawyer for their situation.

Important rules:
- Only answer legal questions related to Indian law
- Always recommend consulting a qualified advocate for specific legal advice
- Be professional, clear and helpful
- Keep responses concise and easy to understand
- If asked non-legal questions, politely redirect to legal topics`;

// ─── Chat with AI ─────────────────────────────────────────────────────────────
const chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message)
      return res.status(400).json({ success: false, message: 'Message is required' });

    // Build conversation history
    const messages = [
      { role: 'system', content: LEGAL_SYSTEM_PROMPT },
    ];

    // Add previous chat history if provided
    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    // Add current message
    messages.push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.7,
    });

    const reply = completion.choices[0].message.content;

    res.json({
      success: true,
      reply,
      usage: completion.usage,
    });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ success: false, message: 'AI chat failed' });
  }
};

// ─── Get Legal Topics ─────────────────────────────────────────────────────────
const getLegalTopics = async (req, res) => {
  res.json({
    success: true,
    topics: [
      'Criminal Law',
      'Family Law & Divorce',
      'Property & Real Estate Law',
      'Consumer Protection',
      'Labour & Employment Law',
      'Corporate & Business Law',
      'Cyber Law',
      'Constitutional Rights',
      'Tax Law',
      'Intellectual Property',
    ],
  });
};

module.exports = { chat, getLegalTopics };