/**
 * @fileoverview SoilResultImporter — 토양 시료 엑셀/붙여넣기 가져오기 모달
 *
 * 메인 프로젝트 `src/soil/soil-result-importer.js`의 TS 포팅 (SAMPL-1-124 Phase B-3).
 * 모달 DOM·스타일을 이 모듈이 직접 주입하므로 외부 마크업/CSS에 의존하지 않는다.
 *
 * 흐름:
 *   1) 엑셀 데이터 입력 — 파일 업로드(드래그앤드롭) / 텍스트 붙여넣기 토글
 *   2) 컬럼 매핑        — 엑셀 컬럼 → 접수 필드, 자동 매핑 추정
 *   3) 경지구분 1차     — 드롭다운 → 가져오는 모든 행에 일괄 적용
 *   4) 옵션            — 접수번호 자동부여 / 중복 시(건너뛰기·덮어쓰기)
 *   5) 미리보기        — 생성될 행 표 + 신규/중복/오류 배지 + 건수 요약
 *
 * 저장은 `window.soilManager.addImportedRecord(record)`로 위임한다.
 *
 * 메인과의 의도적 차이:
 * - 계산 로직(파싱·자동매핑·중복판정)은 Phase A/B-1/B-2에서 순수 모듈로 분리했고
 *   이 클래스는 상태·DOM만 담당한다. 메인은 전부 한 파일에 있어 단위 테스트가 불가능했다.
 * - XLSX를 `window.XLSX` 전역이 아니라 npm 패키지에서 직접 import한다(타입 보장).
 * - 사용자 데이터가 들어가는 DOM은 innerHTML 문자열 조립이 아니라 `textContent`로 만든다.
 *   이스케이프 누락으로 XSS가 생길 여지를 구조적으로 없앤다(정적 셸만 innerHTML 사용).
 */

import { read as xlsxRead, utils as xlsxUtils } from 'xlsx';

import {
    TARGET_FIELDS,
    LAND_CLASS1_OPTIONS,
    LAND_CLASS1_DEFAULT,
    computeAutoMapping,
    auditDuplicateKeywords,
    type ColumnMapping,
} from './soil-import-mapping';
import {
    parsePasteText,
    parseActiveSheet,
    type ParsedTable,
    type SheetData,
} from './soil-import-parse';
// 매니저 미준비 시 직접 읽는 localStorage 키 — 값을 이 파일에 다시 적지 않는다 (단일 소스)
import { STORAGE_KEY } from './soil-script';
import { buildCsv, ERROR_CSV_HEADER } from './soil-import-csv';
import {
    collectExistingNumbers,
    computePreview,
    type DupPolicy,
    type ExistingLogLike,
    type PreviewItem,
    type PreviewRecord,
    type PreviewResult,
} from './soil-import-preview';

// ============================================================
// 상수
// ============================================================
const FILE_SIZE_WARN = 5 * 1024 * 1024;    // 5MB: 경고만
const FILE_SIZE_HARD = 50 * 1024 * 1024;   // 50MB: 거부
const PREVIEW_ROW_LIMIT = 200;             // 미리보기 표 최대 행
const STYLE_ID = 'soil-importer-style';
const MODAL_ID = 'soilImporterModal';

const STATUS_LABEL: Record<PreviewItem['status'], string> = { new: '신규', dup: '중복', err: '오류' };


const PREVIEW_COLUMNS = [
    '상태', '접수번호', '성명', '연락처', '지번주소', '작물', '면적', '경지구분1차', '구분', '목적', '비고',
] as const;

// ============================================================
// 외부 전역 (타입 안전 접근)
// ============================================================

/** 이 모듈이 실제로 쓰는 매니저 API만 좁게 선언한다 */
interface SoilManagerLike {
    sampleLogs?: ExistingLogLike[];
    selectedYear?: number | string;
    getNextNumberForClass?(year: number | string, landClass1: string): number;
    /** 성토 다음 접수번호 — 'F3' 형태의 문자열을 돌려준다 */
    generateNextFillReceptionNumber?(landClass1?: string): string;
    addImportedRecord?(record: PreviewRecord): unknown;
}

type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ImporterWindow {
    soilManager?: SoilManagerLike;
    showToast?: (message: string, type?: ToastType) => void;
    logger?: { error?: (...args: unknown[]) => void; warn?: (...args: unknown[]) => void };
    SoilResultImporter?: SoilResultImporter;
}

function w(): ImporterWindow {
    return window as unknown as ImporterWindow;
}

function getManager(): SoilManagerLike | null {
    return w().soilManager ?? null;
}

function toast(message: string, type?: ToastType): void {
    const fn = w().showToast;
    if (typeof fn === 'function') { fn(message, type); return; }
    (type === 'error' ? console.error : console.log)('[가져오기]', message);
}

function logErr(...args: unknown[]): void {
    const fn = w().logger?.error;
    if (typeof fn === 'function') fn(...args);
    else console.error(...args);
}

/** 현재 대상 연도 — 매니저가 없으면 올해 */
function currentYear(mgr: SoilManagerLike | null): number | string {
    return mgr?.selectedYear ?? new Date().getFullYear();
}

