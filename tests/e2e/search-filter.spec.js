// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 검색 및 필터 기능 테스트
 */
test.describe('검색 및 필터 기능', () => {

    test.describe('토양 검색', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 목록 뷰로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('검색 모달 열기/닫기', async ({ page }) => {
            // 검색 버튼 클릭
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 모달 닫기
            await page.click('#closeSearchModal');
            await expect(page.locator('#listSearchModal')).toBeHidden();
        });

        test('검색 모달 내 날짜 필드 존재', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 날짜 범위 입력 필드 확인
            await expect(page.locator('#searchDateFromInput')).toBeVisible();
            await expect(page.locator('#searchDateToInput')).toBeVisible();
        });

        test('검색 모달 내 이름 검색 필드 존재', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 이름 검색 필드 확인
            await expect(page.locator('#searchNameInput')).toBeVisible();
        });

        test('검색 모달 내 접수번호 범위 필드 존재', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 접수번호 범위 필드 확인
            await expect(page.locator('#searchReceptionFromInput')).toBeVisible();
            await expect(page.locator('#searchReceptionToInput')).toBeVisible();
        });

        test('이름으로 검색 입력', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 이름 입력
            await page.fill('#searchNameInput', '홍길동');
            await expect(page.locator('#searchNameInput')).toHaveValue('홍길동');

            // 검색 버튼 클릭
            await page.click('#applySearchBtn');

            // 모달이 닫히는지 확인
            await expect(page.locator('#listSearchModal')).toBeHidden();
        });

        test('날짜 범위 검색 입력', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 날짜 범위 입력
            await page.fill('#searchDateFromInput', '2025-01-01');
            await page.fill('#searchDateToInput', '2025-12-31');

            await expect(page.locator('#searchDateFromInput')).toHaveValue('2025-01-01');
            await expect(page.locator('#searchDateToInput')).toHaveValue('2025-12-31');
        });

        test('검색 초기화 기능', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 검색어 입력
            await page.fill('#searchNameInput', '테스트');

            // 전체 초기화 버튼 클릭
            await page.click('#resetSearchBtn');

            // 검색어가 초기화되었는지 확인
            await expect(page.locator('#searchNameInput')).toHaveValue('');
        });

        test('날짜 필드 초기화 버튼', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 날짜 입력
            await page.fill('#searchDateFromInput', '2025-01-01');

            // 날짜 초기화 버튼 클릭
            await page.click('#clearSearchDate');

            // 날짜가 초기화되었는지 확인
            await expect(page.locator('#searchDateFromInput')).toHaveValue('');
        });
    });

    test.describe('퇴액비 검색', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('검색 모달 열기', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();
        });

        test('검색 필드 입력 가능', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 이름 검색
            await page.fill('#searchNameInput', '김농부');
            await expect(page.locator('#searchNameInput')).toHaveValue('김농부');
        });
    });

    test.describe('수질 검색', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/water/');
            await page.waitForLoadState('networkidle');

            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('검색 모달 열기', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();
        });
    });

    test.describe('잔류농약 검색', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/pesticide/');
            await page.waitForLoadState('networkidle');

            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('검색 모달 열기', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();
        });
    });

    test.describe('중금속 검색', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/heavy-metal/');
            await page.waitForLoadState('networkidle');

            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('검색 모달 열기', async ({ page }) => {
            await page.click('#openSearchModalBtn');
            await expect(page.locator('#listSearchModal')).toBeVisible();
        });
    });
});
