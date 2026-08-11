// @ts-check
const { test, expect } = require('@playwright/test');
const fs = require('fs');
const os = require('os');
const path = require('path');
const XLSX = require('xlsx');

/**
 * 토양 엑셀 가져오기 모달 (SoilResultImporter) E2E — SAMPL-1-124 Phase B-3/C
 *
 * 단위 테스트는 순수 계층(파싱·자동매핑·중복판정)만 덮는다.
 * 이 스펙은 단위 테스트가 닿지 않는 부분을 검증한다:
 *  - 버튼 → 모달 열림 (엔트리 배선이 실제로 살아 있는지)
 *  - 붙여넣기 → 자동매핑 → 미리보기 표 렌더
 *  - 가져오기 → 매니저 위임 → 목록 반영
 */

const PASTE_HEADER = '성명\t연락처\t지번주소\t작물\t면적\t구분\t목적';
const PASTE_ROWS = [
    '홍길동\t010-1111-2222\t봉화읍 내성리 123\t벼\t1200\t논\t일반재배',
    '김철수\t010-3333-4444\t물야면 오전리 45\t고추\t800\t밭\t일반재배',
];

/**
 * 저장된 레코드를 **localStorage에서** 읽는다.
 *
 * 메모리 배열(`soilManager.sampleLogs`)만 보면 `saveLogs()`를 통째로 no-op으로 만들어도
 * 테스트가 통과한다. 새로고침 후 저장소를 읽어야 지속성까지 검증된다.
 */
async function readPersisted(page) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
    return page.evaluate(() => {
        const year = window.soilManager.selectedYear;
        const raw = localStorage.getItem(`test_soilSampleLogs_${year}`);
        return (raw ? JSON.parse(raw) : []).map((l) => ({
            receptionNumber: String(l.receptionNumber ?? ''),
            name: l.name ?? '',
            subCategory: l.subCategory ?? '',
            landClass1: l.landClass1 ?? '',
        }));
    });
}

/** 접수번호가 모두 채워져 있고 중복이 없는지 단정한다 */
function expectUniqueReceptionNumbers(records) {
    const nums = records.map((r) => r.receptionNumber);
    for (const n of nums) {
        expect(n).not.toBe('');
        expect(n).not.toBe('null');
        expect(n).not.toBe('undefined');
    }
    expect(new Set(nums).size, `접수번호 중복: ${nums.join(', ')}`).toBe(nums.length);
}

/** 모달을 열고 붙여넣기 모드로 데이터를 입력한다 */
async function openWithPastedData(page, text) {
    await page.click('#soilImportBtn');
    const modal = page.locator('#soilImporterModal');
    await expect(modal).toBeVisible();

    await modal.locator('input[name="sriMode"][value="paste"]').check();
    await modal.locator('[data-el="textarea"]').fill(text);
    return modal;
}