// ============================================================
// 스코프드 스타일 (1회 주입)
// ============================================================
function injectStyle(): void {
    if (document.querySelector('style[data-soil-importer]')) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.setAttribute('data-soil-importer', '');
    style.textContent = `
.sri-overlay{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;
  background:rgba(15,23,42,.55);backdrop-filter:blur(3px);padding:24px 14px;overflow-y:auto}
.sri-overlay[hidden]{display:none}
.sri-dialog{font-family:'Noto Sans KR','Inter',system-ui,sans-serif;width:100%;max-width:1040px;margin:auto;
  background:#fff;border-radius:18px;box-shadow:0 30px 90px rgba(15,23,42,.32);overflow:hidden;
  border:1px solid #e2e8f0;display:flex;flex-direction:column;max-height:calc(100vh - 48px)}
.sri-header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:20px 24px;
  border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#f0fdf4 0%,#eff6ff 100%);flex:0 0 auto}
.sri-header h2{margin:0;font-size:1.18rem;font-weight:700;color:#0f172a;display:flex;align-items:center;gap:9px}
.sri-close{border:1px solid #e2e8f0;background:#fff;border-radius:10px;width:36px;height:36px;cursor:pointer;
  font-size:1rem;color:#64748b;transition:all .2s;display:flex;align-items:center;justify-content:center;line-height:1}
.sri-close:hover{background:#fef2f2;color:#ef4444;border-color:#fecaca}
.sri-body{padding:22px 24px;overflow-y:auto;flex:1 1 auto}
.sri-sec{margin-bottom:24px}
.sri-sec:last-child{margin-bottom:0}
.sri-sec>h3{font-size:.98rem;font-weight:600;margin:0 0 12px;color:#0f172a;display:flex;align-items:center;gap:8px}
.sri-stepnum{display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px;border-radius:50%;
  background:#22c55e;color:#fff;font-size:.74rem;font-weight:700;flex:0 0 auto}
.sri-help{font-size:.8rem;color:#64748b;margin:0 0 10px;line-height:1.5}
/* mode toggle */
.sri-mode{display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap}
.sri-mode label{flex:1;min-width:200px;display:flex;align-items:center;gap:10px;cursor:pointer;padding:12px 16px;
  border:1.5px solid #e2e8f0;border-radius:12px;transition:all .2s;background:#fff}
.sri-mode label:hover{border-color:#bbf7d0}
.sri-mode label.active{border-color:#22c55e;background:#f0fdf4;box-shadow:0 2px 8px rgba(34,197,94,.12)}
.sri-mode input{accent-color:#22c55e;width:17px;height:17px;margin:0}
.sri-mt-title{font-weight:600;font-size:.92rem;color:#1e293b}
.sri-mt-sub{font-size:.76rem;color:#64748b;display:block;margin-top:1px}
/* dropzone */
.sri-dropzone{border:2px dashed #93c5fd;border-radius:14px;padding:28px 20px;text-align:center;
  background:linear-gradient(180deg,#f0f9ff,#fff);transition:all .2s;cursor:pointer}
.sri-dropzone:hover,.sri-dropzone.is-dragover{border-color:#3b82f6;background:#eff6ff}
.sri-dz-icon{font-size:2.2rem;display:block;margin-bottom:8px}
.sri-dz-main{font-weight:600;font-size:.94rem;margin-bottom:4px;color:#1e293b}
.sri-dz-sub{font-size:.8rem;color:#64748b}
.sri-dz-btn{margin-top:14px;border:none;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;
  padding:10px 22px;border-radius:10px;font-weight:600;cursor:pointer;font-size:.88rem;font-family:inherit}
.sri-dz-btn:hover{filter:brightness(1.05)}
.sri-fileinfo{margin-top:12px;font-size:.84rem;color:#166534;background:#f0fdf4;border:1px solid #bbf7d0;
  border-radius:10px;padding:8px 12px;display:flex;align-items:center;gap:6px}
.sri-fileinfo[hidden]{display:none}
.sri-file-opts{display:flex;gap:12px;margin-top:14px;flex-wrap:wrap}
.sri-file-opts[hidden]{display:none}
.sri-fo{flex:1;min-width:150px}
.sri-fo label{font-size:.8rem;color:#475569;display:block;margin-bottom:5px;font-weight:500}
.sri-fo .sri-chk{display:flex;align-items:center;gap:7px;font-size:.84rem;color:#475569;cursor:pointer;margin-top:24px}
/* paste */
.sri-paste[hidden]{display:none}
.sri-paste textarea{width:100%;min-height:120px;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 14px;
  font-family:'SF Mono',ui-monospace,Menlo,monospace;font-size:.82rem;resize:vertical;color:#1e293b;line-height:1.5}
.sri-paste textarea:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.12)}
.sri-paste .sri-chk{display:flex;align-items:center;gap:7px;font-size:.84rem;color:#475569;cursor:pointer;margin-top:10px}
/* selects/inputs */
.sri-dialog select,.sri-input{width:100%;padding:9px 12px;border:1.5px solid #e2e8f0;border-radius:10px;
  font-family:inherit;font-size:.88rem;background:#fff;color:#1e293b;cursor:pointer}
.sri-dialog select:focus,.sri-input:focus{outline:none;border-color:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.12)}
.sri-chk input,.sri-radio input{accent-color:#22c55e;width:16px;height:16px;margin:0}
/* mapping */
.sri-maphead{display:flex;align-items:center;gap:8px;margin-bottom:12px;flex-wrap:wrap}
.sri-automap{border:1.5px solid #22c55e;background:#fff;color:#16a34a;padding:8px 16px;border-radius:10px;
  font-weight:600;cursor:pointer;font-size:.84rem;font-family:inherit;transition:all .2s;margin-left:auto}
.sri-automap:hover{background:#22c55e;color:#fff}
.sri-mapgrid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px 16px}
.sri-maprow{display:flex;align-items:center;gap:8px}
/* 공익직불제 강조 (경지구분1차='공익직불제'일 때) */
.sri-mapgrid.gongik-active .sri-maprow--gongik{background:#ecfdf5;border:1.5px solid #22c55e;
  border-radius:10px;padding:8px 10px}
.sri-maprow--gongik .sri-gbadge{display:none;margin-left:6px;font-size:.66rem;font-weight:700;color:#fff;
  background:#22c55e;border-radius:8px;padding:1px 6px;white-space:nowrap}
.sri-mapgrid.gongik-active .sri-maprow--gongik .sri-gbadge{display:inline-flex;align-items:center}
.sri-maplabel{flex:0 0 78px;font-size:.83rem;color:#334155;font-weight:500}
.sri-maplabel .sri-opt{color:#94a3b8;font-weight:400;font-size:.74rem}
.sri-maparrow{color:#94a3b8;flex:0 0 auto}
.sri-maprow select{flex:1;min-width:0}
/* bulk landclass */
.sri-bulk{display:flex;align-items:center;gap:14px;flex-wrap:wrap;background:#f0fdf4;border:1px solid #bbf7d0;
  border-radius:12px;padding:14px 18px}
.sri-bulk-label{font-weight:600;font-size:.9rem;flex:0 0 auto;color:#166534}
.sri-bulk select{flex:1;min-width:180px;max-width:240px}
.sri-bulk .sri-bulk-note{font-size:.8rem;color:#64748b}
/* options */
.sri-opts{display:flex;flex-direction:column;gap:10px}
.sri-chk,.sri-radio{display:flex;align-items:center;gap:9px;font-size:.88rem;cursor:pointer;color:#334155}
.sri-opt-sub{display:flex;gap:18px;padding-left:26px;margin-top:2px;flex-wrap:wrap}
.sri-muted{color:#64748b;font-size:.8rem}
/* preview */
.sri-pv-summary{display:flex;gap:10px;margin-bottom:12px;flex-wrap:wrap}
.sri-pill{padding:6px 14px;border-radius:20px;font-size:.82rem;font-weight:600;display:flex;align-items:center;gap:6px}
.sri-pill.new{background:#dcfce7;color:#166534}
.sri-pill.dup{background:#fef3c7;color:#92400e}
.sri-pill.err{background:#fee2e2;color:#991b1b}
.sri-pv-empty{padding:18px;text-align:center;color:#94a3b8;font-size:.86rem;border:1px dashed #e2e8f0;border-radius:12px}
.sri-pv-wrap{border:1px solid #e2e8f0;border-radius:12px;overflow:auto;max-height:260px}
.sri-pv-table{margin:0;border-collapse:collapse;font-size:.8rem;min-width:640px;width:100%}
.sri-pv-table th{position:sticky;top:0;z-index:1;background:#f8fafc;font-weight:600;color:#334155;font-size:.76rem;
  padding:8px 10px;text-align:left;border-bottom:1px solid #e2e8f0;white-space:nowrap}
.sri-pv-table td{padding:7px 10px;border-bottom:1px solid #f1f5f9;color:#334155;white-space:nowrap}
.sri-pv-table tr:last-child td{border-bottom:0}
.sri-pv-table tr.is-dup td{background:#fffbeb}
.sri-pv-table tr.is-err td{background:#fef2f2}
.sri-pv-table td.addr{white-space:normal;min-width:160px;max-width:240px}
.sri-status{padding:2px 9px;border-radius:12px;font-size:.72rem;font-weight:600;white-space:nowrap}
.sri-status.new{background:#dcfce7;color:#166534}
.sri-status.dup{background:#fef3c7;color:#92400e}
.sri-status.err{background:#fee2e2;color:#991b1b}
.sri-pv-overflow{padding:8px 10px;font-size:.78rem;color:#94a3b8;text-align:center}
/* footer */
.sri-footer{display:flex;align-items:center;gap:12px;padding:16px 24px;border-top:1px solid #e2e8f0;
  background:#f8fafc;flex:0 0 auto;flex-wrap:wrap}
.sri-footer-note{font-size:.83rem;color:#64748b}
.sri-spacer{flex:1}
.sri-btn-cancel{border:1.5px solid #e2e8f0;background:#fff;color:#475569;padding:10px 22px;border-radius:11px;
  font-weight:600;cursor:pointer;font-size:.9rem;font-family:inherit}
.sri-btn-cancel:hover{background:#f1f5f9}
.sri-btn-import{border:none;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;padding:10px 26px;
  border-radius:11px;font-weight:700;cursor:pointer;font-size:.9rem;font-family:inherit;
  box-shadow:0 4px 14px rgba(34,197,94,.3);display:flex;align-items:center;gap:7px}
.sri-btn-import:hover:not(:disabled){transform:translateY(-1px);box-shadow:0 6px 18px rgba(34,197,94,.4)}
.sri-btn-import:disabled{opacity:.5;cursor:not-allowed;box-shadow:none}
.sri-btn-dlerr{border:1.5px solid #fca5a5;background:#fff1f2;color:#b91c1c;padding:10px 18px;border-radius:11px;
  font-weight:600;cursor:pointer;font-size:.88rem;font-family:inherit;transition:all .2s}
.sri-btn-dlerr:hover{background:#fee2e2;border-color:#f87171}
.sri-btn-dlerr[hidden]{display:none}
@media (max-width:880px){
  .sri-mapgrid{grid-template-columns:1fr 1fr}
}
@media (max-width:640px){
  .sri-mapgrid{grid-template-columns:1fr}
  .sri-body{padding:18px 16px}
  .sri-header,.sri-footer{padding:14px 16px}
  .sri-bulk select{max-width:none}
}
/* 다크 모드 */
[data-theme="dark"] .sri-dialog{background:#1c1917;border-color:rgba(148,163,184,.2)}
[data-theme="dark"] .sri-header{background:linear-gradient(135deg,rgba(34,197,94,.12),rgba(59,130,246,.1));
  border-bottom-color:rgba(148,163,184,.15)}
[data-theme="dark"] .sri-header h2{color:#f1f5f9}
[data-theme="dark"] .sri-close{background:#292524;border-color:#44403c;color:#a8a29e}
[data-theme="dark"] .sri-sec>h3{color:#e5e7eb}
[data-theme="dark"] .sri-help,[data-theme="dark"] .sri-muted,[data-theme="dark"] .sri-bulk-note{color:#a8a29e}
[data-theme="dark"] .sri-mode label{background:#292524;border-color:#44403c}
[data-theme="dark"] .sri-mode label.active{background:rgba(34,197,94,.12);border-color:#22c55e}
[data-theme="dark"] .sri-mt-title{color:#e5e7eb}
[data-theme="dark"] .sri-dropzone{background:linear-gradient(180deg,rgba(59,130,246,.08),#1c1917);border-color:#3b6ea5}
[data-theme="dark"] .sri-dz-main{color:#e5e7eb}
[data-theme="dark"] .sri-dialog select,[data-theme="dark"] .sri-input,[data-theme="dark"] .sri-paste textarea{
  background:#292524;color:#e5e7eb;border-color:#57534e}
[data-theme="dark"] .sri-maplabel,[data-theme="dark"] .sri-chk,[data-theme="dark"] .sri-radio,
[data-theme="dark"] .sri-fo label{color:#d6d3d1}
[data-theme="dark"] .sri-bulk{background:rgba(34,197,94,.08);border-color:rgba(34,197,94,.25)}
[data-theme="dark"] .sri-bulk-label{color:#86efac}
[data-theme="dark"] .sri-pv-wrap{border-color:#44403c}
[data-theme="dark"] .sri-pv-table th{background:#292524;color:#d6d3d1;border-bottom-color:#44403c}
[data-theme="dark"] .sri-pv-table td{color:#d6d3d1;border-bottom-color:#332f2c}
[data-theme="dark"] .sri-pv-table tr.is-dup td{background:rgba(234,179,8,.08)}
[data-theme="dark"] .sri-pv-table tr.is-err td{background:rgba(239,68,68,.1)}
[data-theme="dark"] .sri-pv-empty{border-color:#44403c;color:#78716c}
[data-theme="dark"] .sri-footer{background:#231f1d;border-top-color:#44403c}
[data-theme="dark"] .sri-btn-cancel{background:#292524;color:#d6d3d1;border-color:#57534e}
[data-theme="dark"] .sri-btn-dlerr{background:#2d1515;border-color:#7f1d1d;color:#fca5a5}
[data-theme="dark"] .sri-btn-dlerr:hover{background:#3f1a1a;border-color:#ef4444}
[data-theme="dark"] .sri-mapgrid.gongik-active .sri-maprow--gongik{background:rgba(34,197,94,.1);border-color:rgba(34,197,94,.5)}
`;
    document.head.appendChild(style);
}

