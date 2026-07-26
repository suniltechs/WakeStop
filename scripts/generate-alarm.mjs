import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const sampleRate = 44_100;
const durationSeconds = 29;
const totalSamples = sampleRate * durationSeconds;
const dataSize = totalSamples * 2;
const wav = Buffer.alloc(44 + dataSize);

wav.write('RIFF', 0);
wav.writeUInt32LE(36 + dataSize, 4);
wav.write('WAVE', 8);
wav.write('fmt ', 12);
wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20);
wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(sampleRate, 24);
wav.writeUInt32LE(sampleRate * 2, 28);
wav.writeUInt16LE(2, 32);
wav.writeUInt16LE(16, 34);
wav.write('data', 36);
wav.writeUInt32LE(dataSize, 40);

for (let sample = 0; sample < totalSamples; sample += 1) {
  const time = sample / sampleRate;
  const cycle = time % 1.25;
  const active = cycle < 0.46 || (cycle > 0.58 && cycle < 1.04);
  let value = 0;

  if (active) {
    const beepTime = cycle < 0.46 ? cycle : cycle - 0.58;
    const frequency = cycle < 0.46 ? 880 : 660;
    const fade = Math.min(1, beepTime / 0.015, (0.46 - beepTime) / 0.02);
    const fundamental = Math.sin(2 * Math.PI * frequency * time);
    const harmonic = 0.2 * Math.sin(2 * Math.PI * frequency * 2 * time);
    value = Math.max(-1, Math.min(1, (fundamental + harmonic) * 0.72 * fade));
  }

  wav.writeInt16LE(Math.round(value * 32_767), 44 + sample * 2);
}

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const outputPath = resolve(scriptDirectory, '..', 'assets', 'alarm.wav');
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, wav);
process.stdout.write(`Generated ${outputPath} (${wav.length} bytes)\n`);
