const { spawn } = require('node:child_process');
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

const backend = run('backend', path.join(rootDir, 'backend'), 'npm run start:dev');
const frontend = run('frontend', path.join(rootDir, 'frontend'), 'npm run dev');

const children = [backend, frontend];

let shuttingDown = false;

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

frontend.on('exit', (code) => {
  if (!shuttingDown && code && code !== 0) {
    process.stderr.write(`[frontend] exited with code ${code}.\n`);
    shutdown('frontend-exit', code);
  }
});
