const Groq = require('groq-sdk');
const pool = require('../config/db');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LEGAL_SYSTEM_PROMPT = `You are LegalConnect AI, a professional legal assistant for Indian law.

When user says hi/hello/greetings or asks non-legal questions, respond normally and friendly.

When user describes a LEGAL PROBLEM, you MUST respond ONLY in this exact JSON format and nothing else:

{
  "type": "legal",
  "case_type": "Type of case (e.g. Defamation, Theft, Divorce)",
  "nature": "Civil or Criminal",
  "law": "Applicable law name",
  "sections": "Relevant IPC/CrPC/Act section numbers and names",
  "where_to_file": "Which court to approach",
  "steps": "Step by step action to take",
  "fine_range": "Minimum fine – Maximum fine or Not Applicable",
  "lawyer_type": "Type of lawyer needed (Criminal/Family/Civil/Consumer/Cyber/Labour/Property/Tax)"
}

For non-legal queries respond in this JSON format:
{
  "type": "general",
  "message": "Your friendly response here"
}

IMPORTANT: Always return valid JSON only. No extra text outside JSON.`;

const getAdvocatesBySpecialization = async (lawyerType) => {
  try {
    const result = await pool.query(
      `SELECT full_name, phone, city, specialization, experience_years
       FROM advocates
       WHERE LOWER(specialization) ILIKE $1
       AND status = 'approved'
       ORDER BY experience_years DESC
       LIMIT 3`,
      [`%${lawyerType.toLowerCase()}%`]
    );
    return result.rows;
  } catch (error) {
    return [];
  }
};

const chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message)
      return res.status(400).json({ success: false, message: 'Message is required' });

    const messages = [
      { role: 'system', content: LEGAL_SYSTEM_PROMPT },
    ];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    messages.push({ role: 'user', content: message });

    const completion = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages,
      max_tokens: 1024,
      temperature: 0.3,
    });

    const rawReply = completion.choices[0].message.content;

    let parsed;
    try {
      const cleaned = rawReply.replace(/```json|```/g, '').trim();
      parsed = JSON.parse(cleaned);
    } catch (e) {
      return res.json({
        success: true,
        reply: rawReply,
        type: 'general',
      });
    }

    let advocates = [];
    if (parsed.type === 'legal' && parsed.lawyer_type) {
      advocates = await getAdvocatesBySpecialization(parsed.lawyer_type);
    }

    res.json({
      success: true,
      type: parsed.type,
      data: parsed,
      advocates,
      reply: parsed.type === 'general' ? parsed.message : null,
    });

  } catch (error) {
    console.error('Chat error:', error.message);
    res.status(500).json({ success: false, message: 'AI chat failed' });
  }
};

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