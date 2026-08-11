/**
 * @fileoverview 가져오기 미리보기 계산 단위 테스트 (SAMPL-1-124 Phase B-2)
 *
 * 메인 프로젝트에는 이 계층 테스트가 없다 — `_existingNumbers`/`_recompute`가
 * `window.soilManager`와 `localStorage`를 직접 읽는 모달 메서드였기 때문이다.
 * 인자로 받는 순수 함수로 추출한 덕에 중복 판정·자동부여 경계를 처음 검증한다.
 */
import { describe, it, expect } from 'vitest';
import {
    collectExistingNumbers,
    computePreview,
    type ExistingLogLike,
} from '../../src/soil/soil-import-preview';

// 표준 매핑: 접수번호 0 / 성명 1 / 지번주소 2
const MAP = { receptionNumber: 0, name: 1, lotAddress: 2 };

describe('collectExistingNumbers', () => {
    const logs: ExistingLogLike[] = [
        { receptionNumber: '5', landClass1: '농가의뢰' },
        { receptionNumber: '6-1', landClass1: '농가의뢰' },        // 서브넘버 → 기본번호로 접힘
        { receptionNumber: '7', landClass1: '공익직불제' },         // 다른 경지구분 → 제외
        { receptionNumber: '8', landClass1: '농가의뢰', subCategory: '성토' }, // 성토 → 제외
        { receptionNumber: 'F9', landClass1: '농가의뢰' },          // F 접두 → 제외
        { receptionNumber: 10, landClass1: '농가의뢰' },            // 숫자형도 처리
    ];

    it('같은 경지구분1차만 모으고 서브넘버는 기본번호로 접는다', () => {
        const s = collectExistingNumbers(logs, '농가의뢰');
        expect([...s].sort()).toEqual(['10', '5', '6']);
    });

    it('성토·F접두를 제외한다 (매니저 getNextNumberForClass와 같은 조건)', () => {
        const s = collectExistingNumbers(logs, '농가의뢰');
        expect(s.has('8')).toBe(false);  // 성토
        expect(s.has('F9')).toBe(false); // F 접두
        expect(s.has('9')).toBe(false);
    });

    it('landClass1이 없으면 기본값(농가의뢰)으로 간주', () => {
        const s = collectExistingNumbers([{ receptionNumber: '3' }], '농가의뢰');
        expect(s.has('3')).toBe(true);
    });

    it('다른 경지구분으로 조회하면 해당 것만', () => {
        expect([...collectExistingNumbers(logs, '공익직불제')]).toEqual(['7']);
    });

    it('빈 입력·null·접수번호 없는 레코드', () => {
        expect(collectExistingNumbers([], '농가의뢰').size).toBe(0);
        expect(collectExistingNumbers(null, '농가의뢰').size).toBe(0);
        expect(collectExistingNumbers(undefined, '농가의뢰').size).toBe(0);
        expect(collectExistingNumbers([{ receptionNumber: '' }, {} as ExistingLogLike], '농가의뢰').size).toBe(0);
    });
});

describe('computePreview — 미리보기를 만들 수 없는 조건', () => {
    it('데이터 행이 없으면 null', () => {
        expect(computePreview({ rows: [], mapping: MAP })).toBeNull();
    });

    it('매핑이 없으면 null', () => {
        expect(computePreview({ rows: [['1', '홍길동', '주소']], mapping: {} })).toBeNull();
    });

    it('식별 필드(성명·주소·접수번호)가 하나도 매핑되지 않으면 null', () => {
        // 작물·면적만 매핑 → 어떤 행인지 식별 불가
        expect(computePreview({ rows: [['벼', '1000']], mapping: { cropsDisplay: 0, area: 1 } })).toBeNull();
    });

    it('성명만 매핑돼도 미리보기가 만들어진다', () => {
        const r = computePreview({ rows: [['홍길동']], mapping: { name: 0 } });
        expect(r).not.toBeNull();
        expect(r!.stats.total).toBe(1);
    });
});

describe('computePreview — 오류 행', () => {
    it('성명·주소 모두 비면 err', () => {
        const r = computePreview({ rows: [['1', '', '']], mapping: MAP })!;
        expect(r.stats.err).toBe(1);
        expect(r.items[0].status).toBe('err');
        expect(r.items[0].reason).toBe('성명·주소 없음');
        expect(r.items[0].display).toBe('(빈 행)');
        expect(r.willImport).toBe(0);
    });

    it('주소만 있어도 유효한 행', () => {
        const r = computePreview({ rows: [['1', '', '봉화읍 내성리']], mapping: MAP })!;
        expect(r.stats.err).toBe(0);
        expect(r.stats.new).toBe(1);
    });
});

