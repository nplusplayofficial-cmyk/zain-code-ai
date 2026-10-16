const ALLOWED_LANGUAGES = new Set(['Python','JavaScript','TypeScript','C','C++','Java','SQL','Go','Rust']);
const COMPATIBLE_PROVIDERS = {
  openrouter: { key: 'OPENROUTER_API_KEY', model: 'OPENROUTER_MODEL', fallbackModel: 'meta-llama/llama-3.3-70b-instruct:free', url: 'https://openrouter.ai/api/v1/chat/completions', label: 'OpenRouter' },
  groq: { key: 'GROQ_API_KEY', model: 'GROQ_MODEL', fallbackModel: 'qwen/qwen3-32b', url: 'https://api.groq.com/openai/v1/chat/completions', label: 'Groq' },
  openai: { key: 'OPENAI_API_KEY', model: 'OPENAI_MODEL', fallbackModel: 'gpt-4.1-mini', url: 'https://api.openai.com/v1/chat/completions', label: 'OpenAI' },
  deepseek: { key: 'DEEPSEEK_API_KEY', model: 'DEEPSEEK_MODEL', fallbackModel: 'deepseek-chat', url: 'https://api.deepseek.com/chat/completions', label: 'DeepSeek' },
};

function allowedOrigin(origin, env) {
  if (!origin) return true;
  const allowed = String(env.FRONTEND_ORIGIN || 'https://nplusplayofficial-cmyk.github.io')
    .split(',').map(value => value.trim()).filter(Boolean);
  return allowed.includes(origin);
}

function json(data, status, origin, env) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Vary': 'Origin',
  };
  if (origin && allowedOrigin(origin, env)) headers['Access-Control-Allow-Origin'] = origin;
  return new Response(JSON.stringify(data), { status, headers });
}

function extractCode(value) {
  const text = String(value || '').trim();
  const fenced = text.match(/```(?:[\w+-]+)?\s*\n([\s\S]*?)\n```/);
  return (fenced ? fenced[1] : text).trim();
}

async function geminiGenerate(body, env) {
  const key = env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini is not configured yet. Add GEMINI_API_KEY as a Cloudflare Worker secret.');
  const model = env.GEMINI_MODEL || 'gemini-2.5-flash';
  const system = `You are ZAIN, a careful coding assistant. Write correct ${body.language} code for the user's task. ${body.answerOnly ? 'Return only code, without Markdown fences or commentary.' : 'Give a concise explanation followed by code.'} Never claim code was executed unless a verification service actually ran it.`;
  const tests = Array.isArray(body.tests) ? body.tests.slice(0, 5) : [];
  const testText = tests.length ? '\\nSample tests to account for:\\n' + tests.map((test, i) => `Test ${i + 1}: input=${JSON.stringify(test.input)} expected output=${JSON.stringify(test.expected)}`).join('\\n') : '';
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: system }] },
      contents: [{ role: 'user', parts: [{ text: String(body.question).slice(0, 12000) + testText }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 4096 },
    }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `Gemini request failed (HTTP ${response.status}). Check the API key, model, and quota.`);
  const answer = data?.candidates?.[0]?.content?.parts?.map(part => part.text || '').join('\n') || '';
  if (!answer.trim()) throw new Error('Gemini returned an empty response. Check model availability and API quota.');
  return { answer: extractCode(answer), provider: 'gemini', model };
}

async function compatibleGenerate(provider, body, env) {
  const config = COMPATIBLE_PROVIDERS[provider];
  if (!config) throw new Error('Unsupported AI provider. Choose Gemini, OpenRouter, Groq, OpenAI, or DeepSeek.');
  const key = env[config.key];
  if (!key) throw new Error(`${config.label} is not configured. Add ${config.key} as a Cloudflare Worker secret.`);
  const model = env[config.model] || config.fallbackModel;
  const tests = Array.isArray(body.tests) ? body.tests.slice(0, 5) : [];
  const system = `You are ZAIN, a careful coding assistant. Write correct ${body.language} code for the user's task. ${body.answerOnly ? 'Return only code without Markdown fences or commentary.' : 'Explain key decisions briefly, then show code.'} Do not claim code was executed unless verification reports execution.`;
  const testText = tests.length ? '\\nSample tests (stdin => expected stdout):\\n' + tests.map((test, i) => `Test ${i + 1}: input=${JSON.stringify(test.input)} expected=${JSON.stringify(test.expected)}`).join('\\n') : '';
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` };
  if (provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://github.com/nplusplayofficial-cmyk/zain-code-ai';
    headers['X-Title'] = 'ZAIN Code AI';
  }
  const response = await fetch(config.url, {
    method: 'POST', headers,
    body: JSON.stringify({ model, messages: [{ role: 'system', content: system }, { role: 'user', content: String(body.question).slice(0, 12000) + testText }], temperature: 0.1, max_tokens: 4096 }),
    signal: AbortSignal.timeout(90000),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error?.message || `${config.label} request failed (HTTP ${response.status}). Check the key, model, and quota.`);
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) throw new Error(`${config.label} returned an empty response.`);
  return { answer: extractCode(answer), provider, model };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const url = new URL(request.url);
    if (!allowedOrigin(origin, env)) return json({ error: 'Origin not allowed by CORS.' }, 403, '', env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: {
      'Access-Control-Allow-Origin': origin || '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Max-Age': '86400',
      'Vary': 'Origin',
    }});
    if (request.method === 'GET' && (url.pathname === '/' || url.pathname === '/api/health' || url.pathname === '/healthz')) {
      const provider = env.AI_PROVIDER || 'gemini';
      return json({ status: 'ok', service: 'ZAIN Code AI API', defaultProvider: provider, model: env.GEMINI_MODEL || 'gemini-2.5-flash', ollamaAvailable: false, providers: {
        ollama: false,
        gemini: Boolean(env.GEMINI_API_KEY),
        openrouter: Boolean(env.OPENROUTER_API_KEY),
        groq: Boolean(env.GROQ_API_KEY),
        openai: Boolean(env.OPENAI_API_KEY),
        deepseek: Boolean(env.DEEPSEEK_API_KEY),
      } }, 200, origin, env);
    }
    if (request.method !== 'POST' || url.pathname !== '/api/generate') return json({ error: 'Not found.' }, 404, origin, env);
    let body;
    try { body = await request.json(); } catch { return json({ error: 'Request body must be valid JSON.' }, 400, origin, env); }
    const question = String(body?.question || '').trim();
    if (!question) return json({ error: 'Please describe the coding task first.' }, 400, origin, env);
    if (question.length > 12000) return json({ error: 'Task is too long. Keep it under 12,000 characters.' }, 413, origin, env);
    body.language = ALLOWED_LANGUAGES.has(String(body.language)) ? String(body.language) : 'Python';
    body.answerOnly = body.answerOnly !== false;
    const provider = String(body.provider || env.AI_PROVIDER || 'gemini').toLowerCase();
    try {
      const result = provider === 'gemini' ? await geminiGenerate({ ...body, question }, env) : await compatibleGenerate(provider, { ...body, question }, env);
      return json({ ...result, verification: { syntaxValid: null, validatorAvailable: false, testsRun: 0, testsPassed: 0, tests: [], note: 'Generated code has not been executed by the hosted Worker. Review and test it before use.' } }, 200, origin, env);
    } catch (error) {
      const message = String(error?.message || 'AI request failed.').slice(0, 1000);
      const status = /not configured/i.test(message) ? 503 : 502;
      return json({ error: message }, status, origin, env);
    }
  },
};
