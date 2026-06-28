#!/usr/bin/env node
/**
 * gen-mrl-key.mjs — 빌드 시 식품안전나라(MRL) API 키를 메인 프로세스용 런타임 파일로 주입 (SAMPL-1-114)
 *
 * 키 출처(우선순위):
 *   1) process.env.FOODSAFETY_API_KEY  (CI: GitHub Secrets, 또는 셸 export)
 *   2) 로컬 .env / ../.env 의 FOODSAFETY_API_KEY=...   (dev 편의)
 *   3) 없으면 빈 문자열 (내장 키 비활성 — 사용자가 설정 페이지에서 수동 입력)
 *
 * 출력: dist/mrl-key.txt  (dist/ 는 .gitignore — 절대 커밋되지 않음)
 *   메인 프로세스(getMrlApiKey)가 __dirname(=dist) 또는 process.resourcesPath 에서 읽는다.
 *
 * VWORLD/JUSO(SAMPL-2-19)와 동일 패턴. 렌더러 번들/소스에 키가 들어가지 않게 하는 장치다.
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
      if (key !== 'FOODSAFETY_API_KEY') continue;
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
  if (process.env.FOODSAFETY_API_KEY) return process.env.FOODSAFETY_API_KEY.trim();
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
const outPath = join(distDir, 'mrl-key.txt');
writeFileSync(outPath, key, 'utf8');

if (key) {
  console.log(`[gen-mrl-key] 식품안전나라 키 주입 완료 → dist/mrl-key.txt (길이 ${key.length})`);
} else {
  console.warn('[gen-mrl-key] ⚠️ FOODSAFETY_API_KEY 미설정 — 빈 키로 생성(내장 키 비활성, 설정 페이지 수동 입력 필요). CI는 secrets, dev는 .env 설정.');
}