test.describe('토양 엑셀 가져오기 모달', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        // 매니저 준비를 기다린다 (가져오기 커밋이 매니저에 위임된다)
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        // 이전 테스트 데이터 격리
        await page.evaluate(() => localStorage.clear());
    });

    test('가져오기 버튼이 모달을 연다', async ({ page }) => {
        await page.click('#soilImportBtn');
        const modal = page.locator('#soilImporterModal');
        await expect(modal).toBeVisible();
        await expect(modal.locator('#sriTitle')).toContainText('엑셀 가져오기');
        // 5단계 섹션이 모두 있어야 한다
        await expect(modal.locator('.sri-stepnum')).toHaveCount(5);
    });

    test('닫기 버튼과 ESC로 닫힌다', async ({ page }) => {
        await page.click('#soilImportBtn');
        const modal = page.locator('#soilImporterModal');
        await modal.locator('.sri-close').click();
        await expect(modal).toBeHidden();

        await page.click('#soilImportBtn');
        await expect(modal).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(modal).toBeHidden();
    });

    test('붙여넣기 → 자동매핑 → 미리보기 표가 렌더된다', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));

        await modal.locator('[data-act="automap"]').click();

        // 성명·지번주소가 매핑돼야 미리보기가 생성된다
        await expect(modal.locator('select[data-field-key="name"]')).not.toHaveValue('-1');
        await expect(modal.locator('select[data-field-key="lotAddress"]')).not.toHaveValue('-1');

        // 미리보기 표: 헤더 11열 + 데이터 2행
        const table = modal.locator('.sri-pv-table');
        await expect(table).toBeVisible();
        await expect(table.locator('thead th')).toHaveCount(11);
        await expect(table.locator('tbody tr')).toHaveCount(2);

        // 붙여넣은 값이 그대로 표시된다
        await expect(table.locator('tbody tr').first()).toContainText('홍길동');
        await expect(table.locator('tbody tr').first()).toContainText('봉화읍 내성리 123');

        // 요약·푸터 건수
        await expect(modal.locator('.sri-pill.new')).toContainText('신규 2');
        await expect(modal.locator('[data-el="footerNote"]')).toContainText('2건이 [농가의뢰]으로 등록됩니다');
        await expect(modal.locator('[data-act="import"]')).toBeEnabled();
        await expect(modal.locator('[data-act="import"]')).toContainText('2건 가져오기');
    });

    test('식별 컬럼이 매핑되지 않으면 미리보기 없이 가져오기가 잠긴다', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));

        // 자동매핑을 하지 않은 상태 — 매핑이 비어 있다
        await expect(modal.locator('.sri-pv-table')).toHaveCount(0);
        await expect(modal.locator('.sri-pv-empty')).toBeVisible();
        await expect(modal.locator('[data-act="import"]')).toBeDisabled();
    });

    test('성명·주소가 빈 행은 오류로 집계되고 오류 CSV 버튼이 나타난다', async ({ page }) => {
        const modal = await openWithPastedData(page, [
            PASTE_HEADER,
            PASTE_ROWS[0],
            '\t\t\t벼\t100\t논\t일반재배', // 성명·주소 없음 → 오류
        ].join('\n'));

        await modal.locator('[data-act="automap"]').click();

        await expect(modal.locator('.sri-pill.err')).toContainText('오류 1');
        await expect(modal.locator('.sri-pv-table tbody tr.is-err')).toHaveCount(1);
        await expect(modal.locator('[data-act="dlErrorCsv"]')).toBeVisible();
        await expect(modal.locator('[data-act="dlErrorCsv"]')).toContainText('1건');
        // 정상 행 1건만 등록 대상
        await expect(modal.locator('[data-act="import"]')).toContainText('1건 가져오기');
    });

    test('경지구분 1차를 공익직불제로 바꾸면 매핑 그리드가 강조된다', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));
        const grid = modal.locator('[data-el="mapGrid"]');

        await expect(grid).not.toHaveClass(/gongik-active/);
        await modal.locator('[data-el="bulkLandClass"]').selectOption('공익직불제');
        await expect(grid).toHaveClass(/gongik-active/);

        await modal.locator('[data-act="automap"]').click();
        await expect(modal.locator('[data-el="footerNote"]')).toContainText('[공익직불제]');
    });

    test('가져오기가 매니저에 위임되어 목록에 반영된다', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));
        await modal.locator('[data-act="automap"]').click();
        await modal.locator('[data-act="import"]').click();

        // 커밋 후 모달이 닫힌다
        await expect(modal).toBeHidden();

        // 매니저에 2건이 등록되고 접수번호가 자동부여된다
        const saved = await page.evaluate(() =>
            (window.soilManager.sampleLogs || []).map((l) => ({
                receptionNumber: String(l.receptionNumber ?? ''),
                name: l.name ?? '',
                landClass1: l.landClass1 ?? '',
            })),
        );
        expect(saved).toHaveLength(2);
        expect(saved.map((s) => s.name)).toEqual(['홍길동', '김철수']);
        expect(saved.every((s) => s.landClass1 === '농가의뢰')).toBe(true);

        // 메모리가 아니라 저장소를 읽어 지속성까지 확인한다
        const persisted = await readPersisted(page);
        expect(persisted.map((s) => s.name)).toEqual(['홍길동', '김철수']);
        expectUniqueReceptionNumbers(persisted);
        // 빈 저장소에서 시작했으므로 1, 2가 순서대로 부여된다
        expect(persisted.map((s) => s.receptionNumber)).toEqual(['1', '2']);
    });

    test('구분=성토 행은 F 접두 시퀀스로 채번되고 중복되지 않는다', async ({ page }) => {
        // 수정 전에는 성토 행 전부가 '1'로 저장됐다 (적대적 검증 발견).
        // 미리보기는 1,2,3을 보여주는데 실제로는 1,1,1이 들어가 대장 무결성이 깨졌다.
        const modal = await openWithPastedData(page, [
            PASTE_HEADER,
            '성토1\t010-1111-1111\t봉화읍 내성리 1\t-\t100\t성토\t일반재배',
            '성토2\t010-2222-2222\t봉화읍 내성리 2\t-\t200\t성토\t일반재배',
            '성토3\t010-3333-3333\t봉화읍 내성리 3\t-\t300\t성토\t일반재배',
        ].join('\n'));
        await modal.locator('[data-act="automap"]').click();

        // 미리보기가 F 접두를 보여준다
        const shown = await modal.locator('.sri-pv-table tbody tr td:nth-child(2)').allTextContents();
        expect(shown).toEqual(['F1', 'F2', 'F3']);

        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const persisted = await readPersisted(page);
        expect(persisted).toHaveLength(3);
        expect(persisted.every((s) => s.subCategory === '성토')).toBe(true);
        expectUniqueReceptionNumbers(persisted);
        // 미리보기가 보여준 번호와 실제 저장 번호가 같아야 한다
        expect(persisted.map((s) => s.receptionNumber)).toEqual(['F1', 'F2', 'F3']);
    });

    test('일반·성토가 섞인 배치도 각자의 시퀀스로 채번된다', async ({ page }) => {
        const modal = await openWithPastedData(page, [
            PASTE_HEADER,
            '일반A\t010-1111-1111\t봉화읍 내성리 1\t벼\t100\t논\t일반재배',
            '성토A\t010-2222-2222\t봉화읍 내성리 2\t-\t200\t성토\t일반재배',
            '일반B\t010-3333-3333\t봉화읍 내성리 3\t고추\t300\t밭\t일반재배',
            '성토B\t010-4444-4444\t봉화읍 내성리 4\t-\t400\t성토\t일반재배',
        ].join('\n'));
        await modal.locator('[data-act="automap"]').click();

        const shown = await modal.locator('.sri-pv-table tbody tr td:nth-child(2)').allTextContents();
        expect(shown).toEqual(['1', 'F1', '2', 'F2']);

        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const persisted = await readPersisted(page);
        expectUniqueReceptionNumbers(persisted);
        expect(persisted.map((s) => s.receptionNumber)).toEqual(['1', 'F1', '2', 'F2']);
    });

    test('기존 레코드가 있으면 그 다음 번호부터 이어진다', async ({ page }) => {
        // beforeEach가 localStorage를 비우므로, 여기서만 기존 레코드를 심어
        // "빈 저장소에서만 통과하는 테스트" 사각지대를 덮는다.
        await page.evaluate(() => {
            const year = window.soilManager.selectedYear;
            localStorage.setItem(`test_soilSampleLogs_${year}`, JSON.stringify([
                { id: 'seed-1', receptionNumber: '7', name: '기존일반', landClass1: '농가의뢰', subCategory: '논', parcels: [] },
                { id: 'seed-2', receptionNumber: 'F4', name: '기존성토', landClass1: '농가의뢰', subCategory: '성토', parcels: [] },
            ]));
        });
        // 매니저는 init 시점에 저장소를 읽으므로, 심은 뒤 새로고침해야 메모리에 반영된다
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => (window.soilManager?.sampleLogs || []).length === 2);

        const modal = await openWithPastedData(page, [
            PASTE_HEADER,
            '신규일반\t010-1111-1111\t봉화읍 내성리 9\t벼\t100\t논\t일반재배',
            '신규성토\t010-2222-2222\t봉화읍 내성리 10\t-\t200\t성토\t일반재배',
        ].join('\n'));
        await modal.locator('[data-act="automap"]').click();

        // 기존 최대 일반 7 → 8, 기존 최대 성토 F4 → F5
        const shown = await modal.locator('.sri-pv-table tbody tr td:nth-child(2)').allTextContents();
        expect(shown).toEqual(['8', 'F5']);

        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const persisted = await readPersisted(page);
        expectUniqueReceptionNumbers(persisted);
        expect(persisted.map((s) => s.receptionNumber).sort()).toEqual(['7', '8', 'F4', 'F5']);
    });

    test('201행이면 미리보기는 200행만 보여주고 전체를 가져온다', async ({ page }) => {
        const rows = Array.from({ length: 201 }, (_, i) =>
            `농가${i + 1}\t010-0000-0000\t봉화읍 내성리 ${i + 1}\t벼\t100\t논\t일반재배`,
        );
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...rows].join('\n'));
        await modal.locator('[data-act="automap"]').click();

        // 표는 200행까지만 (렌더 비용 상한)
        await expect(modal.locator('.sri-pv-table tbody tr')).toHaveCount(200);
        await expect(modal.locator('.sri-pv-overflow')).toContainText('외 1건');
        // 집계·등록 건수는 전체 201건
        await expect(modal.locator('.sri-pill.new')).toContainText('신규 201');
        await expect(modal.locator('[data-act="import"]')).toContainText('201건 가져오기');

        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        // 표시 제한이 저장까지 자르지 않는다 — 메모리가 아니라 저장소로 확인한다
        const persisted = await readPersisted(page);
        expect(persisted).toHaveLength(201);
        expectUniqueReceptionNumbers(persisted);
        // 빈 저장소에서 시작했으므로 1..201이 빠짐없이 부여돼야 한다
        expect(persisted.map((s) => Number(s.receptionNumber)).sort((a, b) => a - b))
            .toEqual(Array.from({ length: 201 }, (_, i) => i + 1));
    });

    test('실제 .xlsx 파일 업로드 → 시트 선택·헤더 행·자동매핑·가져오기', async ({ page }) => {
        // 두 번째 시트에 데이터를 두고, 첫 행은 제목 행이라 헤더가 2행에 있는 파일
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([['빈 시트']]), '표지');
        XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([
            ['2026년 토양 검정 의뢰 명단'],
            ['성명', '연락처', '지번주소', '작물', '면적', '구분', '목적'],
            ['이영희', '010-5555-6666', '춘양면 의양리 7', '사과', 2400, '과수', '일반재배'],
            ['박민수', '010-7777-8888', '법전면 법전리 12', '콩', 900, '밭', '일반재배'],
        ]), '접수목록');
        const filePath = path.join(os.tmpdir(), `sri-e2e-${process.pid}.xlsx`);
        XLSX.writeFile(wb, filePath);

        try {
            await page.click('#soilImportBtn');
            const modal = page.locator('#soilImporterModal');
            await expect(modal).toBeVisible();

            await modal.locator('[data-el="fileInput"]').setInputFiles(filePath);

            // 파일 정보 + 시트 선택이 나타난다
            await expect(modal.locator('[data-el="fileInfo"]')).toContainText('시트 2개');
            await expect(modal.locator('[data-el="fileOpts"]')).toBeVisible();
            await expect(modal.locator('[data-el="sheetSelect"] option')).toHaveCount(2);

            // 두 번째 시트로 전환 + 헤더 행을 2로 지정
            await modal.locator('[data-el="sheetSelect"]').selectOption('접수목록');
            await modal.locator('[data-el="headerRow"]').fill('2');
            await modal.locator('[data-act="automap"]').click();

            await expect(modal.locator('.sri-pv-table tbody tr')).toHaveCount(2);
            await expect(modal.locator('.sri-pv-table tbody tr').first()).toContainText('이영희');
            await expect(modal.locator('.sri-pv-table tbody tr').first()).toContainText('춘양면 의양리 7');
            await expect(modal.locator('.sri-pill.err')).toContainText('오류 0');

            await modal.locator('[data-act="import"]').click();
            await expect(modal).toBeHidden();

            const saved = await page.evaluate(() =>
                (window.soilManager.sampleLogs || []).map((l) => `${l.name}/${l.area}`),
            );
            expect(saved).toEqual(['이영희/2400', '박민수/900']);
        } finally {
            fs.rmSync(filePath, { force: true });
        }
    });

    test('헤더 없음 체크 시 첫 행도 데이터로 취급한다', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));
        // 붙여넣기 모드의 '첫 행은 헤더입니다'를 해제하면 헤더 행이 데이터가 된다
        await modal.locator('[data-el="hasHeader"]').uncheck();
        await modal.locator('[data-act="automap"]').click();

        // 자리표시 헤더(열 N)로는 자동매핑이 되지 않으므로 수동 매핑한다
        await modal.locator('select[data-field-key="name"]').selectOption('0');
        await modal.locator('select[data-field-key="lotAddress"]').selectOption('2');

        // 헤더 행까지 3행이 데이터로 들어온다
        await expect(modal.locator('.sri-pv-table tbody tr')).toHaveCount(3);
        await expect(modal.locator('.sri-pv-table tbody tr').first()).toContainText('성명');
    });

    test('다시 열면 이전 입력이 초기화된다', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));
        await modal.locator('[data-act="automap"]').click();
        await expect(modal.locator('.sri-pv-table')).toBeVisible();
        await modal.locator('.sri-close').click();

        await page.click('#soilImportBtn');
        await expect(modal.locator('[data-el="textarea"]')).toHaveValue('');
        await expect(modal.locator('.sri-pv-table')).toHaveCount(0);
        await expect(modal.locator('[data-act="import"]')).toBeDisabled();
        // 파일 모드로 돌아간다
        await expect(modal.locator('input[name="sriMode"][value="file"]')).toBeChecked();
    });
});