// ============================================================
// 모달 마크업 (1회 주입)
// ============================================================

/**
 * 정적 셸만 만든다. 사용자 데이터가 들어가는 영역(매핑·미리보기·파일명)은
 * 비워두고 `textContent`로 채운다 — 이 innerHTML에는 상수만 들어간다.
 */
function buildModal(): HTMLElement {
    const existing = document.getElementById(MODAL_ID);
    if (existing) return existing;

    const landOpts = LAND_CLASS1_OPTIONS.map((v) =>
        `<option value="${v}"${v === LAND_CLASS1_DEFAULT ? ' selected' : ''}>${v}</option>`,
    ).join('');

    const modal = document.createElement('div');
    modal.id = MODAL_ID;
    modal.className = 'sri-overlay';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'sriTitle');
    modal.innerHTML = `
<div class="sri-dialog" role="document">
  <header class="sri-header">
    <h2 id="sriTitle">📥 토양 시료 엑셀 가져오기</h2>
    <button type="button" class="sri-close" data-act="close" aria-label="닫기">✕</button>
  </header>
  <div class="sri-body">
    <!-- 1. 입력 방식 -->
    <section class="sri-sec">
      <h3><span class="sri-stepnum">1</span> 엑셀 데이터 입력</h3>
      <div class="sri-mode" role="radiogroup" aria-label="입력 방식">
        <label class="active" data-mode-label="file">
          <input type="radio" name="sriMode" value="file" checked>
          <span><span class="sri-mt-title">📤 엑셀 파일 업로드</span><span class="sri-mt-sub">권장 · .xlsx / .xls 드래그앤드롭</span></span>
        </label>
        <label data-mode-label="paste">
          <input type="radio" name="sriMode" value="paste">
          <span><span class="sri-mt-title">📋 텍스트 붙여넣기</span><span class="sri-mt-sub">엑셀 셀 복사 → 붙여넣기</span></span>
        </label>
      </div>
      <!-- file mode -->
      <div data-area="file">
        <div class="sri-dropzone" data-el="dropzone" tabindex="0" role="button" aria-label="엑셀 파일 선택">
          <input type="file" data-el="fileInput" accept=".xlsx,.xls,.csv" hidden>
          <span class="sri-dz-icon">⬆️</span>
          <div class="sri-dz-main">파일을 여기로 끌어다 놓으세요</div>
          <div class="sri-dz-sub">또는 아래 버튼으로 파일을 선택합니다 (.xlsx / .xls / .csv)</div>
          <button type="button" class="sri-dz-btn" data-act="pick">파일 선택</button>
        </div>
        <div class="sri-fileinfo" data-el="fileInfo" hidden></div>
        <div class="sri-file-opts" data-el="fileOpts" hidden>
          <div class="sri-fo">
            <label>시트 선택</label>
            <select data-el="sheetSelect"></select>
          </div>
          <div class="sri-fo">
            <label>헤더 행</label>
            <input type="number" class="sri-input" data-el="headerRow" min="1" value="1" title="헤더가 있는 행 번호">
          </div>
          <div class="sri-fo">
            <label class="sri-chk"><input type="checkbox" data-el="noHeader"> 헤더 없음</label>
          </div>
        </div>
      </div>
      <!-- paste mode -->
      <div class="sri-paste" data-area="paste" hidden>
        <textarea data-el="textarea" placeholder="엑셀에서 셀을 복사한 뒤 여기에 붙여넣으세요 (탭 구분)&#10;예) 성명&#9;연락처&#9;지번주소&#9;작물&#9;면적&#9;구분&#9;목적&#10;홍길동&#9;010-1234-5678&#9;봉화읍 내성리 123&#9;벼&#9;1200&#9;논&#9;일반재배"></textarea>
        <label class="sri-chk"><input type="checkbox" data-el="hasHeader" checked> 첫 행은 헤더입니다</label>
      </div>
    </section>

    <!-- 2. 컬럼 매핑 -->
    <section class="sri-sec">
      <div class="sri-maphead">
        <h3 style="margin:0"><span class="sri-stepnum">2</span> 컬럼 매핑</h3>
        <button type="button" class="sri-automap" data-act="automap">✨ 자동 매핑 추정</button>
      </div>
      <p class="sri-help">엑셀의 각 컬럼이 어느 접수 항목인지 지정하세요. 접수번호는 비우면 경지구분별 자동부여됩니다.</p>
      <div class="sri-mapgrid" data-el="mapGrid"></div>
    </section>

    <!-- 3. 경지구분 1차 -->
    <section class="sri-sec">
      <h3><span class="sri-stepnum">3</span> 경지구분 1차 일괄선택</h3>
      <div class="sri-bulk">
        <span class="sri-bulk-label">🏷️ 모든 행에 적용:</span>
        <select data-el="bulkLandClass" aria-label="경지구분 1차 일괄선택">${landOpts}</select>
        <span class="sri-bulk-note">가져오는 전체 행에 동일 적용됩니다</span>
      </div>
    </section>

    <!-- 4. 옵션 -->
    <section class="sri-sec">
      <h3><span class="sri-stepnum">4</span> 옵션</h3>
      <div class="sri-opts">
        <label class="sri-chk"><input type="checkbox" data-el="autoNumber" checked> 접수번호 자동부여 <span class="sri-muted">(경지구분별 독립 시퀀스)</span></label>
        <span class="sri-muted">중복 접수번호가 있을 때:</span>
        <div class="sri-opt-sub">
          <label class="sri-radio"><input type="radio" name="sriDup" value="skip" checked> 건너뛰기</label>
          <!--
            메인은 이 라벨이 '그래도 추가(덮어쓰기)'였으나 실제로는 덮어쓰지 않는다.
            매니저 addImportedRecord는 기존 레코드를 찾지 않고 sampleLogs.push만 하므로
            같은 접수번호가 두 줄이 된다. 라벨이 거짓을 말하지 않게 문구를 고쳤다.
          -->
          <label class="sri-radio"><input type="radio" name="sriDup" value="overwrite"> 그래도 추가 <span class="sri-muted">(같은 접수번호가 중복 등록됨)</span></label>
        </div>
      </div>
    </section>

    <!-- 5. 미리보기 -->
    <section class="sri-sec" style="margin-bottom:4px">
      <h3><span class="sri-stepnum">5</span> 미리보기</h3>
      <div class="sri-pv-summary" data-el="summary"></div>
      <div data-el="previewBox"></div>
    </section>
  </div>
  <footer class="sri-footer">
    <span class="sri-footer-note" data-el="footerNote"></span>
    <span class="sri-spacer"></span>
    <button type="button" class="sri-btn-dlerr" data-act="dlErrorCsv" hidden>⚠️ 오류 행 CSV</button>
    <button type="button" class="sri-btn-cancel" data-act="close">취소</button>
    <button type="button" class="sri-btn-import" data-act="import" disabled>📥 가져오기</button>
  </footer>
</div>`;
    document.body.appendChild(modal);
    return modal;
}

