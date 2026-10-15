import { useEffect, useMemo, useState } from 'react';
import { Activity, ArrowUp, Check, CheckCircle2, ChevronDown, Code2, Copy, Cpu, ExternalLink, FileCode2, LoaderCircle, Menu, MessageSquare, Moon, PanelLeftClose, Plus, RotateCcw, Settings2, ShieldCheck, Sparkles, Terminal, Trash2, Zap } from 'lucide-react';

const starterPrompt = 'Write a Python program that reads two integers and prints their sum.';
const starterTests = [{ input: '5\n3\n', expected: '8' }];

function makeId() { return globalThis.crypto?.randomUUID?.() ?? String(Date.now() + Math.random()); }
function App() {
  const [provider, setProvider] = useState('ollama');
  const [language, setLanguage] = useState('Python');
  const [prompt, setPrompt] = useState('');
  const [testInput, setTestInput] = useState('');
  const [expected, setExpected] = useState('');
  const [answerOnly, setAnswerOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [health, setHealth] = useState({ status: 'checking' });
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showTests, setShowTests] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch('/api/health').then(r => r.json()).then(setHealth).catch(() => setHealth({ status: 'offline' }));
  }, []);

  const tests = useMemo(() => {
    if (!testInput.trim() && !expected.trim()) return [];
    return [{ input: testInput, expected }];
  }, [testInput, expected]);

  async function generate(e) {
    e?.preventDefault();
    if (!prompt.trim() || loading) return;
    setLoading(true); setError('');
    try {
      const response = await fetch('/api/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: prompt.trim(), language, answerOnly, tests, provider })
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'Generation failed. Check the backend terminal.');
      const item = { id: makeId(), prompt: prompt.trim(), language, answer: payload.answer, verification: payload.verification, provider: payload.provider || provider, createdAt: new Date().toISOString() };
      setResult(item); setHistory(old => [item, ...old].slice(0, 30));
    } catch (err) { setError(err.message || 'Could not connect to ZAIN backend.'); }
    finally { setLoading(false); }
  }

  function newChat() { setPrompt(''); setResult(null); setError(''); setTestInput(''); setExpected(''); }
  async function copyAnswer() {
    if (!result?.answer) return;
    try { await navigator.clipboard.writeText(result.answer); setCopied(true); setTimeout(() => setCopied(false), 1500); }
    catch { setError('Clipboard access was blocked by your browser. Select the code and copy it manually.'); }
  }
  function loadExample() { setLanguage('Python'); setPrompt(starterPrompt); setTestInput(starterTests[0].input); setExpected(starterTests[0].expected); setShowTests(true); }

  return <div className="app-shell">
    <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
      <div className="brand-row"><div className="brand-mark"><Code2 size={22}/></div>{sidebarOpen && <div><div className="brand-name">ZAIN<span>.</span></div><div className="brand-sub">CODE INTELLIGENCE</div></div>}</div>
      <button className="new-chat" onClick={newChat}><Plus size={17}/>{sidebarOpen && 'New workspace'}</button>
      {sidebarOpen && <><div className="side-label">WORKSPACE</div><button className="nav-item active"><MessageSquare size={16}/>Code assistant</button><button className="nav-item" onClick={() => setShowTests(s => !s)}><CheckCircle2 size={16}/>Test verification</button>
      <div className="side-label recent-label">RECENT SESSIONS</div><div className="history-list">{history.length ? history.map(h => <button key={h.id} className="history-item" onClick={() => {setResult(h);setPrompt(h.prompt);setLanguage(h.language);}}><FileCode2 size={15}/><span>{h.prompt}</span></button>) : <div className="empty-history">Your coding sessions will appear here.</div>}</div></>}
      <div className="sidebar-bottom"><div className="privacy-card"><ShieldCheck size={17}/>{sidebarOpen && <div><strong>Private by default</strong><span>Local model stays on your device.</span></div>}</div><button className="nav-item" onClick={() => setSidebarOpen(s => !s)}>{sidebarOpen ? <PanelLeftClose size={16}/> : <Menu size={16}/ >}{sidebarOpen && 'Collapse sidebar'}</button></div>
    </aside>

    <main className="main-area">
      <header className="topbar"><div className="breadcrumb"><span>Workspace</span><span className="crumb-slash">/</span><strong>Code Assistant</strong></div><div className="top-actions"><div className={`status-pill ${health.status === 'ok' ? 'is-online' : ''}`}><span className="status-dot"/>{health.status === 'ok' ? 'Backend connected' : health.status === 'checking' ? 'Connecting…' : 'Backend offline'}</div><button className="icon-button" title="Toggle sidebar" onClick={() => setSidebarOpen(s => !s)}><Settings2 size={18}/></button></div></header>
      <div className="content-wrap">
        {!result && <section className="hero"><div className="hero-eyebrow"><span className="eyebrow-line"/><Sparkles size={14}/> YOUR PERSONAL CODING PARTNER</div><h1>Build with clarity.<br/><span>Code with ZAIN.</span></h1><p>Turn a problem into working code, then verify it with your own test cases.</p><div className="hero-stats"><div><Cpu size={16}/><span>Local-first AI</span></div><div><ShieldCheck size={16}/><span>Privacy conscious</span></div><div><Zap size={16}/><span>Test-aware coding</span></div></div></section>}
        <section className={`composer-card ${result ? 'composer-compact' : ''}`}>
          <div className="composer-head"><div><div className="composer-title">Describe your task</div><div className="composer-caption">Be clear about inputs, outputs, and constraints.</div></div><button className="text-button" onClick={loadExample}><RotateCcw size={14}/>Load example</button></div>
          <form onSubmit={generate}>
            <textarea value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Describe the problem you want to solve..." rows={result ? 3 : 4} />
            <div className="control-row"><label className="select-control"><span>LANGUAGE</span><select value={language} onChange={e => setLanguage(e.target.value)}>{['Python','JavaScript','TypeScript','C','C++','Java','SQL','Go','Rust'].map(l => <option key={l}>{l}</option>)}</select><ChevronDown size={15}/></label>
              <label className="select-control"><span>AI PROVIDER</span><select value={provider} onChange={e => setProvider(e.target.value)}><option value="ollama">Local Qwen (free)</option><option value="gemini">Gemini (API key)</option></select><ChevronDown size={15}/></label>
              <label className="toggle-control"><input type="checkbox" checked={answerOnly} onChange={e => setAnswerOnly(e.target.checked)}/><span>Code only</span></label>
              <button type="button" className="text-button test-toggle" onClick={() => setShowTests(s => !s)}><CheckCircle2 size={15}/>{showTests ? 'Hide tests' : 'Test cases'}</button>
              <button className="generate-button" type="submit" disabled={loading || !prompt.trim()}>{loading ? <LoaderCircle className="spin" size={16}/> : <ArrowUp size={16}/>}<span>{loading ? 'Generating…' : 'Generate'}</span></button>
            </div>
            {showTests && <div className="tests-grid"><label>Standard input<textarea rows={3} value={testInput} onChange={e => setTestInput(e.target.value)} placeholder={'5\n3'} /></label><label>Expected output<textarea rows={3} value={expected} onChange={e => setExpected(e.target.value)} placeholder="8" /></label><p className="test-note">Test runner currently executes Python only. Leave both fields empty to skip verification.</p></div>}
          </form>
        </section>
        {error && <div className="error-banner"><Activity size={17}/><span>{error}</span></div>}
        {result ? <section className="result-card"><div className="result-head"><div><div className="result-title"><span className="result-file-icon"><FileCode2 size={17}/></span>Generated solution</div><div className="result-meta">{result.language} <span>·</span> {result.provider} <span>·</span> {new Date(result.createdAt).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}</div></div><button className="copy-button" onClick={copyAnswer}>{copied ? <Check size={15}/> : <Copy size={15}/ >}{copied ? 'Copied' : 'Copy code'}</button></div><pre className="code-output"><code>{result.answer}</code></pre>
          {result.verification && <div className="verification"><div className="verification-title"><CheckCircle2 size={17}/>Verification report</div><div className="verification-stats"><span>Syntax: <b>{result.verification.syntaxValid ? 'Valid' : 'Needs review'}</b></span><span>Tests: <b>{result.verification.testsPassed ?? 0}/{result.verification.testsRun ?? 0} passed</b></span></div>{result.verification.tests?.map((t,i) => <div key={i} className={`test-result ${t.passed ? 'pass' : 'fail'}`}><span>{t.passed ? 'PASS' : 'FAIL'}</span><code>expected {t.expected} · actual {t.actual}</code></div>)}</div>}
        </section> : <section className="suggestions"><div className="suggestions-title"><Sparkles size={15}/> START WITH A TEMPLATE</div><div className="suggestion-grid"><button onClick={loadExample}><span className="suggestion-icon purple"><Code2 size={17}/></span><span><strong>Write a program</strong><small>Generate a clear solution with a test</small></span><ArrowUp size={15}/></button><button onClick={() => {setLanguage('Python');setPrompt('Explain this code, identify edge cases, and suggest improvements:\n\n');}}><span className="suggestion-icon blue"><FileCode2 size={17}/></span><span><strong>Review code</strong><small>Find issues and improve readability</small></span><ArrowUp size={15}/></button><button onClick={() => {setShowTests(true);setPrompt('Write a Python function and include edge cases. Explain the time and space complexity.');setLanguage('Python');}}><span className="suggestion-icon green"><CheckCircle2 size={17}/></span><span><strong>Test a solution</strong><small>Check expected output for sample input</small></span><ArrowUp size={15}/></button></div></section>}
        <footer className="footer"><span><ShieldCheck size={14}/> Your prompts are sent only to the provider you select.</span><a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">Gemini API key <ExternalLink size={12}/></a></footer>
      </div>
    </main>
  </div>;
}
export default App;
