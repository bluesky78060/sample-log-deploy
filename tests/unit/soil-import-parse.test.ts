/**
 * @fileoverview 엑셀/붙여넣기 입력 파싱 단위 테스트 (SAMPL-1-124 Phase B-1)
 *
 * 메인 프로젝트에는 이 계층의 테스트가 없다(`_parsePaste`/`_parseFile`이 모달 메서드라
 * 상태 없이 호출할 수 없었기 때문). 순수 함수로 추출한 덕에 처음으로 검증한다.
 */
import { describe, it, expect } from 'vitest';
import {
    normalizeCell,
    parsePasteText,
    parseSheetRows,
    parseActiveSheet,
    type SheetData,
} from '../../src/soil/soil-import-parse';

describe('normalizeCell', () => {
    it('null/undefined → 빈 문자열', () => {
        expect(normalizeCell(null)).toBe('');
        expect(normalizeCell(undefined)).toBe('');
    });

    it('Date → YYYY-MM-DD (로케일 문자열이 새지 않는다)', () => {
        // 엑셀은 cellDates:true에서 날짜 셀을 Date로 넘긴다.
        // String(date)를 쓰면 'Mon Aug 11 2026 ...'이 접수일자에 들어간다.
        expect(normalizeCell(new Date(2026, 7, 11))).toBe('2026-08-11');
        expect(normalizeCell(new Date(2026, 0, 5))).toBe('2026-01-05'); // 한 자리 월·일 zero-pad
    });

    it('잘못된 Date는 문자열로 폴백 (NaN 시각)', () => {
        expect(normalizeCell(new Date('invalid'))).toContain('Invalid');
    });

    it('숫자·불리언·문자열은 String() 결과', () => {
        expect(normalizeCell(0)).toBe('0');
        expect(normalizeCell(1234)).toBe('1234');
        expect(normalizeCell(false)).toBe('false');
        expect(normalizeCell('  값  ')).toBe('  값  '); // trim하지 않는다
    });
});

describe('parsePasteText', () => {
    it('탭 구분 + 헤더 있음', () => {
        const t = parsePasteText('성명\t연락처\n홍길동\t010-1111-2222', true);
        expect(t.headers).toEqual(['성명', '연락처']);
        expect(t.rows).toEqual([['홍길동', '010-1111-2222']]);
        expect(t.maxCol).toBe(2);
    });

    it('헤더 없음 → 자리표시 헤더(열 N), 전체가 데이터', () => {
        const t = parsePasteText('홍길동\t010\n김철수\t011', false);
        expect(t.headers).toEqual(['열 1', '열 2']);
        expect(t.rows).toHaveLength(2);
    });

    it('행마다 열 수가 달라도 maxCol로 정렬 (짧은 행은 빈칸 채움)', () => {
        const t = parsePasteText('a\tb\tc\nx\ny\tz', false);
        expect(t.maxCol).toBe(3);
        expect(t.rows[1]).toEqual(['x', '', '']);
        expect(t.rows[2]).toEqual(['y', 'z', '']);
        expect(t.headers).toHaveLength(3);
    });

    it('빈 줄은 버린다 (CRLF 포함)', () => {
        const t = parsePasteText('a\tb\r\n\r\nx\ty\n', true);
        expect(t.rows).toEqual([['x', 'y']]);
    });

    it('빈 입력·공백만 → 빈 표', () => {
        expect(parsePasteText('', true)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parsePasteText('   \n  ', true)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parsePasteText(null, true)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parsePasteText(undefined, false)).toEqual({ headers: [], rows: [], maxCol: 0 });
    });

    it('헤더만 있고 데이터가 없으면 rows는 빈 배열', () => {
        const t = parsePasteText('성명\t연락처', true);
        expect(t.headers).toEqual(['성명', '연락처']);
        expect(t.rows).toEqual([]);
    });

    it('붙여넣기는 빈 행을 필터하지 않는다 (엑셀 시트와 다른 동작)', () => {
        // 개행으로 만들어진 빈 줄은 위에서 걸러지지만, 탭만 있는 줄은 데이터로 남는다
        const t = parsePasteText('a\tb\n\t', false);
        expect(t.rows).toEqual([['a', 'b'], ['', '']]);
    });
});