// ============================================================
// DOM 조립 헬퍼 (사용자 데이터는 전부 textContent로)
// ============================================================
function span(className: string, text?: string): HTMLSpanElement {
    const el = document.createElement('span');
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
}

function div(className: string, text?: string): HTMLDivElement {
    const el = document.createElement('div');
    if (className) el.className = className;
    if (text != null) el.textContent = text;
    return el;
}

function replaceChildrenWith(host: HTMLElement, ...nodes: Node[]): void {
    host.textContent = '';
    for (const n of nodes) host.appendChild(n);
}

// ============================================================
// 상태
// ============================================================
interface ImporterState {
    mode: 'file' | 'paste';
    fileName: string;
    sheets: Record<string, SheetData>;
    sheetNames: string[];
    activeSheet: string;
    /** 0-based; -1 = 헤더 없음 */
    headerRowIdx: number;
    rawText: string;
    hasHeader: boolean;
    fieldMapping: ColumnMapping;
    bulkLandClass: string;
    autoNumber: boolean;
    dupPolicy: DupPolicy;
    preview: PreviewResult | null;
}

interface ImporterEls {
    modal: HTMLElement;
    dropzone: HTMLElement | null;
    fileInput: HTMLInputElement | null;
    fileInfo: HTMLElement | null;
    fileOpts: HTMLElement | null;
    sheetSelect: HTMLSelectElement | null;
    headerRow: HTMLInputElement | null;
    noHeader: HTMLInputElement | null;
    textarea: HTMLTextAreaElement | null;
    hasHeader: HTMLInputElement | null;
    mapGrid: HTMLElement | null;
    bulkLandClass: HTMLSelectElement | null;
    autoNumber: HTMLInputElement | null;
    summary: HTMLElement | null;
    previewBox: HTMLElement | null;
    footerNote: HTMLElement | null;
    importBtn: HTMLButtonElement | null;
    dlErrBtn: HTMLButtonElement | null;
}

