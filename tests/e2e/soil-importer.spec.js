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

/** 저장소 원본 레코드 전체 (새로고침 후) */
async function readPersistedRaw(page) {
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
    return page.evaluate(() => {
        const raw = localStorage.getItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`);
        return raw ? JSON.parse(raw) : [];
    });
}

test.describe('토양 가져오기 — 덮어쓰기(upsert)와 배치 저장 (SAMPL-1-152)', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await page.evaluate(() => localStorage.clear());
    });

    test('덮어쓰기로 같은 접수번호를 다시 가져오면 레코드 수가 늘지 않고 값만 갱신된다', async ({ page }) => {
        const OLD = '2020-01-01T00:00:00.000Z';
        await page.evaluate((old) => {
            const parcel = (id, lot) => ({ id, lotAddress: lot, isMountain: false, subLots: [],
                crops: [{ name: '벼', area: '100' }], category: '논', purpose: '일반재배', note: '' });
            localStorage.setItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`, JSON.stringify([
                { id: 'keep-7', receptionNumber: '7', name: '옛이름', phoneNumber: '010-9999-9999',
                  landClass1: '농가의뢰', subCategory: '논', purpose: '일반재배', isComplete: true,
                  createdAt: old, updatedAt: old, groupId: 'grp-7', lotAddress: '옛주소',
                  parcels: [parcel('p-7', '옛주소')] },
                // 같은 번호지만 경지구분이 다르다 — 건드리면 안 된다
                { id: 'other-7', receptionNumber: '7', name: '공익농가', landClass1: '공익직불제',
                  subCategory: '논', createdAt: old, updatedAt: old, groupId: 'grp-o7',
                  parcels: [parcel('p-o7', '공익주소')] },
            ]));
        }, OLD);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => (window.soilManager?.sampleLogs || []).length === 2);

        const modal = await openWithPastedData(page, [
            '접수번호\t성명\t지번주소\t작물\t면적',
            '7\t새이름\t봉화읍 내성리 77\t고추\t300',
            // 같은 배치 안의 같은 번호 두 행 — 뒤 행이 이긴다
            '9\t먼저\t봉화읍 내성리 90\t벼\t100',
            '9\t나중\t봉화읍 내성리 91\t벼\t200',
        ].join('\n'));
        await modal.locator('[data-el="autoNumber"]').uncheck();
        await modal.locator('input[name="sriDup"][value="overwrite"]').check();
        await modal.locator('[data-act="automap"]').click();
        await expect(modal.locator('select[data-field-key="receptionNumber"]')).not.toHaveValue('-1');
        await page.evaluate(() => {
            window.__toasts = [];
            const orig = window.showToast;
            window.showToast = (msg, type) => { window.__toasts.push(msg); if (typeof orig === 'function') orig(msg, type); };
        });
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();
        // 배치 안의 두 번째 9는 '덮어씀'이 아니라 따로 센다
        expect(await page.evaluate(() => window.__toasts.find((m) => m.startsWith('✅')))).toBe(
            '✅ 2건 가져오기 완료 · 덮어씀 1건 · 파일 안 반복 번호를 뒤 행으로 갱신 1건');

        const logs = await readPersistedRaw(page);
        expect(logs).toHaveLength(3); // keep-7, other-7, 9 한 건

        const updated = logs.find((l) => l.id === 'keep-7');
        expect(updated).toBeTruthy();
        expect(updated.receptionNumber).toBe('7');
        expect(updated.name).toBe('새이름');
        expect(updated.lotAddress).toBe('봉화읍 내성리 77');
        expect(updated.parcels[0].lotAddress).toBe('봉화읍 내성리 77');
        expect(updated.parcels[0].crops[0].name).toBe('고추');
        expect(updated.createdAt).toBe(OLD);
        expect(updated.groupId).toBe('grp-7');
        expect(updated.updatedAt).not.toBe(OLD);
        // 가져오기에 없던 값은 지우지 않는다
        expect(updated.phoneNumber).toBe('010-9999-9999');
        expect(updated.isComplete).toBe(true);

        const other = logs.find((l) => l.id === 'other-7');
        expect(other.name).toBe('공익농가');
        expect(other.updatedAt).toBe(OLD);

        const nines = logs.filter((l) => l.receptionNumber === '9');
        expect(nines).toHaveLength(1);
        expect(nines[0].name).toBe('나중');
    });

    test('201행 가져오기는 저장·재렌더를 한 번씩만 한다', async ({ page }) => {
        const rows = Array.from({ length: 201 }, (_, i) =>
            `농가${i + 1}\t010-0000-0000\t봉화읍 내성리 ${i + 1}\t벼\t100\t논\t일반재배`,
        );
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...rows].join('\n'));
        await modal.locator('[data-act="automap"]').click();
        await expect(modal.locator('[data-act="import"]')).toContainText('201건 가져오기');

        await page.evaluate(() => {
            const mgr = window.soilManager;
            const calls = { saveLogs: 0, filterAndRenderLogs: 0, firebaseSaveRecords: 0, firebaseSaveBatch: 0 };
            window.__importSpy = calls;
            for (const name of Object.keys(calls)) {
                const orig = mgr[name];
                if (typeof orig !== 'function') continue;
                mgr[name] = function (...args) { calls[name]++; return orig.apply(this, args); };
            }
        });
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const calls = await page.evaluate(() => window.__importSpy);
        expect(calls.saveLogs).toBe(1);
        expect(calls.filterAndRenderLogs).toBe(1);
        expect(calls.firebaseSaveRecords).toBe(0);
        expect(calls.firebaseSaveBatch).toBe(1);

        const persisted = await readPersisted(page);
        expect(persisted).toHaveLength(201);
    });

    test('Firestore 배치가 false로 끝나면 실패로 알린다 (reject가 아니어도)', async ({ page }) => {
        const modal = await openWithPastedData(page, [PASTE_HEADER, ...PASTE_ROWS].join('\n'));
        await modal.locator('[data-act="automap"]').click();

        await page.evaluate(() => {
            const spy = { batchCalls: 0, docs: 0 };
            window.__cloudSpy = spy;
            // batchSave는 실패를 reject가 아니라 false resolve로도 알린다
            window.firestoreDb = {
                ...(window.firestoreDb || {}),
                isEnabled: () => true,
                batchSave: async (_type, _year, docs) => { spy.batchCalls++; spy.docs = docs.length; return false; },
            };
            window.__toasts = [];
            const orig = window.showToast;
            window.showToast = (msg, type) => { window.__toasts.push(msg); if (typeof orig === 'function') orig(msg, type); };
        });
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        await expect.poll(() => page.evaluate(() => window.__toasts.filter((m) => m.includes('클라우드 동기화 실패')).length)).toBe(1);
        const spy = await page.evaluate(() => window.__cloudSpy);
        expect(spy.batchCalls).toBe(1);
        expect(spy.docs).toBe(2);
    });
});

