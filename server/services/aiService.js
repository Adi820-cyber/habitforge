const Groq = require('groq-sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ── GROQ CLIENT (primary — fast, free, reliable JSON mode) ──
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const GROQ_MODEL = 'llama-3.3-70b-versatile';

// ── GEMINI CLIENT (fallback) ──
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// ─────────────────────────────────────────────
// Core: call Groq with JSON mode (guaranteed clean JSON)
// ─────────────────────────────────────────────
async function callGroq(systemPrompt, userContent) {
  const completion = await groq.chat.completions.create({
    model: GROQ_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent }
    ],
    temperature: 0.7,
    max_tokens: 2048,
    response_format: { type: 'json_object' }   // guaranteed JSON — no parsing needed
  });
  const text = completion.choices[0]?.message?.content || '{}';
  return JSON.parse(text);
}

// ─────────────────────────────────────────────
// Fallback: call Gemini and extract JSON
// ─────────────────────────────────────────────
function extractJSON(text) {
  text = text.replace(/```json\s*/gi, '').replace(/```\s*/g, '').trim();
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON in response');
  return JSON.parse(text.slice(start, end + 1));
}

async function callGemini(prompt) {
  const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
  const result = await model.generateContent(prompt);
  return extractJSON(result.response.text());
}

// ─────────────────────────────────────────────
// 1. Daily suggestion (dashboard AI card)
// ─────────────────────────────────────────────
async function generateDailySuggestion(userId, habits, doneCount, totalCount) {
  const completionRate = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
  const pendingHabits = habits.filter(h => h.status === 'pending').map(h => h.name);
  const doneHabits = habits.filter(h => h.status === 'done').map(h => h.name);

  const system = `You are a motivational habit coach for a young Indian student. Be direct, warm, personal. Return ONLY valid JSON.`;
  const user = `User context:
- Done today: ${doneCount}/${totalCount} habits (${completionRate}%)
- Completed: ${doneHabits.join(', ') || 'none yet'}
- Pending: ${pendingHabits.join(', ') || 'all done!'}

Return JSON with this exact structure:
{
  "motivation": "one powerful motivational sentence",
  "suggestions": ["tip 1 for pending habits", "tip 2", "tip 3"]
}`;

  try {
    return await callGroq(system, user);
  } catch (groqErr) {
    console.warn('Groq failed, trying Gemini:', groqErr.message);
    try {
      return await callGemini(`${system}\n\n${user}`);
    } catch {
      return {
        motivation: completionRate >= 50
          ? `You're ${completionRate}% done — finish strong today! 💪`
          : `Start now! Complete your pending ${pendingHabits.length} habits.`,
        suggestions: pendingHabits.slice(0, 3).map(h => `Focus on: ${h}`)
      };
    }
  }
}

// ─────────────────────────────────────────────
// 2. Diary AI (main feature)
// ─────────────────────────────────────────────
async function processDiaryEntry(rawEntry, habitData, mood, energy, recentMoods) {
  const system = `You are an AI diary coach for a young Indian student learning English.
The user writes in broken English, Marathi, Hindi, or mixed language. Be warm and helpful.
ALWAYS return valid JSON only. No markdown, no extra text.`;

  const user = `Context:
- Habits today: ${JSON.stringify(habitData)}
- Mood: ${mood || 'not set'}, Energy: ${energy || 'not set'}
- Recent moods: ${recentMoods?.join(', ') || 'no data'}

Diary entry: "${rawEntry}"

Return JSON with this EXACT structure:
{
  "corrected_entry": "full diary rewritten in clear natural English",
  "english_lessons": [
    {"original": "incorrect phrase", "corrected": "correct version", "explanation": "simple rule"}
  ],
  "mood_analysis": {
    "detected_mood": "single word",
    "energy_level": "low or medium or high",
    "emotional_keywords": ["word1", "word2"],
    "mood_summary": "1-2 sentence emotional summary"
  },
  "habit_suggestions": [
    {"habit": "habit name", "reason": "why suggested based on entry"}
  ],
  "coach_message": "short warm personal message max 2 sentences"
}`;

  try {
    console.log('Calling Groq for diary AI...');
    const result = await callGroq(system, user);
    console.log('Groq diary response received ✓');
    return result;
  } catch (groqErr) {
    console.warn('Groq diary failed:', groqErr.message, '— trying Gemini...');
    try {
      return await callGemini(`${system}\n\n${user}`);
    } catch (geminiErr) {
      console.error('Both AI providers failed. Using fallback.', geminiErr.message);
      return {
        corrected_entry: rawEntry,
        english_lessons: [],
        mood_analysis: {
          detected_mood: mood || 'neutral',
          energy_level: energy || 'medium',
          emotional_keywords: [],
          mood_summary: 'AI temporarily unavailable. Your entry is saved safely.'
        },
        habit_suggestions: [],
        coach_message: 'Great job writing today! Daily journaling is itself a powerful habit. Keep it up! 📝'
      };
    }
  }
}

// ─────────────────────────────────────────────
// 3. Weekly insight (Settings > Weekly AI Insight)
// ─────────────────────────────────────────────
async function generateWeeklyInsight(userId, moodData, energyData, habitRates, errorCounts) {
  const system = `You are a personal growth analyst. Return ONLY valid JSON.`;
  const user = `Weekly data:
- Moods: ${JSON.stringify(moodData)}
- Energy: ${JSON.stringify(energyData)}
- Habit completion: ${JSON.stringify(habitRates)}
- English errors fixed: ${errorCounts}

Return JSON:
{
  "mood_pattern": "key observation",
  "best_day": "most productive day and why",
  "habit_correlation": "interesting insight",
  "english_progress": "improvement note",
  "next_week_focus": ["point 1", "point 2", "point 3"]
}`;

  try {
    return await callGroq(system, user);
  } catch (groqErr) {
    console.warn('Groq weekly failed, trying Gemini:', groqErr.message);
    try {
      return await callGemini(`${system}\n\n${user}`);
    } catch {
      return {
        mood_pattern: 'Keep tracking to see patterns emerge.',
        best_day: 'Check back after a full week.',
        habit_correlation: `${habitRates.done || 0} habits completed this week.`,
        english_progress: `Fixed ${errorCounts} errors — keep writing!`,
        next_week_focus: ['Stay consistent', 'Write daily', 'Complete all habits']
      };
    }
  }
}

module.exports = { generateDailySuggestion, processDiaryEntry, generateWeeklyInsight };
