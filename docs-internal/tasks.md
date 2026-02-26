# 시료 접수 대장 앱 개발 작업 내역

## 프로젝트 개요
- **프로젝트명**: sample-log-electron
- **GitHub**: https://github.com/bluesky78060/sample-log-electron
- **배포**:
  - 데스크톱: GitHub Releases (Windows .exe)
  - 웹: GitHub Pages (https://bluesky78060.github.io/sample-log-electron/)

---

## 시료 유형별 개발 현황

| 시료 유형 | 상태 | 비고 |
|-----------|------|------|
| 🌱 토양 | ✅ 완료 | 필지별 개별 접수, 연도별 자동 저장 |
| 💧 수질 | ✅ 완료 | 채취장소별 개별 접수, 생활용수/농업용수 검사항목 |
| 🧫 잔류농약 | ✅ 완료 | 다중 의뢰 기능, 연도별 자동 저장 |
| 🐄 퇴·액비 | ✅ 완료 | 가축분뇨퇴비 시료 접수, 연도별 자동 저장 |
| ⚠️ 중금속 | ✅ 완료 | 토양 중금속 검사, 연도별 자동 저장 |

---

## 파일 구조

```
sample-log-electron/
├── src/
│   ├── index.html           # 메인 선택 페이지
│   ├── index.js             # Electron 메인 프로세스
│   ├── preload.js           # IPC 브릿지
│   ├── style.css            # 공통 스타일
│   ├── script.js            # 공통 스크립트
│   ├── cropData.js          # 작물 데이터
│   ├── bonghwaData.js       # 지역 데이터
│   ├── soil/                # 토양 시료
│   │   ├── index.html
│   │   └── soil-script.js
│   ├── water/               # 수질 시료
│   │   ├── index.html
│   │   └── water-script.js
│   ├── pesticide/           # 잔류농약 시료
│   │   ├── index.html
│   │   └── pesticide-script.js
│   ├── compost/             # 퇴·액비 시료
│   │   ├── index.html
│   │   └── compost-script.js
│   ├── heavy-metal/         # 중금속 시료
│   │   ├── index.html
│   │   └── heavy-metal-script.js
│   └── label-print/         # 라벨 인쇄
│       ├── index.html
│       └── label-app.js
├── docs/                    # GitHub Pages 웹 버전 (src 미러)
├── .github/
│   └── workflows/
│       └── build.yml        # GitHub Actions 워크플로우
├── forge.config.js          # Electron Forge 설정
└── package.json
```

---

## 완료된 시료 유형별 상세

### 🌱 토양 시료 접수 대장 (✅ 완료)

#### 시료 접수 폼
| 필드명 | 설명 |
|--------|------|
| 접수번호 | 자동 생성 (필지별 개별) |
| 접수일자 | 날짜 선택 |
| 성명 | 민원인 성명 |
| 전화번호 | 연락처 |
| 주소 | 우편번호 + 도로명 + 상세주소 |
| 구분 | 논, 밭, 과수, 시설 |
| 목적(용도) | 일반재배, 무농약, 유기, GAP, 저탄소 |
| 필지 정보 | 필지 주소, 하위 필지, 작물명, 면적 (다중 등록) |
| 수령 방법 | 우편, 이메일, 팩스, 직접방문 |
| 비고 | 추가 메모 |

#### 테이블 컬럼
`완료 | 접수번호 | 접수일자 | 구분 | 목적 | 성명 | 우편번호 | 주소 | 필지주소 | 작물명 | 면적 | 전화번호 | 수령방법 | 비고 | 관리`

---

### 💧 수질 시료 접수 대장 (✅ 완료)

#### 시료 접수 폼
| 필드명 | 설명 |
|--------|------|
| 접수번호 | 자동 생성 (채취장소별 개별) |
| 접수일자 | 날짜 선택 |
| 성명 | 민원인 성명 |
| 전화번호 | 연락처 |
| 주소 | 우편번호 + 도로명 + 상세주소 |
| 시료명 | 지하수, 하천수, 저수지, 수돗물, 기타 |
| 채취장소 | 리+지번 (다중 입력 가능) |
| 주작목 | 채취장소별 주작목 |
| 목적 | 참고용, 민원, 기타 |
| 검사항목 | 생활용수(20항목), 농업용수(15항목) |
| 수령 방법 | 통보방법 선택 |
| 비고 | 추가 메모 |

#### 검사항목 상세
- **생활용수 (20항목)**: pH, EC, 총대장균군, 질산성질소, 염소이온, 카드뮴, 비소, 시안, 수은, 납, 6가크롬, 셀레늄, 페놀, 벤젠, 톨루엔, 에틸벤젠, 크실렌, 트리클로로에틸렌, 테트라클로로에틸렌, 1,1,1-트리클로로에탄
- **농업용수 (15항목)**: pH, EC, COD, SS, DO, 총질소, 총인, 카드뮴, 비소, 수은, 납, 크롬, 구리, 아연, 대장균군

---

### 🧫 잔류농약 시료 접수 대장 (✅ 완료)

#### 시료 접수 폼
| 필드명 | 설명 |
|--------|------|
| 접수번호 | 자동 생성 |
| 접수일자 | 날짜 선택 |
| 성명 | 민원인 성명 |
| 전화번호 | 연락처 |
| 주소 | 우편번호 + 도로명 + 상세주소 |
| 농산물명 | 검사 대상 농산물 (작물 선택) |
| 재배지 주소 | 농산물 재배지 |
| 출하 예정일 | 농산물 출하 예정일 |
| 인증 종류 | 무농약, 유기, GAP, 저탄소, 일반 |
| 수령 방법 | 우편, 이메일, 팩스, 직접방문 |
| 비고 | 추가 메모 |

#### 특수 기능
- 다중 의뢰 기능 (한 번에 여러 건 접수)

---

### 🐄 퇴·액비 시료 접수 대장 (✅ 완료)

#### 시료 접수 폼
| 필드명 | 설명 |
|--------|------|
| 접수번호 | 자동 생성 |
| 접수일자 | 날짜 선택 |
| 성명/업체명 | 생산자 또는 업체명 |
| 전화번호 | 연락처 |
| 주소 | 우편번호 + 도로명 + 상세주소 |
| 퇴비 종류 | 돈분, 우분, 계분, 혼합, 기타 |
| 생산지 주소 | 퇴비 생산 장소 |
| 생산일자 | 퇴비 생산일 |
| 검사 목적 | 품질검사, 부숙도검사, 성분분석, 기타 |
| 수령 방법 | 우편, 이메일, 팩스, 직접방문 |
| 비고 | 추가 메모 |

---

### ⚠️ 중금속 시료 접수 대장 (✅ 완료)

#### 시료 접수 폼
| 필드명 | 설명 |
|--------|------|
| 접수번호 | 자동 생성 |
| 접수일자 | 날짜 선택 |
| 성명 | 민원인 성명 |
| 전화번호 | 연락처 |
| 주소 | 우편번호 + 도로명 + 상세주소 |
| 시료 종류 | 토양, 농산물, 용수, 기타 |
| 채취 위치 | 시료 채취 장소 |
| 채취일자 | 시료 채취일 |
| 검사 항목 | 납, 카드뮴, 비소, 수은, 크롬, 구리, 아연, 니켈 (다중 선택) |
| 오염 의심 원인 | 공장, 폐기물, 농약, 자연발생, 기타 |
| 수령 방법 | 우편, 이메일, 팩스, 직접방문 |
| 비고 | 추가 메모 |

---

## 공통 기능

### 연도별 자동 저장 (✅ 완료)
- 연도 선택 드롭다운 (2024년 ~ 2030년)
- 연도별 별도 JSON 파일 저장: `auto-save-{type}-{year}.json`
- 연도 변경 시 해당 연도 데이터 자동 로드
- localStorage와 파일 동기화

### 네비게이션 시스템 (✅ 완료)
- 드롭다운 메뉴로 시료 유형 선택
- 뒤로가기 버튼 (메인 페이지 이동)
- 페이지 간 이동 시 데이터 유지

### 라벨 인쇄 기능 (✅ 완료)
- A4 라벨지 2열 9행 (18개) 템플릿
- 시작 위치 선택 (라벨지 절약)
- 시각적 그리드 프리뷰
- 엑셀 파일 업로드 지원
- 동일인 중복 제거

### 엑셀 내보내기 (✅ 완료)
- 전체 필드 포함 내보내기
- 시료 유형별 맞춤 컬럼

### 통계 기능 (✅ 완료)
- 총 접수/완료/미완료 건수
- 시료 타입별 통계
- 목적(용도)별 통계
- 월별 접수 현황
- 수령 방법별 통계

---

## 완료된 작업

### UI/UX 개선
- [x] 검색 모달 디자인 (둥근 모서리, 아이콘 배경색)
- [x] 테이블 행 높이 축소
- [x] 체크박스 선택 기능 (전체/개별 선택)
- [x] 주소/우편번호 분리
- [x] 전체 보기/기본 보기 토글
- [x] 필지 입력 UI 개선
- [x] 하위 필지 레이아웃 정리
- [x] 비고 입력창 100% 너비

### 데이터 관리
- [x] 연도별 데이터 분리 저장
- [x] 자동 저장 파일에서 자동 로드
- [x] 선택 삭제 기능
- [x] 데이터 백업/복원

### GitHub 배포
- [x] GitHub Actions 워크플로우
- [x] Windows .exe 자동 빌드
- [x] GitHub Releases 자동 업로드
- [x] GitHub Pages 웹 배포

---

## 커밋 히스토리 (최근)

| 커밋 | 설명 |
|------|------|
| `13686bf` | refactor: TypeScript 전환 폐기 및 JavaScript 유지 |
| `e44b6e2` | fix: 지번 검색 로직 개선 및 자동 저장 활성화 수정 |
| `5d9bca9` | fix: 메인 화면 카드 설명 문구 수정 |
| `c14b342` | feat: 사용 설명서 추가 및 한글 메뉴 적용 |
| `b556efc` | feat: 연도별 자동저장 및 UI 개선 |
| `699dc52` | feat: 모든 페이지에 년도 선택 기능 추가 및 docs 동기화 |
| `1816feb` | feat: 잔류농약 검사 페이지 추가 및 다중 의뢰 기능 구현 |
| `bf0a672` | feat: 엑셀 내보내기 전체 필드 포함 기능 개선 |
| `99e48f4` | fix: 중금속/퇴액비 페이지 버그 수정 및 기능 개선 |
| `bae078a` | refactor: 토양 중금속 페이지 개선 |
| `3b586d6` | feat: 메인 페이지 토양 중금속 카드 활성화 |
| `ab76671` | feat: 토양 중금속 시료 접수 대장 페이지 추가 |
| `329e59a` | feat: 드롭다운 네비게이션 추가 및 자동저장 기능 완성 |
| `413241b` | feat: 퇴·액비 시료 접수 기능 추가 및 라벨 인쇄 연결 |
| `4af6df8` | feat: 시료 종류별 페이지 분리 및 수질분석 시스템 구현 |

---

## 기술 스택

- **프레임워크**: Electron + Electron Forge
- **프론트엔드**: HTML, CSS, JavaScript (Vanilla)
- **스타일링**: Tailwind CSS, Custom CSS
- **라이브러리**:
  - XLSX.js (엑셀 파일 처리)
  - Daum Postcode API (주소 검색)
- **빌드**: Electron Forge (Squirrel, ZIP)
- **CI/CD**: GitHub Actions
- **배포**: GitHub Releases, GitHub Pages

---

## 향후 작업 (예정)

### 기능 개선
- [ ] 추가 라벨 템플릿 지원 (3x7, 4x6 등)
- [ ] 다크 모드 지원
- [ ] macOS 빌드 추가
- [ ] 검사 결과 입력 및 관리 기능
- [ ] 결과 보고서 출력 기능
- [ ] 인쇄 미리보기 개선

### 데이터 관리
- [ ] 클라우드 동기화 기능
- [ ] 다중 사용자 지원
- [ ] 데이터 암호화

### UI/UX
- [ ] 반응형 디자인 개선
- [ ] 접근성 향상
- [ ] 키보드 네비게이션

---

## 디자인 개선안 (2024-12-16)

프론트엔드 디자인 분석 결과 도출된 개선안입니다.

### 현재 디자인 분석

#### ✅ 잘된 점
| 항목 | 상태 |
|------|------|
| ShadCN 스타일 CSS 변수 시스템 | ✅ 구축 완료 |
| 시료 타입별 컬러 테마 | ✅ 적용 완료 |
| 호버 애니메이션 및 트랜지션 | ✅ 적용 완료 |
| 다크 네비게이션 + 라이트 콘텐츠 대비 | ✅ 적용 완료 |

#### ⚠️ 개선 필요 영역
| 영역 | 현재 상태 | 개선안 |
|------|----------|--------|
| **타이포그래피** | Noto Sans KR 단일 폰트 | 디스플레이용 특색 있는 폰트 추가 (Pretendard, SUIT) |
| **컬러 팔레트** | 표준 Tailwind 색상 | 농업/자연 테마 맞춤 팔레트 (흙색, 새싹색, 물색) |
| **메인 페이지** | 단순 그리드 카드 | 인터랙티브한 일러스트/아이콘 애니메이션 |
| **배경** | 단색 그라디언트 | 미세한 노이즈 텍스처, 패턴 오버레이 |
| **마이크로 인터랙션** | 기본 호버만 | 버튼 클릭 피드백, 로딩 스피너, 토스트 알림 |
| **아이콘** | 이모지 의존 | 커스텀 SVG 아이콘 또는 Lucide Icons |

### 구체적 개선안

#### 1. 메인 페이지 리디자인 ✅ 완료 (2024-12-16)
- [x] 카드 호버 시 아이콘 바운스 애니메이션
- [x] 스태거드 페이드인 효과 (순차 등장)
- [x] 배경에 미세한 입자/노이즈 텍스처
- [x] 파티클 부유 효과 추가
- [x] 글래스모피즘 카드 배경

#### 2. 네비게이션 바 개선 ✅ 완료 (2024-12-16)
- [x] 더 정교한 툴팁 디자인 (스케일 + 바운스 애니메이션)
- [x] 활성 탭 언더라인 애니메이션
- [x] 시료 타입별 컬러 하이라이트 강화 (상단 악센트 라인, 브랜드 글로우, 버튼 컬러)

#### 3. 폼 UI 개선 ✅ 완료 (2024-12-16)
- [x] 플로팅 레이블 (floating label) - `.form-field.floating` 클래스
- [x] 입력 시 애니메이션 효과 - 포커스 확대, 하이라이트 애니메이션
- [x] 검증 상태 시각적 피드백 - valid/invalid/warning 클래스 + SVG 아이콘

#### 4. 다크 모드 지원
- [ ] 시스템 설정 연동 다크 모드
- [ ] 토글 스위치 추가

### 우선순위별 개선 계획

| 우선순위 | 개선 항목 | 예상 효과 | 상태 |
|---------|----------|----------|------|
| 🔴 높음 | 마이크로 인터랙션 추가 | UX 체감 품질 향상 | ✅ 완료 |
| 🟡 중간 | 커스텀 SVG 아이콘 적용 | 전문성/일관성 향상 | ⏳ 대기 |
| 🟡 중간 | 폼 입력 애니메이션 | 사용자 피드백 향상 | ✅ 완료 |
| 🟢 낮음 | 다크 모드 | 사용자 선호도 향상 | ⏳ 대기 |
| 🟢 낮음 | 노이즈 텍스처 배경 | 시각적 깊이감 | ✅ 완료 |

### 보안
- [x] innerHTML XSS 위험 개선 - DOMPurify 라이브러리 도입 ✅ 완료
  - sanitize.js 모듈 구현
  - 모든 시료 스크립트에 적용

### 코드 구조
- [ ] style.css 파일 분리 검토 (현재 3,984줄)
  - 현재 단일 파일로 성능 문제 없음, 필요시 모듈화 진행
  - 분리 시 구조: variables, navbar, forms, tables, modals, pagination, utilities
- [ ] ESLint 도입 검토
  - 현재 미설정 상태, 개인 프로젝트로 급하지 않음
  - 팀 협업 또는 프로젝트 확장 시 도입 권장
- [ ] 단위 테스트 추가
  - Vitest 또는 Jest 도입
  - 현재 E2E 테스트(Playwright)만 있음, 개별 함수 테스트 필요

---

## TypeScript 마이그레이션 (❌ 폐기)

### 폐기 사유 (2024-12-15)
이 프로젝트는 **빌드 시스템 없이** HTML에서 직접 `<script src="*.js">`로 로드하는 구조입니다.
TypeScript를 사용하려면 빌드 단계(tsc 컴파일)가 필요하지만, 현재 구조에서는 불필요한 복잡성을 추가합니다.

**결정**: 순수 JavaScript + JSDoc 타입 힌트로 유지

### 대안으로 적용된 사항
- [x] JSDoc 타입 주석으로 타입 힌트 제공
- [x] VS Code IntelliSense 지원
- [x] 빌드 없이 바로 실행 가능한 구조 유지

### 삭제된 파일
- `tsconfig.json`
- `src/types/global.d.ts`
- `src/types/sample.d.ts`

---

## 코드 분석 결과 (2024-12-16)

MCP 도구 및 전문 에이전트를 활용한 종합 코드 분석 결과입니다.

### ✅ Critical Issues (수정 완료 - 2024-12-16)

#### 1. ✅ `window.window.isElectron` 타이포 버그 - **수정 완료**
**수정 내용**: 4개 파일에서 `window.window.isElectron` → `window.isElectron`으로 수정

| 파일 | 상태 |
|------|------|
| `src/water/water-script.js` | ✅ 수정 완료 |
| `src/pesticide/pesticide-script.js` | ✅ 수정 완료 |
| `src/heavy-metal/heavy-metal-script.js` | ✅ 수정 완료 |
| `src/compost/compost-script.js` | ✅ 수정 완료 |

#### 2. ✅ localStorage 키 충돌 - **수정 완료**
**수정 내용**: 모듈별 고유 접두사 적용

| 모듈 | 키 | 상태 |
|------|-----|------|
| soil | `soilAutoSaveEnabled` | ✅ 수정 완료 |
| pesticide | `pesticideAutoSaveEnabled` | ✅ 수정 완료 |
| water | `waterAutoSaveEnabled` | ✅ |
| compost | `compostAutoSaveEnabled` | ✅ |
| heavy-metal | `heavyMetalAutoSaveEnabled` | ✅ |

#### 3. ✅ JSON.parse 에러 핸들링 - **수정 완료**
**영향**: localStorage 손상 시 앱 크래시
**해결**: 모든 모듈에서 `SampleUtils.safeParseJSON()` 공통 함수 사용

| 파일 | 수정 위치 | 상태 |
|------|----------|------|
| `src/soil/soil-script.js` | 4곳 | ✅ |
| `src/water/water-script.js` | 3곳 | ✅ |
| `src/compost/compost-script.js` | 3곳 | ✅ |
| `src/heavy-metal/heavy-metal-script.js` | 2곳 | ✅ |
| `src/pesticide/pesticide-script.js` | 3곳 | ✅ |
| `src/label-print/label-app.js` | 1곳 | ✅ |

#### 4. ✅ 미정의 변수 사용 - **수정 완료**
**수정 내용**: `selectedYear` → `currentYear`로 수정

| 파일 | 상태 |
|------|------|
| `src/water/water-script.js:55` | ✅ 수정 완료 |
| `src/compost/compost-script.js:89` | ✅ 수정 완료 |

### 🟡 보안 이슈

#### 5. ✅ DOMPurify CDN 의존성 - **수정 완료**
**문제**: 외부 CDN에서 DOMPurify 로드 → 공급망 공격 위험
**해결**: SRI(Subresource Integrity) 해시 추가

```html
<!-- 수정 후: SRI 해시 적용 -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/dompurify/3.0.6/purify.min.js"
        integrity="sha384-cwS6YdhLI7XS60eoDiC+egV0qHp8zI+Cms46R0nbn8JrmoAzV9uFL60etMZhAnSu"
        crossorigin="anonymous"></script>
```

#### 6. ⏳ localStorage 민감정보 평문 저장 - **미해결**
**저장 데이터**: 이름, 전화번호, 주소 등 개인정보
**문제**: 암호화 없이 평문 저장 → 개인정보보호법 위반 가능
**상태**: 추후 암호화 모듈 도입 검토

#### 7. ✅ 파일 경로 검증 누락 - **수정 완료**
**파일**: `src/index.js`
**해결**: `validateFilePath()` 함수 추가, Path Traversal 공격 방지

```javascript
// ✅ 수정 후: 경로 검증 적용
function validateFilePath(filePath) {
    // '..' 패턴 차단
    // 허용된 디렉토리만 접근 가능 (userData, documents, downloads, desktop, home)
}
```

### 🟢 코드 품질 이슈

#### 8. ✅ 대규모 코드 중복 - **해결 완료**
**현황**: 5개 모듈에서 ~3,000줄 중복
**해결**: `src/shared/utils.js` 공통 유틸리티 모듈 추출

| 중복 기능 | 상태 |
|-----------|------|
| 전화번호 포맷팅 | ✅ 공통화 완료 |
| 면적 포맷팅 | ✅ 공통화 완료 |
| Auto-save 로직 | ✅ 공통화 완료 (전체 모듈) |
| Excel 내보내기 | ❌ 공통화 불가 (모듈별 데이터 구조 상이) |
| JSON 가져오기/내보내기 | ✅ 공통화 완료 (전체 모듈) |

**Auto-save 공통 함수 (utils.js)**:
- `initAutoSave(options)` - 초기화 및 기존 파일 로드 (Electron/Web 환경 지원)
- `performAutoSave(options)` - 자동 저장 실행 (File System Access API 지원)
- `setupAutoSaveToggle(options)` - 토글 이벤트 핸들러
- `setupAutoSaveFolderButton(options)` - 폴더 선택 버튼 핸들러
- `updateAutoSaveStatus(status)` - UI 상태 업데이트

**JSON 공통 함수 (utils.js)**:
- `saveJSON(options)` - JSON 파일 저장 (FileAPI 사용)
- `mergeJSONData(currentData, loadedData, deduplicateById)` - 데이터 병합 (ID 중복 제거 지원)
- `setupJSONSaveHandler(options)` - 저장 버튼 핸들러 설정
- `setupJSONLoadHandler(options)` - 파일 input 불러오기 핸들러 (deduplicateById 옵션 추가)
- `setupElectronLoadHandler(options)` - Electron 파일 메뉴 불러오기 핸들러 (deduplicateById 옵션 추가)

**Excel 내보내기 공통화 불가 사유**:
- soil/pesticide: parcels/subLots 중첩 구조, id 기반 중복 제거 로직 포함
- water/compost/heavy-metal: 각각 고유 필드 매핑 (시료명, 농장명, 분석항목 등)

**추가 권장**: `BaseSampleModule` 클래스 추출로 추가 58% 감소 가능

#### 9. ✅ parseInt radix 파라미터 누락 - **수정 완료**
**해결**: 모든 `parseInt()` 호출에 radix(10) 파라미터 추가

```javascript
// ✅ 수정 완료
const subLotIndex = parseInt(target.dataset.index, 10);
```

#### 10. ✅ Excel 라이브러리 버전 불일치 - **수정 완료**
**해결**: 모든 모듈에서 SheetJS xlsx 0.20.1로 통일

| 모듈 | 버전 | 상태 |
|------|------|------|
| 모든 모듈 | 0.20.1 | ✅ 통일 완료 |

### 📊 보안 점수 요약 (수정 후)

| 카테고리 | 점수 | 상태 |
|----------|------|------|
| Electron 설정 | 9/10 | ✅ 우수 |
| XSS 보호 | 9/10 | ✅ 우수 (SRI 적용) |
| 입력 검증 | 6/10 | 🟡 양호 |
| 데이터 저장 보안 | 3/10 | 🔴 심각 (암호화 필요) |
| 파일 시스템 보안 | 8/10 | ✅ 양호 (경로 검증 적용) |
| **종합** | **7/10** | 🟡 **양호** |

### ✅ 긍정적 보안 사항

1. `contextIsolation: true`, `nodeIntegration: false` 적용
2. `escapeHTML()` 함수로 XSS 방지 일관 적용 (112+ 사용)
3. IPC API 최소화 및 Context Bridge 안전 구현
4. 자동 저장 경로 샌드박스 (`userData` 디렉토리)
5. **[NEW]** DOMPurify SRI 해시 적용 (공급망 공격 방지)
6. **[NEW]** 파일 경로 검증으로 Path Traversal 방지

### 🎯 수정 우선순위 (업데이트)

| 우선순위 | 작업 | 상태 |
|----------|------|------|
| ✅ 1 | `window.window` 타이포 수정 | 완료 |
| ✅ 2 | localStorage 키 충돌 수정 | 완료 |
| ✅ 3 | JSON.parse 에러 핸들링 추가 | 완료 |
| ✅ 4 | 미정의 변수 (`selectedYear`) 수정 | 완료 |
| ✅ 5 | 파일 경로 검증 추가 | 완료 |
| ✅ 6 | DOMPurify SRI 해시 추가 | 완료 |
| ✅ 7 | parseInt radix 추가 | 완료 |
| ✅ 8 | Excel 라이브러리 버전 통일 | 완료 |
| ✅ 9 | 코드 중복 제거 (리팩토링) | 완료 |
| ⏳ 10 | localStorage 암호화 | 추후 진행 |

### 📝 커밋 이력 (2024-12-16)

| 커밋 | 설명 |
|------|------|
| `1a441ab` | fix: Critical 버그 수정 (환경 감지, localStorage 키 충돌, 미정의 변수) |
| `7cc6a62` | refactor: 공통 유틸리티 모듈 추출로 코드 중복 제거 |
| `6765621` | fix: parseInt radix 파라미터 추가 |
| `a93ce1e` | chore: Excel 라이브러리 버전 통일 (0.20.1) |
| `328d2c5` | security: 파일 경로 검증 추가 (Path Traversal 방지) |
| `f8474cc` | security: DOMPurify CDN에 SRI 해시 추가 |
| `f4f2ae5` | refactor: JSON 저장/불러오기 공통 함수 추출 |
| `875d7fc` | refactor: JSON.parse 에러 핸들링 및 JSON 저장/불러오기 공통화 |

---

## E2E 테스트 현황 (2024-12-16)

### Playwright 테스트 추가
- **총 테스트 수**: 178개 (기존 110개 → 178개)
- **상태**: ✅ 전체 통과

### 테스트 카테고리
| 파일 | 테스트 내용 |
|------|-------------|
| `soil-form.spec.js` | 토양 폼 기능 테스트 |
| `water-form.spec.js` | 수질 폼 기능 테스트 |
| `compost-form.spec.js` | 퇴액비 폼 기능 테스트 |
| `pesticide-form.spec.js` | 잔류농약 폼 기능 테스트 |
| `heavy-metal-form.spec.js` | 중금속 폼 기능 테스트 |
| `form-submission.spec.js` | 폼 제출 및 네비게이션 |
| `data-persistence.spec.js` | localStorage, 새로고침, 연도 선택 |
| `search-filter.spec.js` | 검색 모달, 필터 기능 |
| `edit-delete.spec.js` | 수정/삭제, 체크박스, 폼 초기화 |
| `accessibility.spec.js` | 키보드 네비게이션, ARIA |
| `error-handling.spec.js` | 유효성 검사, 에러 처리 |

### 커밋 이력
| 커밋 | 설명 |
|------|------|
| `2258abd` | test: E2E 테스트 대폭 강화 (178개 테스트) |
