<!-- Parent: ../AGENTS.md -->
<!-- Generated: 2026-06-26 | Updated: 2026-06-26 -->

# scripts (빌드 및 운영 스크립트)

## Purpose
릴리스 프로세스, 데이터 마이그레이션, Excel 변환 등 개발자 및 운영 작업용 Node.js 스크립트.

## Key Files
| File | Description |
|------|-------------|
| `release.js` | 릴리스 체크리스트 및 태그 생성: package.json 버전 확인 → git tag → push --tags → GitHub Actions 트리거 |
| `migrate-console-logs.js` | 프로덕션용 console.log 정리: 파일 순회 → 디버그 로그 제거 → 프로덕션 로그만 보존 |
| `convert-excel.js` | Excel 파일 변환: XLSX 읽기 → JSON 직렬화 (포맷팅, 필드명 정규화) |
| `pesticide_2025.json` | 잔류농약 샘플 데이터 (2025년) |
| `pesticide_2026.json` | 잔류농약 샘플 데이터 (2026년) |

## For AI Agents

### Working In This Directory

- **실행 환경**: Node.js (v14+)
- **npm scripts** (package.json):
  - `npm run release` → release.js 실행
  - `npm run migrate-logs` → migrate-console-logs.js 실행
  - `npm run convert-excel` → convert-excel.js 실행
- **릴리스 프로세스** (release.js):
  1. 체크리스트 5항 확인 (대화형)
  2. package.json에서 버전 읽기
  3. `git tag -a v{version}` 생성
  4. `git push origin --tags` 전송 → GitHub Actions 자동 빌드
- **Log 정리** (migrate-console-logs.js):
  - 파일 순회: `src/**/*.{js,ts}`
  - 패턴: `(console\.log|logger\.debug)` 정규식
  - 제외: 에러/경고 로그, window.logger 할당
- **콘솔 로그 기준**:
  - 제거: `console.log()`, `logger.debug()` (개발 로그)
  - 보존: `logger.warn()`, `logger.error()` (프로덕션 필요)

### Common Patterns

1. **Release.js**:
   ```javascript
   const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
   const version = packageJson.version; // "1.9.0"
   execSync(`git tag -a v${version} -m "Release v${version}"`);
   ```

2. **Migrate-console-logs.js**:
   ```javascript
   const regex = /(console\.log|logger\.debug)\s*\(/g;
   content = content.replace(regex, '/* REMOVED */');
   ```

3. **Convert-excel.js**:
   - XLSX 파일 → 첫 시트 읽기 → sheet_to_json() → JSON 저장

### Testing Requirements

- release.js: 체크리스트 대화형 입력, git 태그 생성 확인
- migrate-console-logs.js: 파일 수정 전후 비교 (테스트 디렉터리)
- convert-excel.js: 샘플 Excel → JSON 변환 결과 확인

```bash
npm run release      # 릴리스 체크리스트 실행
npm run migrate-logs # console.log 정리
npm run convert-excel # Excel 변환
```

## Dependencies
### Internal
- `package.json`: 버전 정보, npm scripts

### External
- Node.js built-in: `child_process`, `readline`, `fs`, `path`
- xlsx (optional): Excel 읽기 (convert-excel.js)

<!-- MANUAL: 이 줄 아래 수동 작성 내용은 재생성 시 보존됩니다 -->
