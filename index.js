import { fileURLToPath } from 'url';
import { join, dirname } from 'path';
import { createInterface } from 'readline';
import { setupMaster, fork } from 'cluster';
import { watchFile, unwatchFile, readFileSync } from 'fs';

const rl = createInterface(process.stdin, process.stdout);
const __dirname = dirname(fileURLToPath(import.meta.url));

// Simple banner tanpa library
console.log('\n');
console.log('═══════════════════════════════════════');
console.log('     🤖 LIGHTWEIGHT WHATSAPP BOT 🤖    ');
console.log('═══════════════════════════════════════');

// Baca package.json manual
try {
  const pkg = JSON.parse(readFileSync(join(__dirname, './package.json'), 'utf-8'));
  console.log(`     📦 ${pkg.name || 'WhatsApp Bot'}`);
  console.log(`     👤 By @${pkg.author?.name || pkg.author || 'Unknown'}`);
} catch (e) {
  console.log('     📦 WhatsApp Bot');
}

console.log('═══════════════════════════════════════\n');
console.log('🐾 Starting...\n'); 

var isRunning = false;

/**
 * Start a js file
 * @param {String} file `path/to/file`
 */
function start(file) {
  if (isRunning) return;
  isRunning = true;

  let args = [join(__dirname, file), ...process.argv.slice(2)];
  console.log(`\n🚀 Running: ${args.join(' ')}\n`);

  setupMaster({ exec: args[0], args: args.slice(1) });
  let p = fork();

  p.on('message', data => {
    console.log('[✅ RECEIVED]', data);
    switch (data) {
      case 'reset':
        p.kill();
        isRunning = false;
        start(file);
        break;
      case 'uptime':
        p.send(process.uptime());
        break;
      default:
        console.warn('[⚠️ UNRECOGNIZED MESSAGE]', data);
    }
  });

  p.on('exit', (_, code) => {
    isRunning = false;
    console.error('[❗] Exited with code:', code);
    
    if (code !== 0) {
      console.log('[🔄] Restarting worker due to non-zero exit code...\n');
      return start(file);
    }

    watchFile(args[0], () => {
      unwatchFile(args[0]);
      start(file);
    });
  });

  // Simple args parser tanpa yargs
  const hasTestFlag = process.argv.includes('--test') || process.argv.includes('-t');

  if (!hasTestFlag) {
    if (!rl.listenerCount()) {
      rl.on('line', line => {
        p.emit('message', line.trim());
      });
    }
  }
}

start('bot.js');