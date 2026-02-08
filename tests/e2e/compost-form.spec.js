// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 퇴·액비 시료 접수 폼 테스트
 */
test.describe('퇴액비 시료 접수', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/compost/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('페이지 기본 요소', () => {
        test('페이지 제목 확인', async ({ page }) => {
            await expect(page).toHaveTitle(/퇴.*액비|퇴비/);
        });

        test('접수번호 필드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#receptionNumber')).toBeVisible();
        });

        test('날짜 필드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#date')).toBeVisible();
        });

        test('네비게이션 바가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('.compost-navbar')).toBeVisible();
        });
    });

    test.describe('폼 입력', () => {
        test('농장명 입력 가능', async ({ page }) => {
            await page.fill('#farmName', '테스트농장');
            await expect(page.locator('#farmName')).toHaveValue('테스트농장');
        });

        test('대표자명 입력 가능', async ({ page }) => {
            await page.fill('#name', '홍길동');
            await expect(page.locator('#name')).toHaveValue('홍길동');
        });

        test('전화번호 입력 가능', async ({ page }) => {
            await page.fill('#phoneNumber', '010-1234-5678');
            await expect(page.locator('#phoneNumber')).toHaveValue('010-1234-5678');
        });

        test('농장주소 입력 가능', async ({ page }) => {
            const farmAddressInput = page.locator('#farmAddressFull');
            await farmAddressInput.fill('봉화군 봉화읍 내성리 123');
            await expect(farmAddressInput).toHaveValue('봉화군 봉화읍 내성리 123');
        });

        test('농장면적 입력 가능', async ({ page }) => {
            await page.fill('#farmArea', '5000');
            // 면적 필드는 자동 포매팅되어 천 단위 구분자가 추가됨
            await expect(page.locator('#farmArea')).toHaveValue('5,000');
        });
    });

    test.describe('시료종류 선택', () => {
        test('가축분퇴비 선택 가능', async ({ page }) => {
            const label = page.locator('label.checkbox-card').filter({ hasText: '가축분퇴비' });
            await label.click();
            const radio = label.locator('input[type="radio"]');
            await expect(radio).toBeChecked();
        });

        test('가축분뇨발효액 선택 가능', async ({ page }) => {
            const label = page.locator('label.checkbox-card').filter({ hasText: '가축분뇨발효액' });
            await label.click();
            const radio = label.locator('input[type="radio"]');
            await expect(radio).toBeChecked();
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
            await expect(page.locator('#statsBtn')).toBeVisible();
        });

        test('목록 뷰 영역 확인', async ({ page }) => {
            // 데이터가 없을 때는 테이블이 숨겨지고 빈 상태가 표시됨
            await expect(page.locator('.table-wrapper')).toBeVisible();
        });
    });
});
