/**
 * @fileoverview 엑셀/붙여넣기 입력 → 표(headers + rows) 파싱 (순수 로직, DOM 비의존)
 *
 * 메인 프로젝트 `src/soil/soil-result-importer.js`의 `_parsePaste`/`_parseFile`/`_normalizeCell`을
 * TS로 포팅한다 (SAMPL-1-124 Phase B-1).
 *
 * 메인은 이 로직이 `class SoilResultImporter`의 메서드로 `this._state`를 직접 읽었다.
 * 여기서는 필요한 값만 인자로 받는 순수 함수로 추출해 모달 없이 단위 테스트할 수 있게 한다
 * (모달은 이 함수들을 호출만 한다 — Phase B-2).
 */

/** 파싱 결과: 헤더 1행 + 데이터 행들, 열 수는 maxCol로 정렬된다 */
export interface ParsedTable {
    headers: string[];
    rows: string[][];
    maxCol: number;
}

/** 엑셀 시트 1장 (XLSX.utils.sheet_to_json({header:1}) 결과) */
export interface SheetData {
    rows: unknown[][];
    maxCol: number;
}

const EMPTY_TABLE: ParsedTable = { headers: [], rows: [], maxCol: 0 };

/**
 * 셀 값을 문자열로 정규화한다.
 *
 * 엑셀은 날짜 셀을 `Date`로 넘기므로(XLSX `cellDates: true`) `YYYY-MM-DD`로 고정한다.
 * 그러지 않으면 `String(date)`가 로케일 의존 문자열(`Mon Aug 11 2026 ...`)이 되어
 * 접수일자 필드에 그대로 들어간다.
 */
export function normalizeCell(value: unknown): string {
    if (value == null) return '';
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
        const y = value.getFullYear();
        const mo = String(value.getMonth() + 1).padStart(2, '0');
        const d = String(value.getDate()).padStart(2, '0');
        return `${y}-${mo}-${d}`;
    }
    return String(value);
}

/** 행을 maxCol 길이로 맞춘다 (부족하면 빈 문자열 채움, 넘치면 자름) */
function padRow(row: readonly string[], maxCol: number): string[] {
    const padded = row.slice();
    while (padded.length < maxCol) padded.push('');
    return padded.slice(0, maxCol);
}

/** 헤더가 없을 때 쓰는 자리표시 이름 (`열 1`, `열 2`, …) */
function placeholderHeaders(maxCol: number): string[] {
    return Array.from({ length: maxCol }, (_, i) => `열 ${i + 1}`);
}

/**
 * 탭 구분 붙여넣기 텍스트 → 표.
 *
 * 엑셀에서 범위를 복사하면 열이 탭, 행이 개행으로 구분된다.
 * 빈 줄은 버리고, 열 수는 가장 긴 행에 맞춰 정렬한다.
 *
 * @param text 붙여넣은 원문
 * @param hasHeader 첫 줄을 헤더로 볼지 여부
 */
export function parsePasteText(text: string | null | undefined, hasHeader: boolean): ParsedTable {
    const raw = text ?? '';
    if (!raw.trim()) return { ...EMPTY_TABLE };

    const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
    const split = lines.map((l) => l.split('\t'));
    const maxCol = split.reduce((mx, r) => Math.max(mx, r.length), 0);

    let headers: string[];
    let rows: string[][];
    if (hasHeader && split.length > 0) {
        headers = split[0].slice();
        rows = split.slice(1);
    } else {
        headers = placeholderHeaders(maxCol);
        rows = split;
    }

    return {
        headers: padRow(headers, maxCol),
        rows: rows.map((r) => padRow(r, maxCol)),
        maxCol,
    };
}

/**
 * 엑셀 시트 → 표.
 *
 * `headerRowIdx`가 유효 범위면 그 행을 헤더로 쓰고 이후 행을 데이터로 본다.
 * 범위 밖(예: `-1` = 헤더 없음)이면 자리표시 헤더를 만들고 전체를 데이터로 쓴다.
 *
 * 붙여넣기와 달리 **전부 빈 행은 버린다** — 엑셀 시트에는 서식만 있는 빈 행이 흔하고,
 * 그것을 남기면 미리보기와 등록 건수가 실제와 어긋난다.
 */
export function parseSheetRows(
    sheet: SheetData | null | undefined,
    headerRowIdx: number,
): ParsedTable {
    if (!sheet || !sheet.rows || sheet.rows.length === 0) return { ...EMPTY_TABLE };

    const allRows = sheet.rows;
    const maxCol = sheet.maxCol;

    let headerSource: unknown[];
    let dataRows: unknown[][];
    if (headerRowIdx >= 0 && headerRowIdx < allRows.length) {
        headerSource = allRows[headerRowIdx] ?? [];
        dataRows = allRows.slice(headerRowIdx + 1);
    } else {
        headerSource = placeholderHeaders(maxCol);
        dataRows = allRows;
    }

    const rows = dataRows
        .map((r) => padRow((r ?? []).map((c) => normalizeCell(c)), maxCol))
        .filter((r) => r.some((c) => c !== ''));

    return {
        headers: padRow(headerSource.map((c) => normalizeCell(c)), maxCol),
        rows,
        maxCol,
    };
}

/**
 * 시트 이름 → SheetData 맵에서 활성 시트를 꺼내 파싱한다.
 * 활성 시트 이름이 없거나 맵에 없으면 빈 표를 돌려준다.
 */
export function parseActiveSheet(
    sheets: Record<string, SheetData> | null | undefined,
    activeSheet: string | null | undefined,
    headerRowIdx: number,
): ParsedTable {
    if (!sheets || !activeSheet) return { ...EMPTY_TABLE };
    return parseSheetRows(sheets[activeSheet], headerRowIdx);
}
