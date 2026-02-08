// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 토양 시료 접수 폼 테스트
 */
test.describe('토양 시료 접수', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/soil/');
        await page.waitForLoadState('networkidle');
    });

    test.describe('페이지 기본 요소', () => {
        test('페이지 제목 확인', async ({ page }) => {
            await expect(page).toHaveTitle(/토양/);
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
            await expect(page.locator('.navbar')).toBeVisible();
        });

        test('메인 콘텐츠 영역이 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('.main-content')).toBeVisible();
        });
    });

    test.describe('필지 관리', () => {
        test('필지 추가 버튼이 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('#addParcelBtn')).toBeVisible();
        });

        test('초기 필지 카드가 존재하는지 확인', async ({ page }) => {
            await expect(page.locator('.parcel-card').first()).toBeVisible();
        });

        test('필지 추가 시 새 카드 생성', async ({ page }) => {
            const initialCount = await page.locator('.parcel-card').count();
            await page.click('#addParcelBtn');
            await expect(page.locator('.parcel-card')).toHaveCount(initialCount + 1);
        });

        test('필지별 구분 라디오 버튼 존재 확인', async ({ page }) => {
            await expect(page.locator('.parcel-category-radios').first()).toBeVisible();
        });

        test('필지별 구분 라디오 버튼 선택 가능', async ({ page }) => {
            const radioLabel = page.locator('.parcel-category-label').filter({ hasText: '논' }).first();
            await radioLabel.click();
            const radio = radioLabel.locator('input[type="radio"]');
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

    test.describe('구분 선택', () => {
        test('구분 드롭다운 옵션 확인', async ({ page }) => {
            const select = page.locator('#subCategory');
            await expect(select).toBeVisible();

            // 옵션 확인
            await expect(select.locator('option[value="논"]')).toBeAttached();
            await expect(select.locator('option[value="밭"]')).toBeAttached();
            await expect(select.locator('option[value="과수"]')).toBeAttached();
            await expect(select.locator('option[value="시설"]')).toBeAttached();
            await expect(select.locator('option[value="성토"]')).toBeAttached();
        });

        test('성토 선택 시 접수번호 F 접두사', async ({ page }) => {
            await page.selectOption('#subCategory', '성토');
            const receptionNumber = await page.inputValue('#receptionNumber');
            expect(receptionNumber).toMatch(/^F\d+$/);
        });
    });

    test.describe('폼 입력', () => {
        test('기본 정보 입력 가능', async ({ page }) => {
            // 성명 입력
            await page.fill('#name', '홍길동');
            await expect(page.locator('#name')).toHaveValue('홍길동');

            // 전화번호 입력
            await page.fill('#phoneNumber', '010-1234-5678');
            await expect(page.locator('#phoneNumber')).toHaveValue('010-1234-5678');
        });

        test('필지 주소 입력 가능', async ({ page }) => {
            const lotAddressInput = page.locator('.lot-address-input').first();
            await lotAddressInput.fill('문단리 123');
            await expect(lotAddressInput).toHaveValue('문단리 123');
        });

        test('작물명 입력 가능', async ({ page }) => {
            const cropInput = page.locator('.crop-direct-input').first();
            await cropInput.fill('고추');
            await expect(cropInput).toHaveValue('고추');
        });

        test('면적 입력 가능', async ({ page }) => {
            const areaInput = page.locator('.area-direct-input').first();
            await areaInput.fill('1000');
            await expect(areaInput).toHaveValue('1000');
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
            // 데이터가 없을 때는 테이블이 숨겨지고 빈 상태가 표시됨
            await expect(page.locator('.table-wrapper')).toBeVisible();
        });
    });
});
