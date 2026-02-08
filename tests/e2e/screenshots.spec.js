// @ts-check
const { test, expect } = require('@playwright/test');
const path = require('path');

const screenshotDir = path.join(__dirname, '../../docs/manual/images');

test.describe('사용 설명서 스크린샷 캡처', () => {

  test('01. 메인 화면', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '01-main.png'),
      fullPage: false
    });
  });

  test('02. 토양 시료 접수 - 등록 화면', async ({ page }) => {
    await page.goto('/soil/');
    await page.waitForLoadState('networkidle');
    // 등록 뷰가 기본
    await page.screenshot({
      path: path.join(screenshotDir, '02-soil-register.png'),
      fullPage: false
    });
  });

  test('03. 토양 시료 - 필지 추가', async ({ page }) => {
    await page.goto('/soil/');
    await page.waitForLoadState('networkidle');

    // 등록 뷰에서 필지 추가된 상태의 스크린샷
    await page.screenshot({
      path: path.join(screenshotDir, '03-soil-parcel.png'),
      fullPage: false
    });
  });

  test('04. 토양 시료 - 목록 화면', async ({ page }) => {
    await page.goto('/soil/');
    await page.waitForLoadState('networkidle');

    // 목록 보기 클릭
    const listViewBtn = page.locator('[data-view="list"], .nav-btn:has-text("목록")');
    if (await listViewBtn.count() > 0) {
      await listViewBtn.first().click();
      await page.waitForTimeout(500);
    }

    await page.screenshot({
      path: path.join(screenshotDir, '04-soil-list.png'),
      fullPage: false
    });
  });

  test('05. 잔류농약 - 등록 화면', async ({ page }) => {
    await page.goto('/pesticide/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '05-pesticide-register.png'),
      fullPage: false
    });
  });

  test('06. 수질 - 등록 화면', async ({ page }) => {
    await page.goto('/water/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '06-water-register.png'),
      fullPage: false
    });
  });

  test('07. 퇴액비 - 등록 화면', async ({ page }) => {
    await page.goto('/compost/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '07-compost-register.png'),
      fullPage: false
    });
  });

  test('08. 중금속 - 등록 화면', async ({ page }) => {
    await page.goto('/heavy-metal/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '08-heavy-metal-register.png'),
      fullPage: false
    });
  });

  test('09. 라벨 인쇄 화면', async ({ page }) => {
    await page.goto('/label-print/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: path.join(screenshotDir, '09-label-print.png'),
      fullPage: false
    });
  });

});
