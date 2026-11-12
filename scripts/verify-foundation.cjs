const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const net = require('node:net');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const results = [];

async function unusedPort() {
  const listener = net.createServer();
  await new Promise((resolve, reject) => {
    listener.once('error', reject);
    listener.listen(0, '127.0.0.1', resolve);
  });
  const port = listener.address().port;
  await new Promise((resolve) => listener.close(resolve));
  return port;
}

async function withServer(secret, verify) {
  const port = await unusedPort();
  const server = spawn(process.execPath, [
    path.join(root, 'node_modules/next/dist/bin/next'), 'start', '-H', '127.0.0.1', '-p', String(port),
  ], {
    cwd: root,
    windowsHide: true,
    // Never exercise an authorized job or provide database write credentials.
    env: { ...process.env, CRON_SECRET: secret, SUPABASE_SERVICE_ROLE_KEY: '', NEXT_TELEMETRY_DISABLED: '1' },
    stdio: ['ignore', 'ignore', 'pipe'],
  });
  const stopped = new Promise((resolve) => server.once('exit', resolve));
  let launchError;
  server.once('error', (error) => { launchError = error; });
  server.stderr.on('data', () => {});
  const base = 'http://127.0.0.1:' + port;
  const request = (route, options = {}) => fetch(base + route, {
    ...options, redirect: 'manual', signal: AbortSignal.timeout(4000),
  });

  try {
    let ready = false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
      if (launchError) throw launchError;
      if (server.exitCode !== null) throw new Error('Verification server exited before readiness');
      try {
        const response = await request('/sw.js');
        if (response.status === 200 || response.status === 307) { ready = true; break; }
      } catch {}
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
    assert.ok(ready, 'Production server must become ready');
    await verify(request);
  } finally {
    if (server.exitCode === null) server.kill();
    const stoppedCleanly = await Promise.race([
      stopped.then(() => true),
      new Promise((resolve) => setTimeout(() => resolve(false), 5000)),
    ]);
    assert.ok(stoppedCleanly, 'Verification server must stop');
  }
}

(async () => {
  await withServer('', async (request) => {
    for (const [route, type, validate] of [
      ['/manifest.webmanifest', /manifest|json/, (body) => assert.ok(JSON.parse(body).icons.length)],
      ['/sw.js', /javascript/, (body) => assert.ok(body.includes('addEventListener'))],
      ['/offline.html', /html/, (body) => assert.match(body, /<!doctype html/i)],
    ]) {
      for (const method of ['GET', 'HEAD']) {
        const response = await request(route, { method });
        assert.equal(response.status, 200, route + ' must be public');
        assert.equal(response.headers.get('location'), null);
        assert.match(response.headers.get('content-type') || '', type);
        if (method === 'GET') validate(await response.text());
        results.push({ check: method + ' ' + route, status: 'passed' });
      }
    }

    for (const route of ['/transacciones', '/admin', '/sw.js/private']) {
      const response = await request(route);
      assert.equal(response.status, 307);
      assert.equal(new URL(response.headers.get('location'), 'http://localhost').pathname, '/login');
      results.push({ check: 'Unauthenticated protection: ' + route, status: 'passed' });
    }

    for (const route of ['/api/gmail/sync', '/api/cron/rollover']) {
      for (const headers of [{}, { authorization: 'Bearer undefined' }]) {
        const response = await request(route, { headers });
        assert.equal(response.status, 500, 'Missing configuration must fail before job execution');
        assert.deepEqual(await response.json(), { error: 'CRON_SECRET no configurado' });
        results.push({ check: 'Missing-secret rejection: ' + route, status: 'passed' });
      }
    }
  });

  await withServer('verification-only-synthetic-secret', async (request) => {
    for (const route of ['/api/gmail/sync', '/api/cron/rollover']) {
      for (const headers of [{}, { authorization: 'Bearer undefined' }, { authorization: 'Bearer incorrect' }]) {
        const response = await request(route, { headers });
        assert.equal(response.status, 401, 'Invalid authorization must not execute a job');
        results.push({ check: 'Invalid-authorization rejection: ' + route, status: 'passed' });
      }
    }
  });

  const output = path.join(root, 'docs/implementation/foundation-verification.json');
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, JSON.stringify({
    scope: 'Local production build; public assets and rejected requests only; no authorized jobs or data writes',
    checkedAt: new Date().toISOString(),
    serverCleanup: 'Both owned verification servers exited',
    checks: results,
  }, null, 2) + '\n');
  console.log('Passed ' + results.length + ' foundation HTTP scenarios. Evidence: docs/implementation/foundation-verification.json');
})().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
