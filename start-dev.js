const { spawn } = require('node:child_process');
const http = require('node:http');
const path = require('node:path');

const rootDir = __dirname;

function run(name, cwd, command) {
  const child = spawn(command, {
    cwd,
    stdio: ['inherit', 'pipe', 'pipe'],
    shell: true,
    windowsHide: false,
  });

  const prefix = `[${name}] `;

  child.stdout.on('data', (chunk) => {
    process.stdout.write(prefix + chunk.toString());
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(prefix + chunk.toString());
  });

  child.on('error', (error) => {
    process.stderr.write(`${prefix}Failed to start: ${error.message}\n`);
  });

  return child;
}

let shuttingDown = false;
const children = [];

function waitForBackend(url, timeoutMs = 60000) {
  const startedAt = Date.now();

  return new Promise((resolve, reject) => {
    const retry = () => {
      if (Date.now() - startedAt >= timeoutMs) {
        reject(new Error(`Backend did not become ready at ${url}`));
        return;
      }
      setTimeout(check, 1000);
    };

    const check = () => {
      const req = http.get(url, (res) => {
        res.resume();
        if (res.statusCode && res.statusCode < 500) {
          resolve();
          return;
        }
        retry();
      });

      req.on('error', retry);
      req.setTimeout(2000, () => {
        req.destroy();
        retry();
      });
    };

    check();
  });
}

process.stdout.write('[start] Starting backend first...\n');

const backend = run('backend', path.join(rootDir, 'backend'), 'npm run start:dev');
children.push(backend);

waitForBackend('http://127.0.0.1:5000/api/db-status')
  .then(() => {
    if (shuttingDown) return;
    process.stdout.write('[start] Backend is ready. Starting frontend...\n');
    const frontend = run('frontend', path.join(rootDir, 'frontend'), 'npm run dev');
    children.push(frontend);

    frontend.on('exit', (code) => {
      if (!shuttingDown && code && code !== 0) {
        process.stderr.write(`[frontend] exited with code ${code}.\n`);
        shutdown('frontend-exit', code);
      }
    });
  })
  .catch((error) => {
    process.stderr.write(`[start] ${error.message}\n`);
    shutdown('backend-timeout', 1);
  });

function shutdown(signal, exitCode = 0) {
  if (shuttingDown) {
    return;
  }
  shuttingDown = true;

  process.stdout.write(`\nStopping services (${signal})...\n`);

  for (const child of children) {
    if (child && !child.killed) {
      child.kill('SIGTERM');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (child && !child.killed) {
        child.kill('SIGKILL');
      }
    }
    process.exit(exitCode);
  }, 3000);
}

process.on('SIGINT', () => shutdown('SIGINT', 0));
process.on('SIGTERM', () => shutdown('SIGTERM', 0));

backend.on('exit', (code) => {
  if (!shuttingDown && code && code !== 0) {
    process.stderr.write(`[backend] exited with code ${code}.\n`);
    shutdown('backend-exit', code);
  }
});