describe('computePreview — 중복 판정 (수동 접수번호)', () => {
    const existing = new Set(['5', '6']);

    it('기존과 겹치면 dup, 건너뛰기 정책이면 skip=true', () => {
        const r = computePreview({
            rows: [['5', '홍길동', '주소']], mapping: MAP, existing, dupPolicy: 'skip',
        })!;
        expect(r.items[0].status).toBe('dup');
        expect(r.items[0].skip).toBe(true);
        expect(r.willImport).toBe(0); // 등록되지 않는다
    });

    it('덮어쓰기 정책이면 skip=false이고 등록 건수에 포함', () => {
        const r = computePreview({
            rows: [['5', '홍길동', '주소']], mapping: MAP, existing, dupPolicy: 'overwrite',
        })!;
        expect(r.items[0].status).toBe('dup');
        expect(r.items[0].skip).toBe(false);
        expect(r.willImport).toBe(1);
    });

    it('서브넘버는 기본번호로 중복 판정 (5-1은 5와 충돌)', () => {
        const r = computePreview({
            rows: [['5-1', '홍길동', '주소']], mapping: MAP, existing,
        })!;
        expect(r.items[0].status).toBe('dup');
        expect(r.items[0].display).toBe('5-1'); // 표시는 원문 유지
        expect(r.items[0].rec.receptionNumber).toBe('5-1');
    });

    it('배치 안에서 같은 번호가 두 번 나오면 두 번째가 dup', () => {
        const r = computePreview({
            rows: [['9', 'A', '주소'], ['9', 'B', '주소']], mapping: MAP, existing,
        })!;
        expect(r.items[0].status).toBe('new');
        expect(r.items[1].status).toBe('dup');
        expect(r.stats.new).toBe(1);
        expect(r.stats.dup).toBe(1);
    });

    it('기존에 없는 번호는 new', () => {
        const r = computePreview({ rows: [['99', '홍길동', '주소']], mapping: MAP, existing })!;
        expect(r.items[0].status).toBe('new');
        expect(r.items[0].rec.receptionNumber).toBe('99');
        expect(r.items[0].auto).toBeUndefined();
    });
});

