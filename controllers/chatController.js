const Groq = require('groq-sdk');
const pool = require('../config/db');

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const LEGAL_SYSTEM_PROMPT = `You are LegalConnect AI, a professional legal assistant for Indian law.

Always respond in this EXACT structured format — no paragraphs, no exceptions:

📋 Article/Section: [Relevant IPC/CrPC/Constitution section]
⚖️ Legal Standing: [Strong / Moderate / Weak]
📝 Description: [Max 3 lines explaining the legal situation clearly]
✅ Recommended Steps:
1. [First action to take]
2. [Second action to take]
3. [Third action to take]
⚠️ Important: [One key legal warning or reminder]

Additional rules:
- Never write long paragraphs
- Always cite specific Indian law sections
- Keep each point brief and clear
- Only answer legal questions related to Indian law
- If non-legal question, politely redirect
- Always recommend consulting a registered advocate

Indian Law References to use:
1. IPC Section 302 - Murder cases - Suggest Criminal Lawyer
2. IPC Section 354 - Assault on women - Suggest Criminal/Women Rights Lawyer  
3. IPC Section 420 - Cheating/Fraud - Suggest Civil/Criminal Lawyer
4. IPC Section 498A - Domestic Violence - Suggest Family Lawyer
5. CrPC Section 125 - Maintenance cases - Suggest Family Lawyer
6. Hindu Marriage Act 1955 - Divorce cases - Suggest Family Lawyer
7. Consumer Protection Act 2019 - Consumer disputes - Suggest Consumer Lawyer
8. IT Act Section 66 - Cyber crimes - Suggest Cyber Lawyer
9. RTI Act 2005 - Right to Information - Suggest Constitutional Lawyer
10. Motor Vehicles Act Section 166 - Accident claims - Suggest Insurance/Civil Lawyer`;

// ─── Get Advocates from DB by Specialization ──────────────────────────────────
const getAdvocatesBySpecialization = async (specialization) => {
  try {
    const keywords = specialization.toLowerCase();
    const result = await pool.query(
      `SELECT full_name, phone, city, specialization, experience_years
       FROM advocates
       WHERE LOWER(specialization) ILIKE $1
       AND status = 'approved'
       LIMIT 3`,
      [`%${keywords}%`]
    );
    return result.rows;
  } catch (error) {
    return [];
  }
};

// ─── Detect lawyer type from message ──────────────────────────────────────────
const detectLawyerType = (message) => {
  const msg = message.toLowerCase();
  if (msg.includes('murder') || msg.includes('criminal') || msg.includes('arrest') || msg.includes('theft') || msg.includes('robbery')) return 'Criminal';
  if (msg.includes('divorce') || msg.includes('marriage') || msg.includes('custody') || msg.includes('maintenance') || msg.includes('domestic')) return 'Family';
  if (msg.includes('property') || msg.includes('land') || msg.includes('rent') || msg.includes('real estate')) return 'Property';
  if (msg.includes('consumer') || msg.includes('product') || msg.includes('refund') || msg.includes('fraud')) return 'Consumer';
  if (msg.includes('cyber') || msg.includes('online') || msg.includes('hacking') || msg.includes('internet')) return 'Cyber';
  if (msg.includes('labour') || msg.includes('employment') || msg.includes('salary') || msg.includes('workplace')) return 'Labour';
  if (msg.includes('tax') || msg.includes('income tax') || msg.includes('gst')) return 'Tax';
  if (msg.includes('accident') || msg.includes('insurance') || msg.includes('vehicle')) return 'Civil';
  return 'General';
};

// ─── Chat with AI ─────────────────────────────────────────────────────────────
const chat = async (req, res) => {
  try {
    const { message, history } = req.body;

    if (!message)
      return res.status(400).json({ success: false, message: 'Message is required' });

    // Detect lawyer type and fetch from DB
    const lawyerType = detectLawyerType(message);
    const advocates = await getAdvocatesBySpecialization(lawyerType);

    // Build advocate suggestion string
    let advocateSuggestion = '';
    if (advocates.length > 0) {
      advocateSuggestion = '\n\nRegistered Advocates available on LegalConnect:\n';
      advocates.forEach((adv, i) => {
        advocateSuggestion += `${i + 1}. ${adv.full_name} | ${adv.specialization} | 📞 ${adv.phone || 'N/A'} | 📍 ${adv.city} | ${adv.experience_years} yrs exp\n`;
      });
    } else {
      advocateSuggestion = `\n\nNo ${lawyerType} lawyers currently registered on LegalConnect. Please search manually.`;
    }

    // Build messages
    const messages = [
      { role: 'system', content: LEGAL_SYSTEM_PROMPT },
    ];

    if (history && Array.isArray(history)) {
      history.forEach(msg => {
        messages.push({ role: msg.role, content: msg.content });
      });
    }

    messages.push({ 
      role: 'user', 
      content: `${message}\n\n[After your structured response, append this advocate info exactly as provided: ${advocateSuggestion}]` 
    });

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
      lawyerType,
      advocatesFound: advocates.length,
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