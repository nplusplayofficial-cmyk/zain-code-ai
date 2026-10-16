require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('node:path');

const app = express();
const PORT = Number(process.env.PORT || 3001);
const OLLAMA_BASE_URL = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder:7b';
const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'meta-llama/llama-3.3-70b-instruct:free';
const GROQ_MODEL = process.env.GROQ_MODEL || 'qwen/qwen3-32b';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat';
const FRONTEND_ORIGINS = (process.env.FRONTEND_ORIGIN || 'http://127.0.0.1:5173,http://localhost:5173').split(',').map(s => s.trim()).filter(Boolean);
function isAllowedOrigin(origin) {
  if (!origin || FRONTEND_ORIGINS.includes(origin)) return true;
  try {
    const host = new URL(origin).hostname;
    return host.endsWith('.replit.dev') || host.endsWith('.replit.app');
  } catch { return false; }
}

app.use(cors({ origin(origin, callback) { if (isAllowedOrigin(origin)) return callback(null, true); return callback(new Error('Origin not allowed by CORS')); } }));
app.use(express.json({ limit: '1mb' }));

function normalizeLanguage(value) {
  const allowed = ['Python','JavaScript','TypeScript','C','C++','Java','SQL','Go','Rust'];
  const language = String(value || 'Python');
  return allowed.includes(language) ? language : 'Python';
}
function extractCode(text) {
  const source = String(text || '').trim();
  const fenced = source.match(/\x60\x60\x60(?:[\w+-]+)?\s*\n([\s\S]*?)\n\x60\x60\x60/);
  return (fenced ? fenced[1] : source).trim();
}
function parseJsonResponse(text) {
  const source = String(text || '').trim().replace(/^\x60\x60\x60json\s*/i, '').replace(/\x60\x60\x60$/,'');
  try { return JSON.parse(source); } catch { return null; }
}
async function requestJson(url, options = {}, timeoutMs = 60000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { ...options, signal: controller.signal });
    const text = await res.text();
    let data; try { data = JSON.parse(text); } catch { data = { error: { message: text.slice(0, 800) } }; }
    if (!res.ok) throw new Error(data?.error?.message || data?.message || `HTTP ${res.status}`);
    return data;
  } finally { clearTimeout(timer); }
}
async function generateWithOllama({ question, language, answerOnly, tests }) {
  const system = `You are ZAIN, a careful coding assistant. Write correct ${language} code for the user task. ${answerOnly ? 'Return only code without markdown fences or commentary.' : 'Explain key decisions briefly, then show code.'} If tests are provided, reason against them. Never claim code was executed unless the verification API reports execution.`;
  const testText = tests.length ? '\nSample test cases (stdin => expected stdout):\n' + tests.map((t,i) => `Test ${i+1}: input=${JSON.stringify(t.input)} expected=${JSON.stringify(t.expected)}`).join('\n') : '';
  const data = await requestJson(OLLAMA_BASE_URL + '/api/chat', {
    method: 'POST', headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ model: OLLAMA_MODEL, stream: false, keep_alive: '10m', messages: [{role:'system',content:system},{role:'user',content:question + testText}], options:{temperature:0.1,num_predict:1200} })
  }, 600000);
  return { answer: extractCode(data?.message?.content || ''), provider:'ollama', model:OLLAMA_MODEL };
}
async function generateWithGemini({ question, language, answerOnly, tests }) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error('Gemini key not configured. Add GEMINI_API_KEY in backend .env, or select Local Qwen.');
  const system = `You are ZAIN, a careful coding assistant. Write correct ${language} code for the user's task. ${answerOnly ? 'Return only code, no Markdown fences and no explanation.' : 'Give a concise explanation then code.'}`;
  const testText = tests.length ? '\nTests to account for:\n' + tests.map((t,i) => `Test ${i+1}: stdin ${JSON.stringify(t.input)}; expected stdout ${JSON.stringify(t.expected)}`).join('\n') : '';
  const data = await requestJson(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(GEMINI_MODEL)}:generateContent?key=${encodeURIComponent(key)}`, {
    method:'POST', headers:{'Content-Type':'application/json'},
    body:JSON.stringify({systemInstruction:{parts:[{text:system}]},contents:[{role:'user',parts:[{text:question+testText}]}],generationConfig:{temperature:0.1,maxOutputTokens:4096}})
  }, 90000);
  const answer = data?.candidates?.[0]?.content?.parts?.map(p=>p.text || '').join('\n') || '';
  if (!answer) throw new Error('Gemini returned an empty response. Check model availability and API quota.');
  return { answer:extractCode(answer), provider:'gemini', model:GEMINI_MODEL };
}
async function generateWithCompatibleProvider(provider, { question, language, answerOnly, tests }) {
  const config = {
    openrouter: { key: process.env.OPENROUTER_API_KEY, model: OPENROUTER_MODEL, url: 'https://openrouter.ai/api/v1/chat/completions', label: 'OpenRouter' },
    groq: { key: process.env.GROQ_API_KEY, model: GROQ_MODEL, url: 'https://api.groq.com/openai/v1/chat/completions', label: 'Groq' },
    openai: { key: process.env.OPENAI_API_KEY, model: OPENAI_MODEL, url: 'https://api.openai.com/v1/chat/completions', label: 'OpenAI' },
    deepseek: { key: process.env.DEEPSEEK_API_KEY, model: DEEPSEEK_MODEL, url: 'https://api.deepseek.com/chat/completions', label: 'DeepSeek' }
  }[provider];
  if (!config) throw new Error('Unsupported AI provider.');
  if (!config.key) throw new Error(`${config.label} is not configured. Add its API key in Replit Secrets; never paste keys into chat or source code.`);
  const system = `You are ZAIN, a careful coding assistant. Write correct ${language} code for the user's task. ${answerOnly ? 'Return only code without Markdown fences or commentary.' : 'Explain key decisions briefly, then show code.'} Do not claim code was executed unless verification reports execution.`;
  const testText = tests.length ? '\nSample tests (stdin => expected stdout):\n' + tests.map((t,i) => `Test ${i+1}: input=${JSON.stringify(t.input)} expected=${JSON.stringify(t.expected)}`).join('\n') : '';
  const headers = { 'Content-Type':'application/json', Authorization: `Bearer ${config.key}` };
  if (provider === 'openrouter') { headers['HTTP-Referer'] = process.env.APP_PUBLIC_URL || 'https://github.com/nplusplayofficial-cmyk/zain-code-ai'; headers['X-Title'] = 'ZAIN Code AI'; }
  const data = await requestJson(config.url, { method:'POST', headers, body:JSON.stringify({ model:config.model, messages:[{role:'system',content:system},{role:'user',content:question+testText}], temperature:0.1, max_tokens:4096 }) }, 90000);
  const answer = data?.choices?.[0]?.message?.content;
  if (!answer) throw new Error(`${config.label} returned an empty response. Check model availability, API key, and quota.`);
  return { answer:extractCode(answer), provider, model:config.model };
}
async function verifyPython(answer, tests) {
  const verification = { syntaxValid:null, validatorAvailable:false, testsRun:0, testsPassed:0, tests:[] };
  const python = process.env.PYTHON_EXECUTABLE || (process.platform === 'win32' ? 'python' : 'python3');
  const { spawn } = require('node:child_process');
  const run = (args, input, timeout=6000) => new Promise(resolve => {
    const child = spawn(python, args, { stdio:['pipe','pipe','pipe'], windowsHide:true });
    let stdout='', stderr='', done=false;
    const finish = result => { if(done) return; done=true; clearTimeout(timer); resolve(result); };
    const timer = setTimeout(() => { child.kill(); finish({ok:false,stdout,stderr:'Execution timed out'}); }, timeout);
    child.stdout.on('data', d => { stdout += d.toString(); if(stdout.length>64000) child.kill(); });
    child.stderr.on('data', d => { stderr += d.toString(); if(stderr.length>64000) child.kill(); });
    child.on('error', err => finish({ok:false,stdout,stderr:err.message}));
    child.on('close', code => finish({ok:code===0,code,stdout,stderr}));
    if(input !== undefined) child.stdin.end(input); else child.stdin.end();
  });
  const syntax = await run(['-c','import ast,sys; ast.parse(sys.stdin.read())'], answer, 5000);
  verification.syntaxValid = syntax.ok; verification.validatorAvailable = !syntax.stderr.toLowerCase().includes('not found') && !syntax.stderr.toLowerCase().includes('enoent');
  if (tests.length) {
    if (!syntax.ok) {
      verification.tests = tests.map(t => ({ input:t.input, expected:t.expected, actual:'', passed:false, error:'Python syntax validation failed.' }));
      verification.testsRun=tests.length; verification.testsPassed=0; return verification;
    }
    for (const t of tests.slice(0,5)) {
      const runResult = await run(['-c',answer], t.input, 5000);
      const actual = runResult.stdout.replace(/\r\n/g,'\n').trim();
      const expected = String(t.expected).replace(/\r\n/g,'\n').trim();
      verification.tests.push({ input:t.input, expected, actual, passed:runResult.ok && actual===expected, error:runResult.ok ? undefined : runResult.stderr.slice(0,600) });
    }
    verification.testsRun=verification.tests.length; verification.testsPassed=verification.tests.filter(t=>t.passed).length;
  }
  return verification;
}
app.get('/api/health', async (_req,res) => {
  let ollamaAvailable=false;
  try { const data=await requestJson(OLLAMA_BASE_URL+'/api/tags',{},2500); ollamaAvailable=Array.isArray(data.models); } catch {}
  res.json({status:'ok',service:'ZAIN Code AI',defaultProvider:process.env.AI_PROVIDER||'ollama',model:OLLAMA_MODEL,ollamaAvailable,providers:{ollama:ollamaAvailable,gemini:Boolean(process.env.GEMINI_API_KEY),openrouter:Boolean(process.env.OPENROUTER_API_KEY),groq:Boolean(process.env.GROQ_API_KEY),openai:Boolean(process.env.OPENAI_API_KEY),deepseek:Boolean(process.env.DEEPSEEK_API_KEY)},pythonConfigured:true});
});
app.post('/api/generate', async (req,res) => {
  const question=String(req.body?.question||'').trim();
  if(!question) return res.status(400).json({error:'Please enter a coding task.'});
  if(question.length>20000) return res.status(413).json({error:'Prompt is too long (20,000 character maximum).'});
  const language=normalizeLanguage(req.body?.language);
  const answerOnly=req.body?.answerOnly!==false;
  const provider=String(req.body?.provider||process.env.AI_PROVIDER||'ollama').toLowerCase();
  const tests=Array.isArray(req.body?.tests)?req.body.tests.slice(0,5).map(t=>({input:String(t?.input??''),expected:String(t?.expected??'')})):[];
  try {
    const generated=provider==='gemini'?await generateWithGemini({question,language,answerOnly,tests}):provider==='ollama'?await generateWithOllama({question,language,answerOnly,tests}):['openrouter','groq','openai','deepseek'].includes(provider)?await generateWithCompatibleProvider(provider,{question,language,answerOnly,tests}):null;
    if(!generated) return res.status(400).json({error:'Unknown provider. Choose ollama, gemini, openrouter, groq, openai, or deepseek.'});
    let verification={syntaxValid:null,validatorAvailable:false,testsRun:0,testsPassed:0,tests:[]};
    if(language==='Python') verification=await verifyPython(generated.answer,tests);
    res.json({answer:generated.answer,provider:generated.provider,model:generated.model,verification});
  } catch(e) {
    const message=String(e?.message||'Generation failed');
    const hint=message.includes('fetch failed')||message.includes('ECONNREFUSED')?'Cannot connect to selected AI provider. Make sure Ollama is running, or check Gemini key/network.':message;
    res.status(502).json({error:hint});
  }
});
const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));
app.get('*', (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'), error => {
    if (error && !res.headersSent) res.status(404).send('ZAIN frontend build not found. Run npm run build first.');
  });
});

app.listen(PORT,'0.0.0.0',()=>console.log(`ZAIN server listening on port ${PORT}`));