test.describe('토양 가져오기 — 덮어쓰기 매칭은 미리보기와 같은 본번 기준 (SAMPL-2-28)', () => {
    const seed = (id, receptionNumber, name) => ({
        id, receptionNumber, name, landClass1: '농가의뢰', subCategory: '논', purpose: '일반재배',
        createdAt: '2020-01-01T00:00:00.000Z', updatedAt: '2020-01-01T00:00:00.000Z', groupId: `g-${id}`,
        parcels: [{ id: `p-${id}`, lotAddress: `옛주소-${id}`, isMountain: false, subLots: [],
            crops: [{ name: '벼', area: '100' }], category: '논', purpose: '일반재배', note: '' }],
    });

    async function seedAndOpen(page, logs, rows) {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await page.evaluate((data) => {
            localStorage.clear();
            localStorage.setItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`, JSON.stringify(data));
        }, logs);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForFunction((n) => (window.soilManager?.sampleLogs || []).length === n, logs.length);
        await page.evaluate(() => {
            window.__toasts = [];
            const orig = window.showToast;
            window.showToast = (msg, type) => { window.__toasts.push(msg); if (typeof orig === 'function') orig(msg, type); };
        });

        const modal = await openWithPastedData(page, ['접수번호\t성명\t지번주소', ...rows].join('\n'));
        await modal.locator('[data-el="autoNumber"]').uncheck();
        await modal.locator('input[name="sriDup"][value="overwrite"]').check();
        await modal.locator('[data-act="automap"]').click();
        return modal;
    }

    test("'5-1'만 있을 때 '5'를 덮어쓰면 새로 추가하지 않고 '5-1'을 갱신한다", async ({ page }) => {
        const modal = await seedAndOpen(page, [seed('sub-5-1', '5-1', '옛이름')], ['5\t새이름\t봉화읍 내성리 5']);
        // 미리보기는 본번이 같아 중복으로 본다
        await expect(modal.locator('.sri-pill.dup')).toContainText('중복 1');
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const logs = await readPersistedRaw(page);
        expect(logs).toHaveLength(1);
        expect(logs[0].id).toBe('sub-5-1');
        expect(logs[0].receptionNumber).toBe('5-1');
        expect(logs[0].name).toBe('새이름');
    });

    test('같은 본번이 여러 건이면 어느 것도 덮지 않고 건너뛴 건수를 알린다', async ({ page }) => {
        const modal = await seedAndOpen(page,
            [seed('sub-8-1', '8-1', '첫째'), seed('sub-8-2', '8-2', '둘째')],
            // 모호한 행만 있으면 미리보기가 등록 0건으로 보고 버튼을 잠그므로 신규 행을 하나 섞는다
            ['8\t새이름\t봉화읍 내성리 8', '9\t신규\t봉화읍 내성리 9']);
        // 미리보기가 저장 전에 모호함을 보여준다 (SAMPL-1-152 수정 라운드 — 같은 매칭 함수)
        await expect(modal.locator('.sri-pv-table tbody tr').first()).toContainText('같은 본번이 여러 건');
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const toasts = await page.evaluate(() => window.__toasts);
        expect(toasts.join(' | ')).toContain('같은 본번이 여러 건이라 건너뜀 1건');

        const logs = await readPersistedRaw(page);
        expect(logs.map((l) => `${l.receptionNumber}:${l.name}`).sort()).toEqual(['8-1:첫째', '8-2:둘째', '9:신규']);
    });
});

test.describe('토양 가져오기 — 수정 라운드 (SAMPL-1-152 리뷰 R1·R2·R3)', () => {
    const OLD = '2020-01-01T00:00:00.000Z';

    async function seed(page, logs) {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await page.evaluate((data) => {
            localStorage.clear();
            localStorage.setItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`, JSON.stringify(data));
        }, logs);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForFunction((n) => (window.soilManager?.sampleLogs || []).length === n, logs.length);
        await page.evaluate(() => {
            window.__toasts = [];
            const orig = window.showToast;
            window.showToast = (msg, type) => { window.__toasts.push(msg); if (typeof orig === 'function') orig(msg, type); };
        });
    }

    async function openManual(page, text, policy) {
        const modal = await openWithPastedData(page, text);
        await modal.locator('[data-el="autoNumber"]').uncheck();
        await modal.locator(`input[name="sriDup"][value="${policy}"]`).check();
        await modal.locator('[data-act="automap"]').click();
        return modal;
    }

    const toasts = (page) => page.evaluate(() => window.__toasts);

    test('R1: 앱 내보내기를 덮어쓰기로 되가져와도 여러 작물·하위 필지·비고·산 표시가 망가지지 않는다', async ({ page }) => {
        const crops = [{ name: '고추', area: '100', unit: 'pyeong' }, { name: '콩', area: '200' }];
        const subLots = [{ lotAddress: '내성리 5-1', crops: [{ name: '벼', area: '50' }] }];
        await seed(page, [{
            id: 'k5', receptionNumber: '5', name: '원래', landClass1: '농가의뢰', subCategory: '논', note: '',
            createdAt: OLD, updatedAt: OLD, lotAddress: '내성리 5',
            parcels: [{ id: 'p5', lotAddress: '내성리 5', isMountain: true, subLots, crops, category: '논', purpose: '', note: '' }],
        }]);
        // exportToExcel이 쓰는 모양: 산 필지는 '(산)', 빈 비고는 '-', 하위 필지는 'N-M' 행, 작물은 ', '로 이은 합계
        const modal = await openManual(page, [
            '접수번호\t필지 주소\t작물\t면적(m²)\t비고',
            '5\t내성리 5 (산)\t고추, 콩\t300\t-',
            '5-1\t내성리 5-1\t벼\t50\t-',
        ].join('\n'), 'overwrite');
        await expect(modal.locator('.sri-pv-table tbody tr').nth(1)).toContainText('오류');
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        expect((await toasts(page)).find((m) => m.startsWith('✅'))).toBe(
            '✅ 1건 가져오기 완료 · 덮어씀 1건 · 하위필지 행 건너뜀 1건');
        const logs = await readPersistedRaw(page);
        expect(logs).toHaveLength(1);
        const p = logs[0].parcels[0];
        expect(p.crops).toEqual(crops);
        expect(p.subLots).toEqual(subLots);
        expect(p.lotAddress).toBe('내성리 5');
        expect(p.isMountain).toBe(true);
        expect(logs[0].note).toBe('');
    });

    test('R2: 건너뛰기에서는 구분 열이 없는 F 번호 행도 기존 성토 레코드를 덮거나 새로 만들지 않는다', async ({ page }) => {
        await seed(page, [{
            id: 'f3', receptionNumber: 'F3', name: '원래', landClass1: '농가의뢰', subCategory: '성토',
            createdAt: OLD, updatedAt: OLD, lotAddress: '원주소',
            parcels: [{ id: 'pf3', lotAddress: '원주소', isMountain: false, subLots: [], crops: [], category: '성토', purpose: '', note: '' }],
        }]);
        // 신규 F4를 섞어 저장까지 가게 한다 — 중복 행도 매니저로 넘어가 정책대로 처리되는지 본다
        const modal = await openManual(page, ['접수번호\t성명\t지번주소', 'F3\t덮은이름\t다른주소', 'F4\t신규\t주소4'].join('\n'), 'skip');
        await expect(modal.locator('.sri-pill.dup')).toContainText('중복 1');
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        expect((await toasts(page)).find((m) => m.startsWith('✅'))).toBe('✅ 1건 가져오기 완료 · 중복 건너뜀 1건');
        const logs = await readPersistedRaw(page);
        expect(logs.map((l) => `${l.receptionNumber}:${l.name}:${l.lotAddress ?? ''}:${l.subCategory}`)).toEqual(
            ['F3:원래:원주소:성토', 'F4:신규:주소4:성토']);
    });

    test('덮어쓰기가 F 없는 옛 성토 레코드의 구분을 일반으로 바꾸지 않는다', async ({ page }) => {
        await seed(page, [{
            id: 'old7', receptionNumber: '7', name: '원래', landClass1: '농가의뢰', subCategory: '성토',
            createdAt: OLD, updatedAt: OLD,
            parcels: [{ id: 'p7', lotAddress: '원주소', isMountain: false, subLots: [], crops: [], category: '성토', purpose: '', note: '' }],
        }]);
        // 정확한 번호 탐색이 풀보다 먼저라 일반 행 '7'이 이 레코드와 만난다
        const modal = await openManual(page, ['접수번호\t성명\t지번주소\t구분', '7\t새이름\t원주소\t논'].join('\n'), 'overwrite');
        await modal.locator('[data-act="import"]').click();
        await expect(modal).toBeHidden();

        const logs = await readPersistedRaw(page);
        expect(logs).toHaveLength(1);
        expect(logs[0].name).toBe('새이름');
        expect(logs[0].subCategory).toBe('성토');
        expect(logs[0].parcels[0].category).toBe('성토');
    });

    test('R3: 로컬 저장이 실패하면 가져오기를 되돌리고 오류로 알리며 클라우드에 보내지 않는다', async ({ page }) => {
        await seed(page, [{
            id: 'k7', receptionNumber: '7', name: '옛이름', landClass1: '농가의뢰', subCategory: '논',
            createdAt: OLD, updatedAt: OLD,
            parcels: [{ id: 'p7', lotAddress: '옛주소', isMountain: false, subLots: [], crops: [], category: '논', purpose: '', note: '' }],
        }]);
        const modal = await openManual(page, ['접수번호\t성명\t지번주소', '7\t새이름\t새주소', '8\t신규\t주소8'].join('\n'), 'overwrite');
        await page.evaluate(() => {
            window.__rejections = [];
            window.addEventListener('unhandledrejection', (e) => window.__rejections.push(String(e.reason)));
            window.__batchCalls = 0;
            const mgr = window.soilManager;
            const origBatch = mgr.firebaseSaveBatch;
            mgr.firebaseSaveBatch = function (...a) { window.__batchCalls++; return origBatch.apply(this, a); };
            const origSet = Storage.prototype.setItem;
            Storage.prototype.setItem = function (k, v) {
                if (String(k).startsWith('test_soilSampleLogs_')) {
                    const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e;
                }
                return origSet.call(this, k, v);
            };
        });
        await modal.locator('[data-act="import"]').click();

        await expect.poll(() => toasts(page).then((t) => t.join(' | '))).toContain('로컬 저장에 실패해 가져오기를 취소했습니다');
        const state = await page.evaluate(() => ({
            mem: window.soilManager.sampleLogs.map((l) => `${l.receptionNumber}:${l.name}`),
            ok: window.__toasts.filter((m) => m.startsWith('✅')).length,
            batch: window.__batchCalls,
            rej: window.__rejections,
        }));
        expect(state).toEqual({ mem: ['7:옛이름'], ok: 0, batch: 0, rej: [] });
        await expect(modal).toBeVisible();
        await expect(modal.locator('[data-act="import"]')).toBeEnabled();
    });
});

