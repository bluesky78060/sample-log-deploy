// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 흙토람 검정결과 형제 동기화 — SAMPL-2-27
 *
 * 접수번호는 경지구분·성토별 독립 시퀀스라 농가의뢰 5와 공익직불제 5가 한 표에 함께 오른다.
 * 본번만 보고 형제로 묶으면 한쪽에 입력한 분석값이 다른 농가 시료에 저장된다.
 */

function seedLog(id, receptionNumber, landClass1, subCategory = '논') {
    return {
        id, receptionNumber, date: '2026-03-02', name: `농가-${id}`, phoneNumber: '010-0000-0000',
        address: '봉화읍', subCategory, purpose: '일반재배', landClass1, isComplete: false,
        parcels: [{ lotAddress: `내성리 ${id}`, isMountain: false, subLots: [],
            crops: [{ name: '벼', area: '100' }], category: subCategory, purpose: '일반재배' }],
    };
}

async function openWith(page, logs) {
    await page.goto('/heuktoram/');
    await page.waitForLoadState('networkidle');
    await page.evaluate((data) => {
        localStorage.clear();
        localStorage.setItem(`test_soilSampleLogs_${new Date().getFullYear()}`, JSON.stringify(data));
    }, logs);
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForFunction(() => (window.heuktoramManager?.flatRows?.length ?? 0) > 0);
}

async function cell(page, key, field) {
    const idx = await page.evaluate((k) => window.heuktoramManager.flatRows.findIndex((r) => r.key === k), key);
    expect(idx).toBeGreaterThanOrEqual(0);
    return page.locator(`td[data-row="${idx}"][data-field="${field}"]`);
}

async function readPH(page) {
    return page.evaluate(() => {
        const raw = localStorage.getItem(`test_soilTestResults_${new Date().getFullYear()}`);
        const map = raw ? JSON.parse(raw) : {};
        return Object.fromEntries(Object.entries(map).map(([k, v]) => [k, v.pH ?? null]));
    });
}

async function editPH(page, key, value) {
    const td = await cell(page, key, 'pH');
    await td.click();
    await page.keyboard.type(value);
    await td.evaluate((el) => el.blur());
}

test.describe('흙토람 — 같은 본번이 다른 번호 풀에 있을 때', () => {
    test('셀 편집은 다른 경지구분의 같은 번호에 저장되지 않는다', async ({ page }) => {
        await openWith(page, [seedLog('a', '5', '농가의뢰'), seedLog('b', '5', '공익직불제')]);
        await editPH(page, 'a_0_c0', '6.5');

        await expect.poll(async () => (await readPH(page)).a_0_c0).toBe('6.5');
        expect((await readPH(page)).b_0_c0 ?? null).toBeNull();
        await expect(await cell(page, 'b_0_c0', 'pH')).toHaveText('');
    });

    test('붙여넣기는 다른 경지구분의 같은 번호에 저장되지 않는다', async ({ page }) => {
        await openWith(page, [seedLog('a', '5', '농가의뢰'), seedLog('b', '5', '공익직불제')]);
        const td = await cell(page, 'b_0_c0', 'pH');
        await td.click();
        await page.evaluate(() => {
            const dt = new DataTransfer();
            dt.setData('text/plain', '7.1');
            document.dispatchEvent(new ClipboardEvent('paste', { clipboardData: dt, bubbles: true, cancelable: true }));
        });

        await expect.poll(async () => (await readPH(page)).b_0_c0).toBe('7.1');
        expect((await readPH(page)).a_0_c0 ?? null).toBeNull();
    });

    test('성토 시료와 일반 시료는 번호가 같아도 형제가 아니다', async ({ page }) => {
        await openWith(page, [seedLog('a', '5', '농가의뢰'), seedLog('f', '5', '농가의뢰', '성토')]);
        await editPH(page, 'a_0_c0', '6.2');

        await expect.poll(async () => (await readPH(page)).a_0_c0).toBe('6.2');
        expect((await readPH(page)).f_0_c0 ?? null).toBeNull();
    });

    test('같은 경지구분의 가지번호(5 → 5-1)에는 계속 동기화된다', async ({ page }) => {
        await openWith(page, [seedLog('a', '5', '농가의뢰'), seedLog('c', '5-1', undefined)]);
        await editPH(page, 'a_0_c0', '6.8');

        await expect.poll(async () => (await readPH(page)).c_0_c0).toBe('6.8');
    });
});
