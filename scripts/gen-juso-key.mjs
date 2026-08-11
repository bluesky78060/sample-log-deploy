#!/usr/bin/env node
/**
 * gen-juso-key.mjs — 빌드 시 JUSO(도로명주소) API confmKey를 메인 프로세스용 런타임 파일로 주입 (SAMPL-1-110)
 *
 * 키 출처(우선순위):
 *   1) process.env.JUSO_API_KEY      (CI: GitHub Secrets, 또는 셸 export)
 *   2) 로컬 .env / ../.env 의 JUSO_API_KEY=...   (dev 편의)
 *   3) 없으면 빈 문자열 (JUSO 검색 비활성)
 *
 * 출력: dist/juso-key.txt  (dist/ 는 .gitignore — 절대 커밋되지 않음)
 *   메인 프로세스(getJusoKey)가 __dirname(=dist) 또는 process.resourcesPath 에서 읽는다.
 *
 * gen-vworld-key.mjs 와 동일 패턴 — 키가 렌더러 번들/소스에 들어가지 않게 하는 핵심 장치.
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
      if (key !== 'JUSO_API_KEY') continue;
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
  if (process.env.JUSO_API_KEY) return process.env.JUSO_API_KEY.trim();
  for (const p of [join(projectRoot, '.env'), join(projectRoot, '..', '.env')]) {
    const v = readKeyFromEnvFile(p);
    if (v) return v;
  }
  return '';
}

const key = resolveKey();
const distDir = join(projectRoot, 'dist');
if (!existsSync(distDir)) mkdirSync(distDir, { recursive: true });
const outPath = join(distDir, 'juso-key.txt');
writeFileSync(outPath, key, 'utf8');

if (key) {
  console.log(`[gen-juso-key] JUSO 키 주입 완료 → dist/juso-key.txt (길이 ${key.length})`);
} else {
  console.warn('[gen-juso-key] ⚠️ JUSO_API_KEY 미설정 — 빈 키로 생성(주소검색 비활성). CI는 secrets, dev는 .env 설정 필요.');
}
