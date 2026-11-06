/**
 * Renders the HIIT interval countdown ("5", "4", "3", "2", "1") to voice clips
 * in public/audio/countdown/, using the Gemini TTS model.
 *
 * Run once:  npm run gen:countdown-voice
 *
 * HiitSessionView picks these up automatically when they exist (see
 * src/hooks/use-countdown-voice.ts) and falls back to the browser's built-in
 * speech voice when they don't — so this step is optional.
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const API_KEY = process.env.GOOGLE_GENAI_API_KEY;
const MODEL = 'gemini-2.5-flash-preview-tts';
const VOICE = process.env.COUNTDOWN_VOICE_NAME || 'Kore';
const OUT_DIR = join(process.cwd(), 'public', 'audio', 'countdown');

// Gemini TTS returns raw little-endian 16-bit mono PCM at 24kHz.
const SAMPLE_RATE = 24000;
const BITS_PER_SAMPLE = 16;
const CHANNELS = 1;

/** Wraps raw PCM in a RIFF/WAVE header so the browser can decode it. */
const toWav = (pcm) => {
  const byteRate = (SAMPLE_RATE * CHANNELS * BITS_PER_SAMPLE) / 8;
  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16); // fmt chunk size
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(CHANNELS, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE((CHANNELS * BITS_PER_SAMPLE) / 8, 32); // block align
  header.writeUInt16LE(BITS_PER_SAMPLE, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
};

const speak = async (text) => {
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': API_KEY },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ['AUDIO'],
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: VOICE } } },
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`${MODEL} returned ${res.status}: ${await res.text()}`);

  const body = await res.json();
  const data = body.candidates?.[0]?.content?.parts?.find((p) => p.inlineData)?.inlineData?.data;
  if (!data) throw new Error(`No audio in response: ${JSON.stringify(body).slice(0, 400)}`);
  return Buffer.from(data, 'base64');
};

const main = async () => {
  if (!API_KEY) {
    console.error('GOOGLE_GENAI_API_KEY is not set. Add it to .env and rerun.');
    process.exit(1);
  }

  await mkdir(OUT_DIR, { recursive: true });

  for (const n of [5, 4, 3, 2, 1]) {
    // The style prompt keeps the five clips consistent; only the number changes.
    const pcm = await speak(`Say this single number crisply and energetically, like a workout coach counting down: ${n}`);
    const file = join(OUT_DIR, `${n}.wav`);
    await writeFile(file, toWav(pcm));
    console.log(`wrote ${file} (${(pcm.length / 1024).toFixed(1)} KiB PCM)`);
  }

  console.log(`\nDone — voice "${VOICE}". Reload a HIIT session to hear it.`);
};

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
