import test from 'node:test';
import assert from 'node:assert/strict';
import { parseWhisperJson } from '../src/transcribe.mjs';
import { matchPhrase, wordsFromSegments, splitWords, joinWords, findFillers, wordRanges, wordsToCaptions } from '../public/transcript.js';
import { cueWords } from '../public/captions.js';

test('whisper tokens: Chinese text becomes words even without spaces (#62)', () => {
  const tok = (text, from, to) => ({ text, offsets: { from, to }, p: 0.9 });
  const r = parseWhisperJson({ result: { language: 'zh' }, transcription: [{ offsets: { from: 0, to: 4000 }, text: '今天我们来做一个游戏。',
    tokens: [tok('今天', 0, 600), tok('我们', 600, 1100), tok('来', 1100, 1400), tok('做', 1400, 1700), tok('一个', 1700, 2200), tok('游戏', 2200, 3200), tok('。', 3200, 3300)] }] });
  assert.deepEqual(r.words.map(w => w.text), ['今天', '我们', '来', '做', '一个', '游戏。']);
  assert.deepEqual(r.words.map(w => [w.start, w.end]), [[0, 0.6], [0.6, 1.1], [1.1, 1.4], [1.4, 1.7], [1.7, 2.2], [2.2, 3.3]]);
  assert.deepEqual(matchPhrase(r.words, '游戏'), [[5, 5]]);
  assert.deepEqual(matchPhrase(r.words, '做一个游戏'), [[3, 5]]);
  assert.deepEqual(findFillers(r.words, 'zh'), []);
});

test('segment-level Chinese and Japanese transcripts split into words (#62)', () => {
  const zh = wordsFromSegments([{ start: 0, end: 4, text: '今天我们来做一个游戏。' }], 'zh');
  assert.deepEqual(zh.map(w => w.text), ['今天', '我们', '来', '做', '一个', '游戏。']);
  assert.ok(zh.every(w => w.start >= 0 && w.end > w.start && w.end <= 4));
  const ja = wordsFromSegments([{ start: 0, end: 4, text: '私たちはゲームを作ります。' }], 'ja');
  assert.ok(ja.length > 4 && ja.at(-1).text.endsWith('。'));
  assert.deepEqual(matchPhrase(ja, 'ゲーム').length, 1);
  const cue = cueWords({ start: 0, end: 2.4, text: '今天我们来做一个游戏。' });
  assert.deepEqual(cue.map(w => w.text), zh.map(w => w.text).slice(0, cue.length));
});

test('word pieces join without spaces only between CJK words (#62)', () => {
  assert.equal(joinWords(['今天', '我们', 'launch', 'time']), '今天我们 launch time');
  assert.equal(joinWords(['Hi', 'there.']), 'Hi there.');
  assert.deepEqual(splitWords('今天我们来做一个游戏。'), ['今天', '我们', '来', '做', '一个', '游戏。']);
  assert.deepEqual(splitWords('Hi  there.  '), ['Hi', 'there.']);
  const cues = wordsToCaptions(wordsFromSegments([{ start: 0, end: 4, text: '今天我们来做一个游戏。' }], 'zh'), 0);
  assert.ok(cues.length >= 1 && cues.every(c => !/ /.test(c.text)));
  assert.equal(cues.map(c => c.text).join(''), '今天我们来做一个游戏。');
});

test('English and Dutch word handling is unchanged (#62)', () => {
  const en = wordsFromSegments([{ start: 0, end: 3, text: 'hello there friend' }]);
  assert.deepEqual(en.map(w => w.text), ['hello', 'there', 'friend']);
  assert.deepEqual(matchPhrase(en, 'there friend'), [[1, 2]]);
  assert.deepEqual(splitWords('hello  there'), ['hello', 'there']);
});