function initialState(): ImporterState {
    return {
        mode: 'file',
        fileName: '',
        sheets: {},
        sheetNames: [],
        activeSheet: '',
        headerRowIdx: 0,
        rawText: '',
        hasHeader: true,
        fieldMapping: {},
        bulkLandClass: LAND_CLASS1_DEFAULT,
        autoNumber: true,
        dupPolicy: 'skip',
        preview: null,
    };
}

// ============================================================
// 클래스
// ============================================================
export class SoilResultImporter {
    private _els: ImporterEls | null = null;
    private _built = false;
    private _state: ImporterState = initialState();
    private _escHandler: (e: KeyboardEvent) => void = () => {};

    // ----------------------------------------------------------
    // 빌드 & 바인딩 (lazy)
    // ----------------------------------------------------------
    private _ensureBuilt(): void {
        if (this._built) return;
        injectStyle();
        const modal = buildModal();
        const q = <T extends HTMLElement>(key: string): T | null =>
            modal.querySelector<T>(`[data-el="${key}"]`);
        this._els = {
            modal,
            dropzone: q<HTMLElement>('dropzone'),
            fileInput: q<HTMLInputElement>('fileInput'),
            fileInfo: q<HTMLElement>('fileInfo'),
            fileOpts: q<HTMLElement>('fileOpts'),
            sheetSelect: q<HTMLSelectElement>('sheetSelect'),
            headerRow: q<HTMLInputElement>('headerRow'),
            noHeader: q<HTMLInputElement>('noHeader'),
            textarea: q<HTMLTextAreaElement>('textarea'),
            hasHeader: q<HTMLInputElement>('hasHeader'),
            mapGrid: q<HTMLElement>('mapGrid'),
            bulkLandClass: q<HTMLSelectElement>('bulkLandClass'),
            autoNumber: q<HTMLInputElement>('autoNumber'),
            summary: q<HTMLElement>('summary'),
            previewBox: q<HTMLElement>('previewBox'),
            footerNote: q<HTMLElement>('footerNote'),
            importBtn: modal.querySelector<HTMLButtonElement>('[data-act="import"]'),
            dlErrBtn: modal.querySelector<HTMLButtonElement>('[data-act="dlErrorCsv"]'),
        };
        this._bind();
        this._built = true;
    }

