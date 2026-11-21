import readline from 'node:readline/promises';
import process from 'node:process';

const interactive = Boolean(process.stdin.isTTY && process.stdout.isTTY);

export function log(message = '') {
  console.log(message);
}

export function ok(message) {
  console.log(`✓ ${message}`);
}

export function warn(message) {
  console.log(`⚠ ${message}`);
}

export function fail(message) {
  console.log(`✗ ${message}`);
}

export function createPrompter({ enabled } = {}) {
  const useReadline = enabled ?? interactive;
  const rl = useReadline
    ? readline.createInterface({ input: process.stdin, output: process.stdout })
    : null;

  return {
    async ask(label, fallback = '') {
      if (!rl) return fallback;
      const suffix = fallback ? ` [${fallback}]` : '';
      const answer = (await rl.question(`${label}${suffix}: `)).trim();
      return answer || fallback;
    },

    async select(label, choices, fallbackIndex = 0) {
      if (!rl) return choices[fallbackIndex].value;
      console.log(label);
      choices.forEach((choice, index) => {
        console.log(`  ${index + 1}) ${choice.label}`);
      });
      const raw = (await rl.question(`番号 [${fallbackIndex + 1}]: `)).trim();
      const index = raw ? Number(raw) - 1 : fallbackIndex;
      const choice = choices[index];
      if (!choice) throw new Error('無効な選択です');
      return choice.value;
    },

    close() {
      if (rl) rl.close();
    },
  };
}
