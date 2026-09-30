// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 경지구분 1차(landClass1) 도입 후의 경계 — SAMPL-2-27
 *
 * 접수번호는 경지구분별 독립 시퀀스라 같은 번호 '5'가 농가의뢰와 공익직불제에 따로 존재한다.
 * 완료 연동은 접수번호로 묶으므로, 경지구분을 보지 않으면 남의 시료까지 완료된다.
 */

function seedLog(id, landClass1) {
    return {
        id, receptionNumber: '5', date: '2026-03-02', name: `농가-${id}`, phoneNumber: '010-0000-0000',
        address: '봉화읍', subCategory: '논', purpose: '일반재배', landClass1, isComplete: false,
        groupId: `g-${id}`, parcelIndex: 1, totalParcels: 1,
        parcels: [{ id: `p-${id}`, lotAddress: '내성리 1', isMountain: false, subLots: [],
            crops: [{ name: '벼', area: '100' }], category: '논', purpose: '일반재배', note: '' }],
    };
}

async function seedAndReload(page, logs) {
    await page.evaluate((data) => {
        localStorage.clear();
        localStorage.setItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`, JSON.stringify(data));
    }, logs);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
}

async function readCompleted(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`);
        return Object.fromEntries((raw ? JSON.parse(raw) : []).map((l) => [l.id, !!l.isComplete]));
    });
}

async function showAllLandClasses(page) {
    await page.click('.nav-btn[data-view="list"]');
    await page.selectOption('#landClass1Tab', '');
}

test.describe('경지구분 1차 — 같은 접수번호가 다른 경지구분에 있을 때', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await seedAndReload(page, [seedLog('a', '농가의뢰'), seedLog('b', '공익직불제')]);
    });

    test('완료 버튼은 다른 경지구분의 같은 번호를 완료하지 않는다', async ({ page }) => {
        await showAllLandClasses(page);
        await page.click('tr[data-id="a"] .btn-complete');

        await expect.poll(async () => (await readCompleted(page)).a).toBe(true);
        expect((await readCompleted(page)).b).toBe(false);
    });

    test('일괄 완료는 다른 경지구분의 같은 번호를 끌어오지 않는다', async ({ page }) => {
        await showAllLandClasses(page);
        page.on('dialog', (d) => d.accept());
        await page.check('tr[data-id="a"] .row-checkbox');
        await page.evaluate(() => document.getElementById('btnBulkComplete')?.click());

        await expect.poll(async () => (await readCompleted(page)).a).toBe(true);
        expect((await readCompleted(page)).b).toBe(false);
    });
});

test.describe('경지구분 1차 목록 탭', () => {
    test('첫 화면의 탭 표시와 실제 필터가 일치한다', async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await seedAndReload(page, [seedLog('a', '농가의뢰'), seedLog('b', '공익직불제')]);

        const tabValue = await page.inputValue('#landClass1Tab');
        const filterValue = await page.evaluate(() => window.soilManager.currentSearchFilter.landClass1 || '');
        expect(filterValue).toBe(tabValue);

        // 탭이 '농가의뢰'로 보이면 공익직불제 행은 목록에 없어야 한다
        await page.click('.nav-btn[data-view="list"]');
        await expect(page.locator('tr[data-id="a"]').first()).toBeVisible();
        await expect(page.locator('tr[data-id="b"]')).toHaveCount(0);
    });
});

