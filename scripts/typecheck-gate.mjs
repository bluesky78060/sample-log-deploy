#!/usr/bin/env node
/**
 * typecheck-gate.mjs — TypeScript 타입에러 "회귀 방지" 래칫 게이트 (SAMPL-2-18)
 *
 * 목적: 현재 코드베이스에는 다수의 기존 타입에러가 존재한다(baseline).
 *   `tsc --noEmit`를 build에 직접 넣으면 즉시 빌드가 막히므로, 대신 이 게이트는
 *   "에러 수가 baseline을 초과(=새 회귀)하면 실패"하는 래칫으로 동작한다.
 *   build/make 는 건드리지 않고 CI에서만 회귀를 차단한다.
 *
 * baseline 은 scripts/typecheck-baseline.txt 에서 읽는다.
 * 에러가 baseline 미만으로 줄면(개선) baseline 을 낮추라고 안내한다.
 *
 * 종료 코드:
 *   0 — 통과(에러 수 <= baseline)
 *   1 — 회귀(에러 수 > baseline)
 *   2 — 게이트 자체 오류(tsc 비정상 종료/출력 없음 → 거짓 통과 방지)
 */
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASELINE_FILE = join(__dirname, 'typecheck-baseline.txt');

function readBaseline() {
  try {
    const raw = readFileSync(BASELINE_FILE, 'utf8').trim();
    const n = Number.parseInt(raw, 10);
    if (Number.isNaN(n) || n < 0) throw new Error(`invalid baseline: "${raw}"`);
    return n;
  } catch (err) {
    console.error(`[typecheck-gate] baseline 파일을 읽을 수 없습니다 (${BASELINE_FILE}): ${err.message}`);
    process.exit(2);
  }
}

const baseline = readBaseline();

// tsc 실행 (프로젝트 typecheck 스크립트와 동일: tsc --noEmit)
const res = spawnSync('npx', ['tsc', '--noEmit', '--pretty', 'false'], {
  cwd: join(__dirname, '..'),
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
  shell: process.platform === 'win32',
});

if (res.error) {
  console.error(`[typecheck-gate] tsc 실행 실패: ${res.error.message}`);
  process.exit(2);
}

const output = `${res.stdout || ''}${res.stderr || ''}`;
const matches = output.match(/error TS\d+/g);
const count = matches ? matches.length : 0;

// 크래시 가드: 출력이 비어 있거나, 에러 0인데 tsc가 비정상 종료(타입에러가 아닌 설정/크래시)면
// 거짓 통과를 막기 위해 게이트 오류로 처리한다.
if (output.trim() === '') {
  console.error('[typecheck-gate] tsc 출력이 비어 있습니다 — 비정상 상태로 간주하여 실패 처리합니다.');
  process.exit(2);
}
if (count === 0 && res.status !== 0) {
  console.error(
    `[typecheck-gate] 타입에러는 0인데 tsc가 비정상 종료(code=${res.status})했습니다 — ` +
      '설정 오류/크래시 가능. 거짓 통과 방지를 위해 실패 처리합니다.'
  );
  console.error(output.split('\n').slice(0, 20).join('\n'));
  process.exit(2);
}

console.log(`[typecheck-gate] 현재 타입에러: ${count} / baseline: ${baseline}`);

if (count > baseline) {
  console.error(
    `[typecheck-gate] ❌ 회귀 감지: 새 타입에러가 ${count - baseline}개 늘었습니다 ` +
      `(${baseline} → ${count}). 추가된 에러를 해소하거나, 의도된 경우에만 baseline을 갱신하세요.`
  );
  process.exit(1);
}

if (count < baseline) {
  console.log(
    `[typecheck-gate] ✅ 개선됨(${baseline} → ${count}). ` +
      `scripts/typecheck-baseline.txt 를 ${count} 로 낮춰 래칫을 조이는 것을 권장합니다.`
  );
} else {
  console.log('[typecheck-gate] ✅ 통과 (baseline 유지).');
}
process.exit(0);
