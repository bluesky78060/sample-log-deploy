#!/usr/bin/env node
/**
 * gen-psis-key.mjs — 빌드 시 농촌진흥청 PSIS(농약등록정보) API 키를 메인 프로세스용 런타임 파일로 주입 (SAMPL-1-114)
 *
 * 키 출처(우선순위):
 *   1) process.env.RDA_PSIS_API_KEY  (정식명)
 *   2) process.env.RAD_PSIS_API_KEY  (.env/secrets 의 RAD 오타 호환 — index.ts 핸들러와 동일 폴백)
 *   3) 로컬 .env / ../.env 의 RDA_PSIS_API_KEY= 또는 RAD_PSIS_API_KEY=   (dev 편의)
 *   4) 없으면 빈 문자열 (PSIS 용도조회 비활성 — no_key 반환)
 *
 * 출력: dist/psis-key.txt  (dist/ 는 .gitignore — 절대 커밋되지 않음)
 *   메인 프로세스(getPsisApiKey)가 __dirname(=dist) 또는 process.resourcesPath 에서 읽는다.
 *
 * VWORLD/JUSO/MRL과 동일 패턴. 렌더러 번들/소스에 키가 들어가지 않게 하는 장치다.
 */
import { existsSync, readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, '..');

/** .env 형식 파일에서 RDA_PSIS_API_KEY 또는 RAD_PSIS_API_KEY 값을 파싱 (주석/따옴표/공백 처리) */
function readKeyFromEnvFile(path) {
  try {
    if (!existsSync(path)) return '';
    let rad = '';
    for (const rawLine of readFileSync(path, 'utf8').split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eq = line.indexOf('=');
      if (eq === -1) continue;
      const key = line.slice(0, eq).trim();
      if (key !== 'RDA_PSIS_API_KEY' && key !== 'RAD_PSIS_API_KEY') continue;
      let val = line.slice(eq + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      val = val.trim();
      if (key === 'RDA_PSIS_API_KEY' && val) return val; // 정식명 우선
      if (key === 'RAD_PSIS_API_KEY') rad = val;
    }
    return rad;
  } catch {
    /* ignore */
  }
  return '';
}

function resolveKey() {
  if (process.env.RDA_PSIS_API_KEY) return process.env.RDA_PSIS_API_KEY.trim();
  if (process.env.RAD_PSIS_API_KEY) return process.env.RAD_PSIS_API_KEY.trim();
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
const outPath = join(distDir, 'psis-key.txt');
writeFileSync(outPath, key, 'utf8');

if (key) {
  console.log(`[gen-psis-key] PSIS 키 주입 완료 → dist/psis-key.txt (길이 ${key.length})`);
} else {
  console.warn('[gen-psis-key] ⚠️ RDA_PSIS_API_KEY/RAD_PSIS_API_KEY 미설정 — 빈 키로 생성(용도조회 비활성). CI는 secrets, dev는 .env 설정.');
}