test.describe('경지구분 1차 — 연속 등록', () => {
    async function register(page, name) {
        await page.fill('#name', name);
        await page.fill('#phoneNumber', '010-1234-5678');
        await page.selectOption('#purpose', '일반재배');
        await page.locator('.lot-address-input').first().fill('내성리 1');
        await page.click('#navSubmitBtn');
        // 등록하면 결과 모달이 뜨고 목록으로 넘어간다 — 사용자처럼 닫고 접수 화면으로 돌아온다
        await expect(page.locator('#closeResultBtn')).toBeEnabled({ timeout: 20000 });
        await page.click('#closeResultBtn');
        await page.click('.nav-btn[data-view="form"]');
    }

    async function readStored(page) {
        return page.evaluate(() => {
            const raw = localStorage.getItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`);
            return (raw ? JSON.parse(raw) : []).map((l) => ({ name: l.name, landClass1: l.landClass1 }));
        });
    }

    test('등록 후 폼이 기본 경지구분으로 돌아와 두 번째 시료도 농가의뢰로 저장되고 목록에 보인다', async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await seedAndReload(page, []);

        await register(page, '연속첫째');
        await expect.poll(async () => (await readStored(page)).length).toBe(1);
        await expect(page.locator('#landClass1')).toHaveValue('농가의뢰');
        await expect(page.locator('#receptionNumber')).toHaveValue('2');

        await register(page, '연속둘째');
        await expect.poll(async () => (await readStored(page)).length).toBe(2);
        expect(await readStored(page)).toEqual([
            { name: '연속첫째', landClass1: '농가의뢰' },
            { name: '연속둘째', landClass1: '농가의뢰' },
        ]);

        await page.click('.nav-btn[data-view="list"]');
        await expect(page.locator('#landClass1Tab')).toHaveValue('농가의뢰');
        await expect(page.locator('#logTableBody')).toContainText('연속둘째');
    });
});

test.describe('성토 채번 — F 번호 레코드의 구분이 성토가 아닐 때 (SAMPL-2-28 수정 라운드)', () => {
    test('필지 구분을 논으로 둔 성토 등록 뒤에도 다음 성토 번호가 F2로 이어진다', async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
        await seedAndReload(page, []);

        async function registerFill(name, parcelCategory) {
            await page.selectOption('#subCategory', '성토');
            const rn = await page.inputValue('#receptionNumber');
            await page.fill('#name', name);
            await page.fill('#phoneNumber', '010-1234-5678');
            await page.selectOption('#purpose', '일반재배');
            await page.locator('.lot-address-input').first().fill('내성리 1');
            if (parcelCategory) await page.locator('.parcel-category-select').first().selectOption(parcelCategory);
            await page.click('#navSubmitBtn');
            await expect(page.locator('#closeResultBtn')).toBeEnabled({ timeout: 20000 });
            await page.click('#closeResultBtn');
            await page.click('.nav-btn[data-view="form"]');
            return rn;
        }

        // 폼은 필지 카드의 구분을 저장하므로 F1 레코드의 구분이 '논'이 된다
        expect(await registerFill('성토1', '논')).toBe('F1');
        expect(await registerFill('성토2', null)).toBe('F2');
        const stored = await page.evaluate(() =>
            JSON.parse(localStorage.getItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`) || '[]').map((l) => `${l.receptionNumber}:${l.name}`));
        expect(stored).toEqual(['F1:성토1', 'F2:성토2']);
    });
});

test.describe('번호 풀과 구분의 정합 — F 없는 성토 레코드 (Fable 검증 PA·PB)', () => {
    const OLD = '2020-01-01T00:00:00.000Z';
    const rec = (id, receptionNumber, subCategory) => ({
        id, receptionNumber, name: `n-${id}`, landClass1: '농가의뢰', subCategory, purpose: '일반재배', createdAt: OLD, updatedAt: OLD, groupId: `g-${id}`,
        parcels: [{ id: `p-${id}`, lotAddress: '내성리 1', isMountain: false, subLots: [], crops: [], category: subCategory, purpose: '', note: '' }],
    });

    async function fillForm(page, name, top, parcelCategory) {
        await page.click('.nav-btn[data-view="form"]');
        await page.selectOption('#subCategory', top);
        await page.fill('#name', name);
        await page.fill('#phoneNumber', '010-1234-5678');
        await page.selectOption('#purpose', '일반재배');
        await page.locator('.lot-address-input').first().fill('내성리 1');
        if (parcelCategory) await page.locator('.parcel-category-select').first().selectOption(parcelCategory);
        return page.inputValue('#receptionNumber');
    }
    const storedNumbers = (page) => page.evaluate(() =>
        JSON.parse(localStorage.getItem(`test_soilSampleLogs_${window.soilManager.selectedYear}`) || '[]').map((l) => `${l.receptionNumber}:${l.name}:${l.subCategory}`));

    test.beforeEach(async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => typeof window.soilManager !== 'undefined');
    });

    test('PA: F 없는 성토 2가 있어도 일반 등록이 3번으로 이어진다 (전에는 2를 다시 내고 중복 검사가 막아 영구 정지)', async ({ page }) => {
        await seedAndReload(page, [rec('a', '1', '논'), rec('b', '2', '성토')]);
        expect(await fillForm(page, '일반셋', '논')).toBe('3');
        await page.click('#navSubmitBtn');
        await expect(page.locator('#closeResultBtn')).toBeEnabled({ timeout: 20000 });
        expect(await storedNumbers(page)).toEqual(['1:n-a:논', '2:n-b:성토', '3:일반셋:논']);
    });

    test('PB: 폼이 만든 F 없는 성토(상단 논 + 필지 성토)가 있어도 다음 일반 추천은 막히지 않는다', async ({ page }) => {
        // 폼은 필지 카드 구분을 레코드 구분으로 저장한다(폼 정합 검사는 SAMPL-1-184 로 분리). F-1 로 이 레코드가 일반 번호를 점유해야 막힘이 풀린다
        await seedAndReload(page, []);
        expect(await fillForm(page, '필지성토', '논', '성토')).toBe('1');
        await page.click('#navSubmitBtn');
        await expect(page.locator('#closeResultBtn')).toBeEnabled({ timeout: 20000 });
        expect(await storedNumbers(page)).toEqual(['1:필지성토:성토']);
        await page.click('#closeResultBtn');
        expect(await fillForm(page, '다음일반', '논')).toBe('2');
    });
});
