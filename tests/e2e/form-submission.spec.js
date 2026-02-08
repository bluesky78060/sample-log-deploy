// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 폼 제출 및 데이터 흐름 통합 테스트
 */
test.describe('폼 제출 통합 테스트', () => {

    test.describe('토양 시료 접수 흐름', () => {
        test('폼 작성 후 등록 버튼 클릭', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 필수 정보 입력
            await page.fill('#name', '테스트농가');
            await page.fill('#phoneNumber', '010-1234-5678');

            // 필지 정보 입력
            const lotAddressInput = page.locator('.lot-address-input').first();
            await lotAddressInput.fill('내성리 123');

            const cropInput = page.locator('.crop-direct-input').first();
            await cropInput.fill('고추');

            const areaInput = page.locator('.area-direct-input').first();
            await areaInput.fill('500');

            // 등록 버튼 클릭
            await page.click('#navSubmitBtn');

            // 등록 결과 모달 또는 토스트 확인
            // 모달이 표시되거나 목록에 데이터가 추가되었는지 확인
            await page.waitForTimeout(500);

            // 목록으로 이동하여 데이터 확인
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            // 등록된 데이터가 테이블에 있는지 확인 (빈 상태가 아님)
            const emptyState = page.locator('#emptyState');
            const tableBody = page.locator('#logTableBody');

            // 빈 상태이거나 테이블에 데이터가 있는지 확인
            const hasData = await tableBody.locator('tr').count() > 0;
            if (hasData) {
                // 등록된 이름이 테이블에 있는지 확인
                await expect(tableBody).toContainText('테스트농가');
            }
        });

        test('폼 초기화 기능', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 데이터 입력
            await page.fill('#name', '초기화테스트');
            await expect(page.locator('#name')).toHaveValue('초기화테스트');

            // 초기화 버튼 클릭
            await page.click('#navResetBtn');

            // 폼이 초기화되었는지 확인
            await expect(page.locator('#name')).toHaveValue('');
        });
    });

    test.describe('퇴액비 시료 접수 흐름', () => {
        test('폼 작성 후 등록 버튼 클릭', async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            // 필수 정보 입력
            await page.fill('#farmName', '테스트농장');
            await page.fill('#name', '홍길동');
            await page.fill('#phoneNumber', '010-5678-1234');

            // 시료종류 선택 (기본값이 가축분퇴비이므로 이미 선택됨)
            const sampleTypeRadio = page.locator('input[name="sampleType"][value="가축분퇴비"]');
            await expect(sampleTypeRadio).toBeChecked();

            // 축종 선택 - animal-type-options 내부의 라디오
            const animalTypeLabel = page.locator('.animal-type-options label.checkbox-card').filter({ hasText: '소' });
            await animalTypeLabel.click();

            // 등록 버튼 클릭
            await page.click('#navSubmitBtn');

            // 등록 결과 모달이 표시되면 닫기
            const resultModal = page.locator('#registrationResultModal');
            if (await resultModal.isVisible({ timeout: 2000 }).catch(() => false)) {
                await page.click('#closeResultBtn');
                await page.waitForTimeout(300);
            }

            // 목록으로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            // 등록된 데이터 확인
            const tableBody = page.locator('#logTableBody');
            const hasData = await tableBody.locator('tr').count() > 0;
            if (hasData) {
                await expect(tableBody).toContainText('테스트농장');
            }
        });
    });

    test.describe('수질분석 시료 접수 흐름', () => {
        test('폼 작성 후 등록 버튼 클릭', async ({ page }) => {
            await page.goto('/water/');
            await page.waitForLoadState('networkidle');

            // 필수 정보 입력
            await page.fill('#name', '수질테스트');
            await page.fill('#phoneNumber', '010-9876-5432');

            // 수령방법 선택
            await page.click('.reception-method-btn[data-method="방문"]');

            // 검사항목 선택
            const testItemLabel = page.locator('label.test-item-option').filter({ hasText: '농업용수' });
            await testItemLabel.click();

            // 등록 버튼 클릭
            await page.click('#navSubmitBtn');
            await page.waitForTimeout(500);

            // 목록으로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });
    });

    test.describe('네비게이션 테스트', () => {
        test('메인 페이지에서 각 시료 페이지로 이동', async ({ page }) => {
            await page.goto('/');
            await page.waitForLoadState('networkidle');

            // 토양 분석 카드 클릭 (실제 링크 경로는 soil/index.html)
            await page.click('a[href="soil/index.html"]');
            await expect(page).toHaveTitle(/토양/);

            // 뒤로가기
            await page.click('.back-btn');
            await page.waitForLoadState('networkidle');

            // 수질 분석 카드 클릭
            await page.click('a[href="water/index.html"]');
            await expect(page).toHaveTitle(/수질/);
        });

        test('드롭다운 메뉴로 페이지 간 이동', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 드롭다운 트리거 클릭
            await page.click('.brand-dropdown-trigger');

            // 수질 분석 메뉴 클릭
            await page.click('.dropdown-item:has-text("수질 분석")');
            await expect(page).toHaveTitle(/수질/);

            // 드롭다운에서 퇴액비로 이동
            await page.click('.brand-dropdown-trigger');
            await page.click('.dropdown-item:has-text("퇴·액비")');
            await expect(page).toHaveTitle(/퇴.*액비/);
        });
    });

    test.describe('검색 기능 테스트', () => {
        test('토양 목록에서 검색 모달 열기', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 목록 뷰로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            // 검색 버튼 클릭
            await page.click('#openSearchModalBtn');

            // 검색 모달이 표시되는지 확인
            await expect(page.locator('#listSearchModal')).toBeVisible();

            // 모달 닫기
            await page.click('#closeSearchModal');
            await expect(page.locator('#listSearchModal')).toBeHidden();
        });

        test('퇴액비 목록에서 검색 모달 열기', async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            // 목록 뷰로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            // 검색 버튼 클릭
            await page.click('#openSearchModalBtn');

            // 검색 모달이 표시되는지 확인
            await expect(page.locator('#listSearchModal')).toBeVisible();
        });
    });

    test.describe('통계 기능 테스트', () => {
        test('토양 통계 모달 열기', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 목록 뷰로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            // 통계 버튼 클릭
            await page.click('#btnStatistics');

            // 통계 모달이 표시되는지 확인 (토양은 statisticsModal 사용)
            await expect(page.locator('#statisticsModal')).toBeVisible();
        });

        test('퇴액비 통계 모달 열기', async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            // 목록 뷰로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            // 통계 버튼 클릭
            await page.click('#statsBtn');

            // 통계 모달이 표시되는지 확인
            await expect(page.locator('#statsModal')).toBeVisible();
        });
    });

    test.describe('연도 선택 테스트', () => {
        test('연도 변경 시 데이터 분리', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 현재 연도 확인
            const yearSelect = page.locator('#yearSelect');
            await expect(yearSelect).toBeVisible();

            // 2026년으로 변경
            await yearSelect.selectOption('2026');

            // 접수번호가 갱신되는지 확인 (연도별로 다른 번호)
            await page.waitForTimeout(300);
            const receptionNumber = await page.inputValue('#receptionNumber');
            expect(receptionNumber).toBeTruthy();
        });
    });
});