    private _bind(): void {
        const els = this._els;
        if (!els) return;
        const m = els.modal;

        // 액션 버튼 (close/import/automap/pick/dlErrorCsv) — 위임
        m.addEventListener('click', (e) => {
            const target = e.target;
            if (!(target instanceof Element)) return;
            // closest는 모달 조상까지 올라간다 — 모달 밖의 [data-act]에 반응하지 않게 가둔다
            const actEl = target.closest('[data-act]');
            if (!actEl || !m.contains(actEl)) return;
            const act = actEl.getAttribute('data-act');
            if (act === 'close') this.close();
            else if (act === 'import') this._commit();
            else if (act === 'automap') this._autoMap(false);
            else if (act === 'dlErrorCsv') this._downloadErrorCsv();
            else if (act === 'pick') { e.stopPropagation(); els.fileInput?.click(); }
        });
        // 오버레이 클릭 → 닫기 (다이얼로그 내부 클릭은 무시)
        m.addEventListener('mousedown', (e) => { if (e.target === m) this.close(); });

        // 모드 토글
        m.querySelectorAll<HTMLInputElement>('input[name="sriMode"]').forEach((r) => {
            r.addEventListener('change', () => {
                if (r.checked) this._switchMode(r.value === 'paste' ? 'paste' : 'file');
            });
        });

        // 붙여넣기
        els.textarea?.addEventListener('input', () => {
            this._state.rawText = els.textarea?.value ?? '';
            this._refresh();
        });
        els.hasHeader?.addEventListener('change', () => {
            this._state.hasHeader = els.hasHeader?.checked ?? true;
            this._refresh();
        });

        // 파일 선택 / 드래그앤드롭
        els.fileInput?.addEventListener('change', (e) => {
            const input = e.target as HTMLInputElement;
            const f = input.files?.[0];
            if (f) void this._handleFile(f);
            input.value = '';
        });
        const dz = els.dropzone;
        if (dz) {
            dz.addEventListener('dragover', (e) => { e.preventDefault(); dz.classList.add('is-dragover'); });
            dz.addEventListener('dragleave', () => dz.classList.remove('is-dragover'));
            dz.addEventListener('drop', (e) => {
                e.preventDefault();
                dz.classList.remove('is-dragover');
                const f = e.dataTransfer?.files?.[0];
                if (f) void this._handleFile(f);
            });
            dz.addEventListener('click', (e) => {
                const target = e.target;
                // 파일 선택 버튼은 위임 핸들러가 처리한다
                if (target instanceof Element && target.closest('[data-act="pick"]')) return;
                els.fileInput?.click();
            });
            dz.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); els.fileInput?.click(); }
            });
        }

        // 시트 / 헤더 행 / 헤더 없음
        els.sheetSelect?.addEventListener('change', () => {
            this._state.activeSheet = els.sheetSelect?.value ?? '';
            this._refresh();
        });
        els.headerRow?.addEventListener('input', () => {
            const v = Number.parseInt(els.headerRow?.value ?? '', 10);
            if (!Number.isNaN(v) && v >= 1) { this._state.headerRowIdx = v - 1; this._refresh(); }
        });
        els.noHeader?.addEventListener('change', () => {
            if (els.noHeader?.checked) {
                this._state.headerRowIdx = -1;
                if (els.headerRow) els.headerRow.disabled = true;
            } else {
                const v = Number.parseInt(els.headerRow?.value || '1', 10);
                this._state.headerRowIdx = Number.isNaN(v) ? 0 : Math.max(0, v - 1);
                if (els.headerRow) els.headerRow.disabled = false;
            }
            this._refresh();
        });

        // 경지구분 1차 / 옵션
        els.bulkLandClass?.addEventListener('change', () => {
            this._state.bulkLandClass = els.bulkLandClass?.value || LAND_CLASS1_DEFAULT;
            this._syncGongikHighlight();
            this._recompute(); this._renderPreview();
        });
        els.autoNumber?.addEventListener('change', () => {
            this._state.autoNumber = els.autoNumber?.checked ?? true;
            this._refresh();
        });
        m.querySelectorAll<HTMLInputElement>('input[name="sriDup"]').forEach((r) => {
            r.addEventListener('change', () => {
                if (!r.checked) return;
                this._state.dupPolicy = r.value === 'overwrite' ? 'overwrite' : 'skip';
                this._recompute(); this._renderPreview();
            });
        });

        // ESC 닫기
        this._escHandler = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !m.hidden) this.close();
        };
    }

    // ----------------------------------------------------------
    // 열기/닫기
    // ----------------------------------------------------------
    open(): void {
        this._ensureBuilt();
        const els = this._els;
        if (!els) return;
        this._state = initialState();

        // UI 리셋
        if (els.textarea) els.textarea.value = '';
        if (els.hasHeader) els.hasHeader.checked = true;
        if (els.fileInput) els.fileInput.value = '';
        if (els.fileInfo) { els.fileInfo.hidden = true; els.fileInfo.textContent = ''; }
        if (els.fileOpts) els.fileOpts.hidden = true;
        if (els.sheetSelect) els.sheetSelect.textContent = '';
        if (els.headerRow) { els.headerRow.value = '1'; els.headerRow.disabled = false; }
        if (els.noHeader) els.noHeader.checked = false;
        if (els.bulkLandClass) els.bulkLandClass.value = LAND_CLASS1_DEFAULT;
        if (els.autoNumber) els.autoNumber.checked = true;
        els.modal.querySelectorAll<HTMLInputElement>('input[name="sriMode"]')
            .forEach((r) => { r.checked = (r.value === 'file'); });
        els.modal.querySelectorAll<HTMLInputElement>('input[name="sriDup"]')
            .forEach((r) => { r.checked = (r.value === 'skip'); });
        this._switchMode('file');
        this._refresh();

        els.modal.hidden = false;
        document.addEventListener('keydown', this._escHandler);
        // 첫 포커스 → 닫기 버튼 (접근성)
        els.modal.querySelector<HTMLElement>('.sri-close')?.focus();
    }

    close(): void {
        if (!this._els?.modal) return;
        this._els.modal.hidden = true;
        document.removeEventListener('keydown', this._escHandler);
    }

    private _switchMode(mode: 'file' | 'paste'): void {
        const els = this._els;
        if (!els) return;
        if (this._state.mode !== mode) {
            // 모드 전환 시 인덱스 기반 매핑 초기화 (의미가 다름)
            this._state.fieldMapping = {};
        }
        this._state.mode = mode;
        this._applyModeToUi(mode);
        if (mode === 'paste') els.textarea?.focus();
        this._refresh();
    }

    /** 모드에 따른 영역 표시/라벨 활성화 (상태 변경 없음) */
    private _applyModeToUi(mode: 'file' | 'paste'): void {
        const m = this._els?.modal;
        if (!m) return;
        const fileArea = m.querySelector<HTMLElement>('[data-area="file"]');
        const pasteArea = m.querySelector<HTMLElement>('[data-area="paste"]');
        if (fileArea) fileArea.hidden = (mode !== 'file');
        if (pasteArea) pasteArea.hidden = (mode !== 'paste');
        m.querySelectorAll<HTMLElement>('[data-mode-label]').forEach((lbl) => {
            lbl.classList.toggle('active', lbl.getAttribute('data-mode-label') === mode);
        });
    }

    // ----------------------------------------------------------
    // 입력 파싱 (순수 모듈 위임)
    // ----------------------------------------------------------
    private _parseInput(): ParsedTable {
        return this._state.mode === 'file'
            ? parseActiveSheet(this._state.sheets, this._state.activeSheet, this._state.headerRowIdx)
            : parsePasteText(this._state.rawText, this._state.hasHeader);
    }

    // ----------------------------------------------------------
    // 파일 처리
    // ----------------------------------------------------------
    private async _handleFile(file: File): Promise<void> {
        if (!file) return;
        if (file.size > FILE_SIZE_HARD) {
            toast(`파일이 너무 큽니다 (${(file.size / 1048576).toFixed(0)}MB > 50MB 한계).`, 'error');
            return;
        }
        if (file.size > FILE_SIZE_WARN) {
            toast(`파일이 큰 편입니다 (${(file.size / 1048576).toFixed(1)}MB). 처리에 시간이 걸릴 수 있습니다.`, 'warning');
        }
        try {
            const buffer = await file.arrayBuffer();
            const wb = xlsxRead(new Uint8Array(buffer), { type: 'array', cellDates: true });
            if (!wb.SheetNames || wb.SheetNames.length === 0) {
                toast('시트를 찾을 수 없습니다.', 'error');
                return;
            }
            const sheets: Record<string, SheetData> = {};
            const sheetNames: string[] = [];
            for (const name of wb.SheetNames) {
                const ws = wb.Sheets[name];
                const aoa = xlsxUtils.sheet_to_json<unknown[]>(ws, { header: 1, defval: '', blankrows: false });
                const maxCol = aoa.reduce((mx, r) => Math.max(mx, (r ?? []).length), 0);
                sheets[name] = { rows: aoa, maxCol };
                sheetNames.push(name);
            }

            const els = this._els;
            this._state.fileName = file.name;
            this._state.sheets = sheets;
            this._state.sheetNames = sheetNames;
            this._state.activeSheet = sheetNames[0];
            this._state.headerRowIdx = 0;
            this._state.fieldMapping = {};

            // paste 모드에서 파일을 드롭한 경우 file 모드로 전환
            if (this._state.mode !== 'file') {
                this._state.mode = 'file';
                els?.modal.querySelectorAll<HTMLInputElement>('input[name="sriMode"]')
                    .forEach((r) => { r.checked = (r.value === 'file'); });
                this._applyModeToUi('file');
            }

            if (els?.fileInfo) {
                replaceChildrenWith(
                    els.fileInfo,
                    document.createTextNode('📄 '),
                    Object.assign(document.createElement('strong'), { textContent: file.name }),
                    document.createTextNode(` · 시트 ${sheetNames.length}개`),
                );
                els.fileInfo.hidden = false;
            }
            this._renderSheetSelect();
            if (els?.headerRow) { els.headerRow.value = '1'; els.headerRow.disabled = false; }
            if (els?.noHeader) els.noHeader.checked = false;
            if (els?.fileOpts) els.fileOpts.hidden = false;

            this._refresh();
            // 헤더가 있을 때의 편의 — 실패해도 조용히 넘어간다
            this._autoMap(true);
            toast(`✅ ${file.name} 로드 완료 (시트 ${sheetNames.length}개)`, 'success');
        } catch (err) {
            logErr('엑셀 파일 파싱 실패:', err);
            toast('엑셀 파일을 읽을 수 없습니다.', 'error');
        }
    }

    private _renderSheetSelect(): void {
        const sel = this._els?.sheetSelect;
        if (!sel) return;
        sel.textContent = '';
        for (const name of this._state.sheetNames) {
            const opt = document.createElement('option');
            opt.value = name;
            opt.textContent = `${name} (${this._state.sheets[name]?.rows.length ?? 0}행)`;
            sel.appendChild(opt);
        }
        sel.value = this._state.activeSheet;
    }

    // ----------------------------------------------------------
    // 매핑 UI
    // ----------------------------------------------------------
    private _renderMapping(): void {
        const grid = this._els?.mapGrid;
        if (!grid) return;
        const { headers } = this._parseInput();
        const frag = document.createDocumentFragment();

        for (const f of TARGET_FIELDS) {
            const row = div('sri-maprow' + (f.gongik ? ' sri-maprow--gongik' : ''));

            const label = span('sri-maplabel', f.label);
            if (f.optional) label.appendChild(span('sri-opt', ' (선택)'));
            if (f.gongik) label.appendChild(span('sri-gbadge', '공익직불제'));

            const arrow = span('sri-maparrow', '→');

            const select = document.createElement('select');
            select.dataset.fieldKey = f.key;
            select.setAttribute('aria-label', `${f.label} 컬럼 매핑`);
            const emptyOpt = document.createElement('option');
            emptyOpt.value = '-1';
            emptyOpt.textContent = f.optional ? '(비움 · 자동부여)' : '(없음)';
            select.appendChild(emptyOpt);
            headers.forEach((h, i) => {
                const opt = document.createElement('option');
                opt.value = String(i);
                opt.textContent = `${i + 1}열${h ? ` · ${String(h).slice(0, 16)}` : ''}`;
                select.appendChild(opt);
            });
            const cur = this._state.fieldMapping[f.key];
            select.value = (typeof cur === 'number' && cur >= 0) ? String(cur) : '-1';
            select.addEventListener('change', () => {
                const v = Number.parseInt(select.value, 10);
                if (Number.isNaN(v) || v < 0) delete this._state.fieldMapping[f.key];
                else this._state.fieldMapping[f.key] = v;
                this._recompute(); this._renderPreview();
            });

            row.append(label, arrow, select);
            frag.appendChild(row);
        }

        replaceChildrenWith(grid, frag);
        this._syncGongikHighlight();
    }

    /** 경지구분1차='공익직불제'면 매핑 그리드에 gongik-active 토글 */
    private _syncGongikHighlight(): void {
        const grid = this._els?.mapGrid;
        if (!grid) return;
        const active = (this._state.bulkLandClass || LAND_CLASS1_DEFAULT) === '공익직불제';
        grid.classList.toggle('gongik-active', active);
    }

    private _autoMap(silent: boolean): void {
        const { headers } = this._parseInput();
        if (headers.length === 0) {
            if (!silent) toast('먼저 데이터를 입력/업로드하세요.', 'warning');
            return;
        }
        const mapping = computeAutoMapping(headers);
        this._state.fieldMapping = mapping;
        this._renderMapping();
        this._recompute(); this._renderPreview();
        const count = Object.keys(mapping).length;
        if (!silent) toast(`자동 매핑 ${count}건 적용`, count > 0 ? 'success' : 'warning');
    }

    // ----------------------------------------------------------
    // 미리보기 계산 (순수 모듈 위임)
    // ----------------------------------------------------------
    private _refresh(): void {
        this._renderMapping();
        this._recompute();
        this._renderPreview();
    }

    /**
     * 현재 연도 범위의 기존 접수 레코드. 매니저가 아직 없으면 localStorage를 직접 읽는다
     * (모달이 매니저 init보다 먼저 열릴 수 있다).
     */
    private _existingLogs(): ExistingLogLike[] {
        const mgr = getManager();
        if (mgr && Array.isArray(mgr.sampleLogs)) return mgr.sampleLogs;
        try {
            const raw = localStorage.getItem(`${STORAGE_KEY}_${currentYear(mgr)}`);
            const parsed: unknown = raw ? JSON.parse(raw) : [];
            return Array.isArray(parsed) ? (parsed as ExistingLogLike[]) : [];
        } catch {
            return [];
        }
    }

    private _recompute(): void {
        const { rows } = this._parseInput();
        const mgr = getManager();
        const landClass1 = this._state.bulkLandClass || LAND_CLASS1_DEFAULT;
        const logs = this._existingLogs();

        // 일반과 성토(F 접두)는 완전히 분리된 채번이라 양쪽을 다 넘겨야 한다.
        // 한쪽만 넘기면 성토 행 미리보기가 실제 저장 번호와 어긋난다.
        const existing = collectExistingNumbers(logs, landClass1);
        const existingFill = collectExistingNumbers(logs, landClass1, { fill: true });
        const nextNumber = typeof mgr?.getNextNumberForClass === 'function'
            ? mgr.getNextNumberForClass(currentYear(mgr), landClass1)
            : null;
        // 매니저는 'F3' 문자열을 주므로 숫자만 뽑아 커서로 쓴다
        const nextFillNumber = typeof mgr?.generateNextFillReceptionNumber === 'function'
            ? Number.parseInt(mgr.generateNextFillReceptionNumber(landClass1).replace('F', ''), 10)
            : null;

        this._state.preview = computePreview({
            rows,
            mapping: this._state.fieldMapping,
            landClass1,
            autoNumber: this._state.autoNumber,
            dupPolicy: this._state.dupPolicy,
            existing,
            nextNumber,
            existingFill,
            nextFillNumber: Number.isNaN(nextFillNumber) ? null : nextFillNumber,
        });
    }

    // ----------------------------------------------------------
    // 미리보기 렌더
    // ----------------------------------------------------------
    private _renderPreview(): void {
        const els = this._els;
        if (!els?.summary || !els.previewBox) return;
        const { summary, previewBox, importBtn, dlErrBtn, footerNote } = els;

        const p = this._state.preview;
        if (!p) {
            replaceChildrenWith(summary, span('sri-muted', '데이터·컬럼 매핑을 지정하면 미리보기가 표시됩니다.'));
            replaceChildrenWith(previewBox, div('sri-pv-empty', '성명 또는 지번주소 컬럼을 매핑하면 미리보기가 생성됩니다.'));
            if (importBtn) { importBtn.disabled = true; importBtn.textContent = '📥 가져오기'; }
            if (dlErrBtn) { dlErrBtn.hidden = true; dlErrBtn.textContent = '⚠️ 오류 행 CSV'; }
            if (footerNote) footerNote.textContent = '';
            return;
        }

        replaceChildrenWith(
            summary,
            span('sri-pill new', `✅ 신규 ${p.stats.new}`),
            span('sri-pill dup', `⚠️ 중복 ${p.stats.dup}`),
            span('sri-pill err', `⛔ 오류 ${p.stats.err}`),
        );

        const shown = p.items.slice(0, PREVIEW_ROW_LIMIT);
        if (shown.length === 0) {
            replaceChildrenWith(previewBox, div('sri-pv-empty', '표시할 행이 없습니다.'));
        } else {
            const table = document.createElement('table');
            table.className = 'sri-pv-table';

            const thead = document.createElement('thead');
            const headRow = document.createElement('tr');
            for (const label of PREVIEW_COLUMNS) {
                const th = document.createElement('th');
                th.textContent = label;
                headRow.appendChild(th);
            }
            thead.appendChild(headRow);

            const tbody = document.createElement('tbody');
            for (const it of shown) {
                tbody.appendChild(this._previewRow(it, p.landClass1));
            }
            table.append(thead, tbody);

            const wrap = div('sri-pv-wrap');
            wrap.appendChild(table);

            const nodes: Node[] = [wrap];
            if (p.items.length > PREVIEW_ROW_LIMIT) {
                nodes.push(div(
                    'sri-pv-overflow',
                    `… 외 ${p.items.length - PREVIEW_ROW_LIMIT}건 (전체 ${p.items.length}건은 가져오기 시 모두 처리)`,
                ));
            }
            replaceChildrenWith(previewBox, ...nodes);
        }

        if (importBtn) {
            importBtn.disabled = p.willImport === 0;
            importBtn.textContent = p.willImport > 0 ? `📥 ${p.willImport}건 가져오기` : '📥 가져오기';
        }
        if (dlErrBtn) {
            dlErrBtn.hidden = p.stats.err === 0;
            dlErrBtn.textContent = p.stats.err > 0
                ? `⚠️ 오류 행 CSV (${p.stats.err}건)`
                : '⚠️ 오류 행 CSV';
        }
        if (footerNote) {
            footerNote.textContent = `총 ${p.stats.total}건 중 ${p.willImport}건이 [${p.landClass1}]으로 등록됩니다`;
        }
    }

    /** 미리보기 표의 한 행 — 모든 셀이 textContent라 이스케이프가 필요 없다 */
    private _previewRow(it: PreviewItem, landClass1: string): HTMLTableRowElement {
        const r = it.rec;
        const tr = document.createElement('tr');
        if (it.status === 'dup') tr.className = 'is-dup';
        else if (it.status === 'err') tr.className = 'is-err';

        const statusCell = document.createElement('td');
        statusCell.appendChild(span(
            `sri-status ${it.status}`,
            STATUS_LABEL[it.status] + (it.skip ? ' · 건너뜀' : ''),
        ));
        tr.appendChild(statusCell);

        const cells: Array<[string, string?]> = [
            [it.display],
            [r.name],
            [r.phoneNumber],
            [r.lotAddress, 'addr'],
            [r.cropsDisplay],
            [r.area],
            [landClass1],
            [r.subCategory],
            [r.purpose],
            [r.note],
        ];
        for (const [text, cls] of cells) {
            const td = document.createElement('td');
            if (cls) td.className = cls;
            td.textContent = text ?? '';
            tr.appendChild(td);
        }
        return tr;
    }

    // ----------------------------------------------------------
    // 저장 커밋
    // ----------------------------------------------------------
    private _commit(): void {
        const p = this._state.preview;
        if (!p) return;
        const mgr = getManager();
        if (!mgr || typeof mgr.addImportedRecord !== 'function') {
            toast('접수 매니저가 준비되지 않았습니다. 잠시 후 다시 시도하세요.', 'error');
            return;
        }

        // 루프는 행마다 저장+재렌더를 하므로 수백 행이면 수 초간 동기 실행된다.
        // 그 사이 들어온 두 번째 클릭이 큐에 남으면 전량이 두 번 등록되므로 먼저 잠근다.
        const importBtn = this._els?.importBtn ?? null;
        if (importBtn) importBtn.disabled = true;

        let applied = 0;
        let failed = 0;
        for (const it of p.items) {
            if (it.status === 'err') continue;
            if (it.status === 'dup' && it.skip) continue;
            try {
                const rec: PreviewRecord = { ...it.rec };
                // 자동부여 행은 receptionNumber를 비워 매니저가 채번하게 한다
                if (it.auto) delete rec.receptionNumber;
                mgr.addImportedRecord(rec);
                applied++;
            } catch (err) {
                failed++;
                logErr('가져오기 레코드 저장 실패:', err, it.rec);
            }
        }

        const parts = [`✅ ${applied}건 가져오기 완료`];
        if (p.stats.dup > 0) parts.push(`중복 ${p.stats.dup}건`);
        if (p.stats.err > 0) parts.push(`오류 ${p.stats.err}건`);
        if (failed > 0) parts.push(`실패 ${failed}건`);
        toast(parts.join(' · '), failed > 0 ? 'warning' : 'success');
        this.close();
    }

    // ----------------------------------------------------------
    // 오류 행 CSV 다운로드
    // ----------------------------------------------------------
    private _downloadErrorCsv(): void {
        const errs = (this._state.preview?.items ?? []).filter((it) => it.status === 'err');
        if (errs.length === 0) return;

        const csv = buildCsv(
            ERROR_CSV_HEADER,
            errs.map((it) => [
                it.rec.name, it.rec.phoneNumber, it.rec.lotAddress, it.rec.cropsDisplay,
                it.rec.area, it.rec.subCategory, it.rec.purpose, it.reason,
            ]),
        );
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        const a = document.createElement('a');
        a.href = url;
        a.download = `가져오기_오류행_${dateStr}.csv`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast(`오류 행 ${errs.length}건을 CSV로 저장했습니다.`, 'success');
    }
}

// ============================================================
// 싱글턴 노출 + 버튼 연결
// ============================================================
const instance = new SoilResultImporter();
w().SoilResultImporter = instance;

function attachOpenButton(): void {
    const btn = document.getElementById('soilImportBtn');
    if (!btn || btn.dataset.sriBound === '1') return;
    btn.dataset.sriBound = '1';
    btn.addEventListener('click', (e) => {
        e.preventDefault();
        instance.open();
    });
}

// 로드 시 1회: 교차 필드 중복 키워드가 있으면 콘솔 경고(개발 보조)
auditDuplicateKeywords();

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachOpenButton);
} else {
    attachOpenButton();
}

export default instance;
