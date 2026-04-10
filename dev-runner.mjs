import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const pythonExe = path.join(__dirname, 'venv', 'Scripts', 'python.exe');

const services = [
  {
    name: 'chatbot',
    command: pythonExe,
    args: ['api/chat/index.py'],
    cwd: __dirname,
  },
  {
    name: 'tts-server',
    command: 'node',
    args: ['api/tts/index.js'],
    cwd: __dirname,
  },
  {
    name: 'viewer',
    command: pythonExe,
    args: ['-m', 'http.server', '8000'],
    cwd: __dirname,
  },
];

const children = [];
let shuttingDown = false;

function pipeOutput(child, serviceName) {
  child.stdout.on('data', (chunk) => {
    process.stdout.write(`[${serviceName}] ${chunk}`);
  });

  child.stderr.on('data', (chunk) => {
    process.stderr.write(`[${serviceName}] ${chunk}`);
  });
}

function shutdown(exitCode = 0) {
  if (shuttingDown) {
    return;
  }

  shuttingDown = true;
  for (const child of children) {
    if (!child.killed) {
      child.kill('SIGINT');
    }
  }

  setTimeout(() => {
    for (const child of children) {
      if (!child.killed) {
        child.kill('SIGTERM');
      }
    }
    process.exit(exitCode);
  }, 600);
}

for (const service of services) {
  const child = spawn(service.command, service.args, {
    cwd: service.cwd,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  children.push(child);
  pipeOutput(child, service.name);

  child.on('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[${service.name}] exited with code ${code ?? 'unknown'}`);
      shutdown(code ?? 1);
    }
  });
}

process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));

console.log('All services are starting...');
console.log('Viewer: http://127.0.0.1:8000');
console.log('Chat API: http://127.0.0.1:8001/health');
console.log('TTS Server: http://127.0.0.1:8002/health');
