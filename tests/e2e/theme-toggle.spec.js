// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('테마 토글 테스트', () => {
  test('메인 페이지에서 테마 토글이 작동하는지 확인', async ({ page }) => {
    // localStorage 초기화를 위해 페이지 로드 전에 설정
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForTimeout(500);

    // 토글 버튼 찾기
    const toggleBtn = page.locator('#themeToggleBtn');
    await expect(toggleBtn).toBeVisible();

    // ThemeManager 확인
    const hasThemeManager = await page.evaluate(() => {
      return typeof window.ThemeManager !== 'undefined';
    });
    expect(hasThemeManager).toBe(true);

    // 현재 테마 확인 (초기값은 light 또는 시스템 설정)
    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('클릭 전 테마:', themeBefore);

    // 버튼 클릭
    await toggleBtn.click();
    await page.waitForTimeout(300);

    // 테마 변경 확인
    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('클릭 후 테마:', themeAfter);

    // 테마가 변경되어야 함
    expect(themeBefore).not.toBe(themeAfter);

    // 다시 클릭하면 원래대로 돌아가야 함
    await toggleBtn.click();
    await page.waitForTimeout(300);

    const themeAfterSecond = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    console.log('두 번째 클릭 후 테마:', themeAfterSecond);

    expect(themeAfterSecond).toBe(themeBefore);
  });

  test('토양 페이지에서 테마 토글이 작동하는지 확인', async ({ page }) => {
    await page.goto('/soil/');

    const toggleBtn = page.locator('#themeToggleBtn');
    await expect(toggleBtn).toBeVisible();

    const themeBefore = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    await toggleBtn.click({ force: true });
    await page.waitForTimeout(300);

    const themeAfter = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));

    expect(themeBefore).not.toBe(themeAfter);
  });
});
