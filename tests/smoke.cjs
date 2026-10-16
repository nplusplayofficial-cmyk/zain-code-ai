const { spawn } = require('node:child_process');
const assert = require('node:assert/strict');

const port = 4317;
const server = spawn(process.execPath, ['server.cjs'], {
  env: { ...process.env, PORT: String(port), AI_PROVIDER: 'openrouter' },
  stdio: ['ignore', 'pipe', 'pipe']
});
let logs = '';
server.stdout.on('data', chunk => { logs += chunk.toString(); });
server.stderr.on('data', chunk => { logs += chunk.toString(); });

async function request(path, options) {
  return fetch(`http://127.0.0.1:${port}${path}`, options);
}
async function waitForHealth() {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    if (server.exitCode !== null) throw new Error(`Backend exited early. ${logs}`);
    try {
      const response = await request('/api/health');
      if (response.ok) return response.json();
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 200));
  }
  throw new Error(`Backend did not start. ${logs}`);
}
(async () => {
  try {
    const health = await waitForHealth();
    assert.equal(health.status, 'ok');
    assert.equal(health.service, 'ZAIN Code AI');

    const empty = await request('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: '   ', provider: 'openrouter' })
    });
    assert.equal(empty.status, 400);
    assert.match((await empty.json()).error, /enter a coding task/i);

    const unknown = await request('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'hello', provider: 'unknown-provider' })
    });
    assert.equal(unknown.status, 400);
    assert.match((await unknown.json()).error, /unknown provider/i);

    const missingKey = await request('/api/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'print hello', provider: 'openrouter' })
    });
    assert.equal(missingKey.status, 502);
    assert.match((await missingKey.json()).error, /not configured/i);

    console.log('ZAIN backend smoke tests passed.');
  } finally {
    server.kill();
  }
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