describe('computePreview — 접수번호 자동부여', () => {
    it('autoNumber=true면 매핑을 무시하고 순번을 부여한다', () => {
        const r = computePreview({
            rows: [['5', 'A', '주소'], ['6', 'B', '주소']],
            mapping: MAP, autoNumber: true, existing: new Set(['5', '6']), nextNumber: 7,
        })!;
        expect(r.items.map((i) => i.display)).toEqual(['7', '8']);
        expect(r.items.every((i) => i.auto === true)).toBe(true);
        expect(r.stats.new).toBe(2);
        expect(r.stats.dup).toBe(0);
    });

    it('자동부여는 기존 번호를 건너뛴다', () => {
        const r = computePreview({
            rows: [['A'], ['B'], ['C']], mapping: { name: 0 },
            existing: new Set(['3', '4']), nextNumber: 3,
        })!;
        expect(r.items.map((i) => i.display)).toEqual(['5', '6', '7']);
    });

    it('접수번호 컬럼이 매핑되지 않으면 자동부여가 강제된다', () => {
        const r = computePreview({
            rows: [['홍길동', '주소']], mapping: { name: 0, lotAddress: 1 }, nextNumber: 10,
        })!;
        expect(r.items[0].display).toBe('10');
        expect(r.items[0].auto).toBe(true);
    });

    it('nextNumber 미지정 시 existing 최대값 + 1', () => {
        const r = computePreview({
            rows: [['A']], mapping: { name: 0 }, existing: new Set(['7', '12', '3']),
        })!;
        expect(r.items[0].display).toBe('13');
    });

    it('existing이 비고 nextNumber도 없으면 1부터', () => {
        const r = computePreview({ rows: [['A'], ['B']], mapping: { name: 0 } })!;
        expect(r.items.map((i) => i.display)).toEqual(['1', '2']);
    });

    it('매핑은 있으나 그 칸이 빈 행은 자동부여로 넘어간다', () => {
        const r = computePreview({
            rows: [['5', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(), nextNumber: 100,
        })!;
        expect(r.items[0].status).toBe('new');
        expect(r.items[0].display).toBe('5');      // 수동
        expect(r.items[0].auto).toBeUndefined();
        expect(r.items[1].display).toBe('100');    // 자동
        expect(r.items[1].auto).toBe(true);
    });

    it("빈 칸 자동부여가 문자열 'null'을 만들지 않는다 (메인 결함 회귀)", () => {
        // 메인은 접수번호 컬럼이 매핑된 경우 nextNum을 초기화하지 않아
        // 빈 칸 행에서 String(null) → 접수번호가 문자열 'null'이 됐다.
        const r = computePreview({
            rows: [['', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['1', '2']), // nextNumber 미지정
        })!;
        expect(r.items.map((i) => i.display)).toEqual(['3', '4']);
        expect(r.items.some((i) => i.display === 'null')).toBe(false);
    });

    it('자동부여 행의 rec에는 receptionNumber를 넣지 않는다 (매니저가 채번한다)', () => {
        const r = computePreview({ rows: [['A']], mapping: { name: 0 }, nextNumber: 5 })!;
        expect(r.items[0].rec.receptionNumber).toBeUndefined();
    });
});

describe('computePreview — 수동 번호와 자동부여가 섞인 배치', () => {
    // 매니저의 addImportedRecord는 레코드마다 max+1로 다시 채번한다.
    // 따라서 수동 번호가 먼저 저장되면 뒤따르는 자동부여 번호가 그 위로 올라간다.
    // 미리보기가 이를 반영하지 않으면 사용자가 본 번호와 대장에 들어간 번호가 달라진다.

    it('수동 번호가 기존 최대값보다 크면 이후 자동부여가 그 위에서 이어진다', () => {
        const r = computePreview({
            rows: [['50', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10']), nextNumber: 11,
        })!;
        expect(r.items[0].display).toBe('50');   // 수동
        expect(r.items[1].display).toBe('51');   // 저장 시 max+1 = 51
    });

    it('수동 번호가 기존 최대값보다 작으면 커서를 내리지 않는다', () => {
        const r = computePreview({
            rows: [['3', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10']), nextNumber: 11,
        })!;
        expect(r.items[1].display).toBe('11');
    });

    it('건너뛰는 중복 행은 저장되지 않으므로 커서를 올리지 않는다', () => {
        const r = computePreview({
            rows: [['80', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10', '80']), nextNumber: 11, dupPolicy: 'skip',
        })!;
        expect(r.items[0].status).toBe('dup');
        expect(r.items[0].skip).toBe(true);
        expect(r.items[1].display).toBe('11'); // 80은 저장되지 않는다
    });

    it('덮어쓰기 정책의 중복 행은 저장되므로 커서를 올린다', () => {
        const r = computePreview({
            rows: [['80', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10', '80']), nextNumber: 11, dupPolicy: 'overwrite',
        })!;
        expect(r.items[0].status).toBe('dup');
        expect(r.items[0].skip).toBe(false);
        expect(r.items[1].display).toBe('81');
    });

    it('서브넘버 수동 입력도 본번 기준으로 커서를 올린다', () => {
        const r = computePreview({
            rows: [['50-3', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10']), nextNumber: 11,
        })!;
        expect(r.items[1].display).toBe('51');
    });

    it('숫자가 아닌 수동 번호는 커서에 영향을 주지 않는다', () => {
        const r = computePreview({
            rows: [['A-특수', 'A', '주소'], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10']), nextNumber: 11,
        })!;
        expect(r.items[1].display).toBe('11');
    });

    it('오류 행은 저장되지 않으므로 커서에 영향이 없다', () => {
        const r = computePreview({
            rows: [['', '', ''], ['', 'B', '주소']],
            mapping: MAP, existing: new Set(['10']), nextNumber: 11,
        })!;
        expect(r.items[0].status).toBe('err');
        expect(r.items[1].display).toBe('11');
    });
});

describe('computePreview — 집계와 경지구분', () => {
    it('stats와 willImport가 맞물린다 (new + 덮어쓰기 dup)', () => {
        const r = computePreview({
            rows: [
                ['5', 'A', '주소'],   // dup
                ['9', 'B', '주소'],   // new
                ['', '', ''],         // err
            ],
            mapping: MAP, existing: new Set(['5']), dupPolicy: 'overwrite',
        })!;
        expect(r.stats).toEqual({ total: 3, new: 1, dup: 1, err: 1 });
        expect(r.willImport).toBe(2); // new 1 + 덮어쓰기 dup 1
    });

    it('건너뛰기 정책에서는 dup이 등록 건수에서 빠진다', () => {
        const r = computePreview({
            rows: [['5', 'A', '주소'], ['9', 'B', '주소']],
            mapping: MAP, existing: new Set(['5']), dupPolicy: 'skip',
        })!;
        expect(r.willImport).toBe(1);
    });

    it('landClass1이 모든 행에 일괄 적용된다', () => {
        const r = computePreview({
            rows: [['A'], ['B']], mapping: { name: 0 }, landClass1: '공익직불제',
        })!;
        expect(r.landClass1).toBe('공익직불제');
        expect(r.items.every((i) => i.rec.landClass1 === '공익직불제')).toBe(true);
    });

    it('landClass1 미지정 시 기본값', () => {
        const r = computePreview({ rows: [['A']], mapping: { name: 0 } })!;
        expect(r.landClass1).toBe('농가의뢰');
    });

    it('셀 값은 trim되고 누락 컬럼은 빈 문자열', () => {
        const r = computePreview({
            rows: [['  7  ', '  홍길동  ', '  주소  ']],
            mapping: { ...MAP, cropsDisplay: 9 }, // 존재하지 않는 컬럼
        })!;
        expect(r.items[0].rec.name).toBe('홍길동');
        expect(r.items[0].rec.lotAddress).toBe('주소');
        expect(r.items[0].rec.cropsDisplay).toBe('');
        expect(r.items[0].display).toBe('7');
    });
});
