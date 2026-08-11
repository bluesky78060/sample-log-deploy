/**
 * @fileoverview 오류 행 CSV 직렬화 단위 테스트 (SAMPL-1-124 리뷰 M-3)
 *
 * CSV 인젝션 방어와 BOM은 보안·호환성 방어다. 메인에서는 모달 메서드 안의
 * 지역 함수여서 테스트가 불가능했고, 셀 하나를 잘못 고쳐도 아무도 몰랐다.
 */
import { describe, it, expect } from 'vitest';
import { csvCell, csvRow, buildCsv, ERROR_CSV_HEADER } from '../../src/soil/soil-import-csv';

const BOM = '﻿';

describe('csvCell — CSV 인젝션 방지', () => {
    it('수식 시작 문자로 시작하면 작은따옴표를 앞에 붙인다', () => {
        expect(csvCell('=1+1')).toBe("'=1+1");
        expect(csvCell('+1')).toBe("'+1");
        expect(csvCell('@SUM(A1)')).toBe("'@SUM(A1)");
        expect(csvCell('|calc')).toBe("'|calc");
    });

    it("실제 공격 페이로드 =cmd|'/c calc'!A1 을 무력화한다", () => {
        // 콤마가 없어 인용부호로 감싸이지 않으므로 접두 따옴표만 붙는다
        const out = csvCell("=cmd|'/c calc'!A1");
        expect(out.startsWith("'=")).toBe(true);
    });

    it('음수처럼 보이는 값도 - 로 시작하면 접두된다 (수식 해석 방지가 우선)', () => {
        expect(csvCell('-500')).toBe("'-500");
    });

    it('선행 탭·CR로 가드를 우회할 수 없다 (적대적 검증 발견)', () => {
        // 엑셀은 셀 앞의 탭/CR을 버리고 그 뒤를 수식으로 읽는다.
        // 첫 글자만 보면 이 값들이 방어를 그대로 통과한다 — 탭은 인용 트리거도 아니라 무가공으로 나간다.
        expect(csvCell("\t=cmd|'/c calc'!A1")).toBe("'\t=cmd|'/c calc'!A1");
        expect(csvCell('\r=1+1')).toBe('"\'\r=1+1"'); // CR은 인용까지 적용된다
        expect(csvCell('\n=1+1')).toBe('"\'\n=1+1"');
    });

    it('선행 공백·NBSP도 벗긴 뒤 판정한다', () => {
        expect(csvCell('  =1+1')).toBe("'  =1+1");
        expect(csvCell(' =1+1')).toBe("' =1+1");
    });

    it('선행 공백만 있고 수식이 아니면 접두하지 않는다', () => {
        expect(csvCell('  홍길동')).toBe('  홍길동');
        expect(csvCell('\t벼')).toBe('\t벼');
    });

    it('중간에 나오는 수식 문자는 건드리지 않는다', () => {
        expect(csvCell('홍길동=대표')).toBe('홍길동=대표');
        expect(csvCell('010-1234-5678')).toBe('010-1234-5678');
    });
});

describe('csvCell — RFC 4180 인용', () => {
    it('콤마가 있으면 큰따옴표로 감싼다', () => {
        expect(csvCell('봉화읍, 내성리')).toBe('"봉화읍, 내성리"');
    });

    it('큰따옴표는 두 개로 이스케이프하고 감싼다', () => {
        expect(csvCell('그는 "벼"라고 했다')).toBe('"그는 ""벼""라고 했다"');
    });

    it('개행(LF/CRLF)이 있으면 감싼다', () => {
        expect(csvCell('첫줄\n둘째줄')).toBe('"첫줄\n둘째줄"');
        expect(csvCell('첫줄\r\n둘째줄')).toBe('"첫줄\r\n둘째줄"');
    });

    it('인젝션 접두와 인용이 함께 적용된다', () => {
        // 접두 따옴표가 인용 안쪽에 들어가야 한다 (순서가 뒤바뀌면 방어가 무력화된다)
        expect(csvCell('=A1,B2')).toBe('"\'=A1,B2"');
    });

    it('평범한 값은 그대로 둔다', () => {
        expect(csvCell('홍길동')).toBe('홍길동');
        expect(csvCell(1200)).toBe('1200');
    });

    it('null·undefined·빈 값은 빈 문자열', () => {
        expect(csvCell(null)).toBe('');
        expect(csvCell(undefined)).toBe('');
        expect(csvCell('')).toBe('');
    });
});

describe('csvRow', () => {
    it('셀마다 이스케이프한 뒤 콤마로 잇는다', () => {
        expect(csvRow(['홍길동', '봉화읍, 내성리', '=1'])).toBe('홍길동,"봉화읍, 내성리",\'=1');
    });

    it('빈 배열은 빈 문자열', () => {
        expect(csvRow([])).toBe('');
    });
});

describe('buildCsv', () => {
    it('BOM으로 시작한다 (없으면 엑셀에서 한글이 깨진다)', () => {
        const csv = buildCsv(['성명'], [['홍길동']]);
        expect(csv.startsWith(BOM)).toBe(true);
        expect(csv.charCodeAt(0)).toBe(0xfeff);
    });

    it('행을 CRLF로 잇는다', () => {
        const csv = buildCsv(['a', 'b'], [['1', '2'], ['3', '4']]);
        expect(csv).toBe(`${BOM}a,b\r\n1,2\r\n3,4`);
    });

    it('데이터 행이 없으면 헤더만', () => {
        expect(buildCsv(['a', 'b'], [])).toBe(`${BOM}a,b`);
    });

    it('오류 행 CSV 헤더는 8열이고 메인과 순서가 같다', () => {
        expect(ERROR_CSV_HEADER).toEqual([
            '성명', '연락처', '지번주소', '작물', '면적', '구분', '목적', '오류사유',
        ]);
    });

    it('실제 오류 행 모양 — 위험한 값이 섞여도 열이 밀리지 않는다', () => {
        const csv = buildCsv(ERROR_CSV_HEADER, [
            ['=cmd|calc', '010-1111-2222', '봉화읍, 내성리', '벼', '1200', '논', '일반재배', '성명·주소 없음'],
        ]);
        const lines = csv.slice(BOM.length).split('\r\n');
        expect(lines).toHaveLength(2);
        // 인용된 주소 안의 콤마가 열 구분자로 새지 않는다
        expect(lines[1]).toBe('\'=cmd|calc,010-1111-2222,"봉화읍, 내성리",벼,1200,논,일반재배,성명·주소 없음');
    });
});