test.describe('토양 가져오기 — 매칭 규칙 양방향 (SAMPL-2-28 리뷰 A1~A4 · 코디네이터 결정 1~5)', () => {
    const OLD = '2020-01-01T00:00:00.000Z';
    const rec = (o) => ({ landClass1: '농가의뢰', subCategory: '논', purpose: '일반재배', createdAt: OLD, updatedAt: OLD, groupId: `g-${o.id}`, ...o });
    const parcel = (id, lot, crops = [], subLots = [], category = '논') => ({ id, lotAddress: lot, isMountain: false, category, purpose: '', note: '', crops, subLots });

    async function run(page, logs, text, policy, { expectImport = true } = {}) {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await page.evaluate((data) => {
            localStorage.clear();
            localStorage.setItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`, JSON.stringify(data));
        }, logs);
        await page.reload();
        await page.waitForLoadState('networkidle');
        await page.waitForFunction((n) => (window.soilManager?.sampleLogs || []).length === n, logs.length);
        await page.evaluate(() => {
            window.__toasts = [];
            const orig = window.showToast;
            window.showToast = (msg, type) => { window.__toasts.push(msg); if (typeof orig === 'function') orig(msg, type); };
        });
        const modal = await openWithPastedData(page, text);
        await modal.locator('[data-el="autoNumber"]').uncheck();
        await modal.locator(`input[name="sriDup"][value="${policy}"]`).check();
        await modal.locator('[data-act="automap"]').click();
        const pills = (await modal.locator('.sri-pill').allTextContents()).join(' ');
        const rows = await modal.locator('.sri-pv-table tbody tr').allTextContents();
        const importBtn = modal.locator('[data-act="import"]');
        if (expectImport) {
            await importBtn.click();
            await expect(modal).toBeHidden();
        } else {
            await expect(importBtn).toBeDisabled();
        }
        const toast = await page.evaluate(() => window.__toasts.find((m) => m.startsWith('✅')) ?? null);
        const saved = await readPersistedRaw(page);
        return { pills, rows, toast, saved };
    }

    test('A1: 하위필지 2개 레코드를 내보낸 모양(5·5-1·5-2)으로 덮어써도 본필지가 하위필지 값으로 바뀌지 않는다', async ({ page }) => {
        const subLots = [{ lotAddress: '내성리 5-1', crops: [{ name: '벼', area: '50' }] }, { lotAddress: '내성리 5-2', crops: [{ name: '콩', area: '30' }] }];
        const r = await run(page,
            [rec({ id: 'k5', receptionNumber: '5', name: '원래', lotAddress: '내성리 5', parcels: [parcel('p5', '내성리 5', [{ name: '고추', area: '100' }], subLots)] })],
            ['접수번호\t성명\t지번주소\t작물\t면적', '5\t원래\t내성리 5\t고추\t100', '5-1\t원래\t내성리 5-1\t벼\t50', '5-2\t원래\t내성리 5-2\t콩\t30'].join('\n'),
            'overwrite');
        expect(r.pills).toContain('오류 2');
        expect(r.toast).toBe('✅ 1건 가져오기 완료 · 덮어씀 1건 · 하위필지 행 건너뜀 2건');
        expect(r.saved).toHaveLength(1);
        const p = r.saved[0].parcels[0];
        expect(p.lotAddress).toBe('내성리 5');
        expect(p.crops.map((c) => `${c.name}/${c.area}`)).toEqual(['고추/100']);
        expect(p.subLots).toEqual(subLots);
    });

    test('A1b: 하위필지 행만 들어오면 저장하지 않고 미리보기가 사유를 보여준다', async ({ page }) => {
        const r = await run(page,
            [rec({ id: 'k5', receptionNumber: '5', name: '원래', lotAddress: '내성리 5', parcels: [parcel('p5', '내성리 5', [{ name: '고추', area: '100' }])] })],
            ['접수번호\t성명\t지번주소\t작물\t면적', '5-1\t원래\t내성리 5-1\t벼\t50'].join('\n'),
            'overwrite', { expectImport: false });
        expect(r.rows[0]).toContain('하위필지는 가져오기로 갱신하지 않습니다');
        expect(r.saved.map((l) => `${l.receptionNumber}:${l.parcels[0].lotAddress}`)).toEqual(['5:내성리 5']);
    });

    test('A2: 본번 레코드가 없으면 가지번호 행은 각각 새 레코드다 (7-1 갑 · 7-2 을)', async ({ page }) => {
        const r = await run(page,
            [rec({ id: 'x1', receptionNumber: '1', name: '무관', parcels: [] })],
            ['접수번호\t성명\t지번주소', '7-1\t갑\t주소1', '7-2\t을\t주소2'].join('\n'), 'overwrite');
        expect(r.toast).toBe('✅ 2건 가져오기 완료');
        expect(r.saved.map((l) => `${l.receptionNumber}:${l.name}`).sort()).toEqual(['1:무관', '7-1:갑', '7-2:을']);
    });

    test("경계: 같은 배치에서 앞서 추가된 '7'이 있으면 '7-1'은 하위필지 행이다", async ({ page }) => {
        const r = await run(page, [],
            ['접수번호\t성명\t지번주소', '7\t본\t주소7', '7-1\t가지\t주소71'].join('\n'), 'overwrite');
        expect(r.rows[1]).toContain('본번 7이 있어 하위필지 행으로 봅니다');
        expect(r.toast).toBe('✅ 1건 가져오기 완료 · 하위필지 행 건너뜀 1건');
        expect(r.saved.map((l) => `${l.receptionNumber}:${l.name}`)).toEqual(['7:본']);
    });

    test("경계: 'N-K'만 있고 'N'이 없으면 'N-K'는 그 레코드를 갱신하고 'N-M'은 새로 추가한다", async ({ page }) => {
        const r = await run(page,
            [rec({ id: 's81', receptionNumber: '8-1', name: '옛', parcels: [parcel('p81', '옛주소')] })],
            ['접수번호\t성명\t지번주소', '8-1\t갱신\t주소81', '8-2\t추가\t주소82'].join('\n'), 'overwrite');
        expect(r.toast).toBe('✅ 2건 가져오기 완료 · 덮어씀 1건');
        expect(r.saved.map((l) => `${l.id === 's81' ? 'old' : 'new'}:${l.receptionNumber}:${l.name}`).sort())
            .toEqual(['new:8-2:추가', 'old:8-1:갱신']);
    });

    test('A3: 구분 열 없이 F5를 덮어쓰면 기존 성토 F5를 갱신하고 새로 만들지 않는다', async ({ page }) => {
        const r = await run(page,
            [rec({ id: 'f5', receptionNumber: 'F5', name: '원래', subCategory: '성토', parcels: [parcel('pf5', '원주소', [], [], '성토')] })],
            ['접수번호\t성명\t지번주소', 'F5\t새이름\t새주소'].join('\n'), 'overwrite');
        expect(r.pills).toContain('중복 1');
        expect(r.saved.map((l) => `${l.id}:${l.receptionNumber}:${l.name}:${l.subCategory}`)).toEqual(['f5:F5:새이름:성토']);
    });

    test('A4 양방향: 구분 성토인데 F 없는 행, F인데 구분이 성토가 아닌 행은 오류로 저장하지 않는다', async ({ page }) => {
        const r = await run(page,
            [rec({ id: 'g7', receptionNumber: '7', name: '원래', parcels: [parcel('pg7', '원주소')] }),
             rec({ id: 'f5', receptionNumber: 'F5', name: '성토원래', subCategory: '성토', parcels: [parcel('pf5', '원주소', [], [], '성토')] })],
            ['접수번호\t성명\t지번주소\t구분', '7\t새이름\t새주소\t성토', 'F5\t새이름\t새주소\t논', '9\t정상\t주소9\t논'].join('\n'), 'skip');
        expect(r.rows[0]).toContain('구분이 성토인데 번호에 F가 없습니다');
        expect(r.rows[1]).toContain('F 번호인데 구분이 성토가 아닙니다');
        expect(r.toast).toBe('✅ 1건 가져오기 완료 · 오류 2건');
        expect(r.saved.map((l) => `${l.receptionNumber}:${l.name}:${l.subCategory}`).sort())
            .toEqual(['7:원래:논', '9:정상:논', 'F5:성토원래:성토']);
    });
});
