// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 잔류농약 시료 접수 폼 테스트
 */
test.describe('잔류농약 시료 접수', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/pesticide/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('페이지 기본 요소', () => {
        test('페이지 제목 확인', async ({ page }) => {
            await expect(page).toHaveTitle(/잔류농약/);
        });

        test('접수번호 필드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#receptionNumber')).toBeVisible();
        });

        test('날짜 필드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#date')).toBeVisible();
        });

        test('연도 선택 드롭다운이 있는지 확인', async ({ page }) => {
            await expect(page.locator('#yearSelect')).toBeVisible();
        });

        test('네비게이션 바가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('.pesticide-navbar')).toBeVisible();
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

        test('비고 필드가 존재하는지 확인', async ({ page }) => {
            // 잔류농약 페이지는 작물명을 별도 모달에서 선택함
            await expect(page.locator('#note')).toBeVisible();
        });

        test('비고 입력 가능', async ({ page }) => {
            await page.fill('#note', '테스트 비고');
            await expect(page.locator('#note')).toHaveValue('테스트 비고');
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
