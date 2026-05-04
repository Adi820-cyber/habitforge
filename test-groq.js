require('dotenv').config();
const Groq = require('groq-sdk');
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

async function test() {
  console.log('Testing Groq AI with key:', process.env.GROQ_API_KEY.substring(0, 20) + '...');
  const result = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile',
    messages: [
      { role: 'system', content: 'You are a helpful assistant. Return only valid JSON.' },
      { role: 'user', content: 'Respond with a simple JSON greeting.' }
    ],
    temperature: 0.5,
    max_tokens: 100,
    response_format: { type: 'json_object' }
  });
  console.log('SUCCESS:', result.choices[0].message.content);
  console.log('Model used:', result.model);
  console.log('Tokens used:', result.usage.total_tokens);
}

test().catch(e => console.error('FAILED:', e.message, e.status));
