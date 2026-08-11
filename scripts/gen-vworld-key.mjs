#!/usr/bin/env node
/**
 * gen-vworld-key.mjs — 빌드 시 VWORLD API 키를 메인 프로세스용 런타임 파일로 주입 (SAMPL-2-19)
 *
 * 키 출처(우선순위):
 *   1) process.env.VWORLD_API_KEY      (CI: GitHub Secrets, 또는 셸 export)
 *   2) 로컬 .env / ../.env 의 VWORLD_API_KEY=...   (dev 편의)
 *   3) 없으면 빈 문자열 (geocode 비활성 — 주소검증 스킵)
 *
 * 출력: dist/vworld-key.txt  (dist/ 는 .gitignore — 절대 커밋되지 않음)
 *   메인 프로세스(getVworldKey)가 __dirname(=dist) 또는 process.resourcesPath 에서 읽는다.
 *
 * 이 파일은 렌더러 번들/소스에 키가 들어가지 않게 하기 위한 핵심 장치다.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

/** .env 형식 파일에서 단일 키 값을 파싱 (주석/따옴표/공백 처리) */
function readKeyFromEnvFile(path) {
  try {
    if (!existsSync(path)) return '';
    for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (key !== 'VWORLD_API_KEY') continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      return val.trim();
    }
  } catch {
    /* ignore */
  }
  return '';
}

function resolveKey() {
  if (process.env.VWORLD_API_KEY) return process.env.VWORLD_API_KEY.trim();
  // dev 편의: 프로젝트 루트 .env → 상위 디렉토리 .env 순으로 탐색
  for (const p of [join(projectRoot, '.env'), join(projectRoot, '..', '.env')]) {
    const v = readKeyFromEnvFile(p);
    if (v) return v;
  }
  return '';
}

const key = resolveKey();
const distDir = join(projectRoot, 'dist');
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
const outPath = join(distDir, 'vworld-key.txt');
writeFileSync(outPath, key, 'utf8');

if (key) {
  console.log(`[gen-vworld-key] VWORLD 키 주입 완료 → dist/vworld-key.txt (길이 ${key.length})`);
} else {
  console.warn('[gen-vworld-key] ⚠️ VWORLD_API_KEY 미설정 — 빈 키로 생성(지번 검증 비활성). CI는 secrets, dev는 .env 설정 필요.');
}
