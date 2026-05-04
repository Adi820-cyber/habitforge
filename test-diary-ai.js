require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function testDiaryAI() {
  const system = `You are an AI diary coach for a young Indian student learning English.
Return ONLY valid JSON. No markdown, no extra text.`;

  const user = `Context:
- Mood: 😊, Energy: medium
- Diary entry: "hi today is grate day i went to college and give exam i see lots of faces as overthinker it's hard to keep thinking about other but i feel that bcz of it i am geeting some personal loss i have to fix it"

Return JSON with this EXACT structure:
{
  "corrected_entry": "...",
  "english_lessons": [{"original": "...", "corrected": "...", "explanation": "..."}],
  "mood_analysis": {"detected_mood": "...", "energy_level": "medium", "emotional_keywords": [], "mood_summary": "..."},
  "habit_suggestions": [{"habit": "...", "reason": "..."}],
  "coach_message": "..."
}`;

  console.log('Testing diary AI with Groq...');
  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: user }
    ],
    temperature: 0.7,
    max_tokens: 2048,
    response_format: { type: 'json_object' }
  });

  const text = result.choices[0].message.content;
  const parsed = JSON.parse(text);
  console.log('\n✅ DIARY AI WORKS!\n');
  console.log('coach_message:', parsed.coach_message);
  console.log('corrected_entry:', parsed.corrected_entry.substring(0, 100) + '...');
  console.log('english_lessons count:', parsed.english_lessons?.length);
  console.log('detected_mood:', parsed.mood_analysis?.detected_mood);
}

testDiaryAI().catch(e => console.error('FAILED:', e.message));
