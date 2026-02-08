// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('필지 중복 허용 테스트', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/soil/');
    await page.waitForTimeout(500);
  });

  test('같은 필지 주소로 여러 필지 추가 가능', async ({ page }) => {
    // 기본 필지가 1개 있음 - 첫 번째 필지 주소 입력
    const firstLotInput = page.locator('.lot-address-input').first();
    await firstLotInput.fill('100');
    await firstLotInput.blur();
    await page.waitForTimeout(300);

    // 두 번째 필지 추가 (같은 주소)
    await page.click('#addParcelBtn');
    await page.waitForTimeout(500);

    const secondLotInput = page.locator('.lot-address-input').nth(1);
    await secondLotInput.fill('100');
    await secondLotInput.blur();
    await page.waitForTimeout(300);

    // 두 필지 모두 존재하는지 확인 (.parcel-card 클래스 사용)
    const parcels = page.locator('.parcel-card');
    await expect(parcels).toHaveCount(2);

    // 두 필지 모두 같은 주소를 가지는지 확인
    const firstValue = await firstLotInput.inputValue();
    const secondValue = await secondLotInput.inputValue();
    expect(firstValue).toBe('100');
    expect(secondValue).toBe('100');
  });

  test('빈 필지 주소 입력 시 경고 메시지 표시', async ({ page }) => {
    // 필지 추가
    await page.click('#addParcelBtn');
    await page.waitForTimeout(500);

    // 먼저 값을 입력했다가 지움 (blur 이벤트 트리거를 위해)
    const lotInput = page.locator('.lot-address-input').first();
    await lotInput.fill('임시값');
    await page.waitForTimeout(100);
    await lotInput.fill('');
    await lotInput.blur();
    await page.waitForTimeout(500);

    // 토스트 메시지 확인 (.toast 클래스 사용)
    const toast = page.locator('.toast');
    await expect(toast).toBeVisible({ timeout: 5000 });
  });

  test('필지별 비고로 구분 가능', async ({ page }) => {
    // 첫 번째 필지 추가
    await page.click('#addParcelBtn');
    await page.waitForTimeout(500);

    const firstLotInput = page.locator('.lot-address-input').first();
    await firstLotInput.fill('100');

    // 첫 번째 필지 비고 입력
    const firstNoteInput = page.locator('.parcel-note-input').first();
    await firstNoteInput.fill('상단 시료');
    await page.waitForTimeout(300);

    // 두 번째 필지 추가 (같은 주소, 다른 비고)
    await page.click('#addParcelBtn');
    await page.waitForTimeout(500);

    const secondLotInput = page.locator('.lot-address-input').nth(1);
    await secondLotInput.fill('100');

    const secondNoteInput = page.locator('.parcel-note-input').nth(1);
    await secondNoteInput.fill('하단 시료');
    await page.waitForTimeout(300);

    // 비고가 다르게 저장되었는지 확인
    const firstNote = await firstNoteInput.inputValue();
    const secondNote = await secondNoteInput.inputValue();

    expect(firstNote).toBe('상단 시료');
    expect(secondNote).toBe('하단 시료');
  });

  test('안내 배너가 표시되는지 확인', async ({ page }) => {
    const infoBanner = page.locator('.info-banner');
    await expect(infoBanner).toBeVisible();
    await expect(infoBanner).toContainText('같은 필지에 여러 시료 접수 가능');
  });
});
