const Groq = require('groq-sdk');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LEGAL_SYSTEM_PROMPT = `You are LegalConnect AI, a professional legal assistant for Indian law.

Always respond in this exact structured format:

📋 Article/Section: [Relevant law section or article number]
👨‍⚖️ Suggested Lawyer Type: [Type of lawyer needed for this case]
⚖️ Legal Standing: [Strong / Moderate / Weak case]
📝 Description: [2-3 lines max explaining the situation clearly]
✅ Recommended Steps:
1. [Step one]
2. [Step two]
3. [Step three]

Important rules:
- Always use the format above — never write long paragraphs
- Keep Description under 3 lines
- Maximum 3 recommended steps
- If asked non-legal questions, politely redirect to legal topics
- Always recommend consulting a qualified advocate for specific advice
- Base all answers on Indian law only`;

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