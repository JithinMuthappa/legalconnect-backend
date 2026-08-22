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

const getFallbackReply = (message = '') => {
  const query = message.toLowerCase();
  if (query.includes('divorce') || query.includes('marriage') || query.includes('maintenance')) {
    return 'For a family-law matter, keep relevant documents such as marriage records, financial details, and any communications. You may seek advice from a family-law advocate before filing. LegalConnect can help you find one.';
  }
  if (query.includes('property') || query.includes('land') || query.includes('rent')) {
    return 'For a property matter, preserve sale deeds, agreements, payment records, and relevant communications. A property advocate can review the documents and explain the appropriate civil remedy.';
  }
  if (query.includes('police') || query.includes('theft') || query.includes('crime') || query.includes('fir')) {
    return 'If this concerns an alleged crime, preserve evidence and note dates, witnesses, and communications. You can consult a criminal-law advocate about filing a complaint or responding to police action.';
  }
  return 'I can help you understand common legal next steps under Indian law. Please describe your issue, the location, and any important dates or documents. For urgent matters, please contact a qualified advocate directly.';
};

const getFallbackLegalAnalysis = (message = '') => {
  const query = message.toLowerCase();
  if (query.includes('harm') || query.includes('hit') || query.includes('assault') || query.includes('neighbour') || query.includes('threat')) {
    return {
      type: 'legal',
      case_type: 'Assault / Criminal Intimidation',
      nature: 'Criminal',
      law: 'Bharatiya Nyaya Sanhita, 2023',
      sections: 'Relevant provisions may include voluntarily causing hurt and criminal intimidation (formerly IPC Sections 323 and 506), depending on the facts.',
      where_to_file: 'Nearest police station or the local Magistrate court, as advised by an advocate.',
      steps: 'Preserve medical records, photos, CCTV footage, messages, and witness details. Submit a written complaint and obtain an acknowledgement or FIR number.',
      fine_range: 'Depends on the offence proved and the facts of the case.',
      compensation: 'An advocate can advise on compensation for medical expenses, injury, or other proven loss.',
      lawyer_type: 'Criminal Lawyer',
    };
  }
  return null;
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
    const legalFallback = getFallbackLegalAnalysis(req.body?.message);
    if (legalFallback) {
      return res.json({
        success: true,
        type: 'legal',
        data: legalFallback,
        advocates: await getAdvocatesBySpecialization(legalFallback.lawyer_type),
        fallback: true,
      });
    }
    res.json({
      success: true,
      type: 'general',
      reply: getFallbackReply(req.body?.message),
      fallback: true,
    });
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