describe('parseSheetRows', () => {
    const sheet = (rows: unknown[][]): SheetData => ({
        rows,
        maxCol: rows.reduce((mx, r) => Math.max(mx, (r ?? []).length), 0),
    });

    it('headerRowIdx=0 → 첫 행이 헤더', () => {
        const t = parseSheetRows(sheet([['성명', '면적'], ['홍길동', 1000]]), 0);
        expect(t.headers).toEqual(['성명', '면적']);
        expect(t.rows).toEqual([['홍길동', '1000']]); // 숫자가 문자열로 정규화된다
    });

    it('headerRowIdx가 0보다 큰 경우 — 그 위 행들은 버려진다', () => {
        const t = parseSheetRows(sheet([['제목행'], ['성명', '면적'], ['홍길동', 500]]), 1);
        expect(t.headers).toEqual(['성명', '면적']);
        expect(t.rows).toEqual([['홍길동', '500']]);
    });

    it('headerRowIdx=-1(헤더 없음) → 자리표시 헤더 + 전체가 데이터', () => {
        const t = parseSheetRows(sheet([['홍길동', 1], ['김철수', 2]]), -1);
        expect(t.headers).toEqual(['열 1', '열 2']);
        expect(t.rows).toHaveLength(2);
    });

    it('범위를 넘는 headerRowIdx도 헤더 없음으로 처리', () => {
        const t = parseSheetRows(sheet([['a'], ['b']]), 99);
        expect(t.headers).toEqual(['열 1']);
        expect(t.rows).toHaveLength(2);
    });

    it('전부 빈 행은 버린다 (엑셀 서식만 있는 행)', () => {
        const t = parseSheetRows(sheet([['성명'], ['홍길동'], [''], [null], ['김철수']]), 0);
        expect(t.rows).toEqual([['홍길동'], ['김철수']]);
    });

    it('일부만 채워진 행은 남긴다', () => {
        const t = parseSheetRows(sheet([['성명', '면적'], ['홍길동', ''], ['', 100]]), 0);
        expect(t.rows).toEqual([['홍길동', ''], ['', '100']]);
    });

    it('Date 셀이 YYYY-MM-DD로 들어간다', () => {
        const t = parseSheetRows(sheet([['접수일자'], [new Date(2026, 7, 11)]]), 0);
        expect(t.rows).toEqual([['2026-08-11']]);
    });

    it('헤더 행이 데이터보다 짧아도 maxCol로 정렬', () => {
        const t = parseSheetRows(sheet([['성명'], ['홍길동', '추가값']]), 0);
        expect(t.maxCol).toBe(2);
        expect(t.headers).toEqual(['성명', '']);
        expect(t.rows).toEqual([['홍길동', '추가값']]);
    });

    it('빈 시트·null → 빈 표', () => {
        expect(parseSheetRows(null, 0)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parseSheetRows(undefined, 0)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parseSheetRows({ rows: [], maxCol: 0 }, 0)).toEqual({ headers: [], rows: [], maxCol: 0 });
    });
});

describe('parseActiveSheet', () => {
    const sheets: Record<string, SheetData> = {
        '시트1': { rows: [['성명'], ['홍길동']], maxCol: 1 },
        '시트2': { rows: [['면적'], ['1000']], maxCol: 1 },
    };

    it('활성 시트를 골라 파싱', () => {
        expect(parseActiveSheet(sheets, '시트2', 0).headers).toEqual(['면적']);
    });

    it('활성 시트 미지정·미존재 → 빈 표', () => {
        expect(parseActiveSheet(sheets, null, 0)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parseActiveSheet(sheets, '없는시트', 0)).toEqual({ headers: [], rows: [], maxCol: 0 });
        expect(parseActiveSheet(null, '시트1', 0)).toEqual({ headers: [], rows: [], maxCol: 0 });
    });
});
