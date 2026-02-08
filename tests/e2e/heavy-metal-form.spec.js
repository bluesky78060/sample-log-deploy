// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 토양 중금속 시료 접수 폼 테스트
 */
test.describe('토양 중금속 시료 접수', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/heavy-metal/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('페이지 기본 요소', () => {
        test('페이지 제목 확인', async ({ page }) => {
            await expect(page).toHaveTitle(/중금속/);
        });

        test('접수번호 필드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#receptionNumber')).toBeVisible();
        });

        test('날짜 필드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#date')).toBeVisible();
        });

        test('네비게이션 바가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('.heavy-metal-navbar')).toBeVisible();
        });

        test('메인 콘텐츠 영역이 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('.main-content')).toBeVisible();
        });
    });

    test.describe('폼 입력', () => {
        test('성명 입력 가능', async ({ page }) => {
            await page.fill('#name', '홍길동');
            await expect(page.locator('#name')).toHaveValue('홍길동');
        });

        test('전화번호 입력 가능', async ({ page }) => {
            await page.fill('#phoneNumber', '010-1234-5678');
            await expect(page.locator('#phoneNumber')).toHaveValue('010-1234-5678');
        });

        test('비고 입력 가능', async ({ page }) => {
            await page.fill('#note', '테스트 비고');
            await expect(page.locator('#note')).toHaveValue('테스트 비고');
        });
    });

    test.describe('수령방법 선택', () => {
        test('우편 선택 가능', async ({ page }) => {
            const btn = page.locator('.reception-method-btn[data-method="우편"]');
            await btn.click();
            await expect(btn).toHaveClass(/active/);
        });

        test('이메일 선택 가능', async ({ page }) => {
            const btn = page.locator('.reception-method-btn[data-method="이메일"]');
            await btn.click();
            await expect(btn).toHaveClass(/active/);
        });
    });

    test.describe('뷰 전환', () => {
        test('접수 뷰와 목록 뷰 전환', async ({ page }) => {
            // 목록 뷰로 전환
            await page.click('[data-view="list"]');
            await expect(page.locator('#listView')).toBeVisible();

            // 접수 뷰로 전환
            await page.click('[data-view="form"]');
            await expect(page.locator('#formView')).toBeVisible();
        });
    });

    test.describe('목록 기능', () => {
        test.beforeEach(async ({ page }) => {
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('검색 버튼 존재 확인', async ({ page }) => {
            await expect(page.locator('#openSearchModalBtn')).toBeVisible();
        });

        test('통계 버튼 존재 확인', async ({ page }) => {
            await expect(page.locator('#btnStatistics')).toBeVisible();
        });

        test('목록 뷰 영역 확인', async ({ page }) => {
            await expect(page.locator('.table-wrapper')).toBeVisible();
        });
    });
});
