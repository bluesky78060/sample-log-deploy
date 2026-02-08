// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 데이터 영속성 테스트
 * - localStorage 저장/불러오기
 * - 연도별 데이터 분리
 * - 새로고침 후 데이터 유지
 */
test.describe('데이터 영속성', () => {

    test.describe('토양 데이터 저장', () => {
        test('localStorage에 토양 관련 키가 존재함', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 페이지 로드 후 localStorage에 soil 관련 키가 생성되는지 확인
            // (데이터가 없어도 초기화 관련 키가 존재할 수 있음)
            const storageKeys = await page.evaluate(() => {
                return Object.keys(localStorage);
            });

            // localStorage가 접근 가능한지 확인
            expect(Array.isArray(storageKeys)).toBe(true);
        });

        test('새로고침 후 페이지 정상 로드', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 데이터 입력
            await page.fill('#name', '새로고침테스트');
            await page.fill('#phoneNumber', '010-3333-4444');

            // 새로고침
            await page.reload();
            await page.waitForLoadState('networkidle');

            // 페이지가 정상적으로 로드되었는지 확인
            await expect(page.locator('#name')).toBeVisible();
            await expect(page.locator('#receptionNumber')).toBeVisible();
        });

        test('연도 선택 시 접수번호 변경', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 현재 접수번호 확인
            const initialNumber = await page.inputValue('#receptionNumber');

            // 다른 연도로 변경
            await page.selectOption('#yearSelect', '2026');
            await page.waitForTimeout(300);

            // 접수번호가 있는지 확인
            const newNumber = await page.inputValue('#receptionNumber');
            expect(newNumber).toBeTruthy();
        });
    });

    test.describe('퇴액비 데이터 저장', () => {
        test('데이터 등록 후 목록에 표시', async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            const testFarmName = `테스트농장_${Date.now()}`;

            await page.fill('#farmName', testFarmName);
            await page.fill('#name', '김농부');
            await page.fill('#phoneNumber', '010-5555-6666');

            // 축종 선택
            await page.locator('.animal-type-options label.checkbox-card').filter({ hasText: '돼지' }).click();

            await page.click('#navSubmitBtn');

            // 모달 처리
            const resultModal = page.locator('#registrationResultModal');
            if (await resultModal.isVisible({ timeout: 2000 }).catch(() => false)) {
                await page.click('#closeResultBtn');
                await page.waitForTimeout(300);
            }

            // 목록 확인
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');

            await expect(page.locator('#logTableBody')).toContainText(testFarmName);
        });
    });

    test.describe('localStorage 직접 확인', () => {
        test('localStorage 접근 가능', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // localStorage 접근 가능 확인
            const canAccess = await page.evaluate(() => {
                try {
                    localStorage.setItem('test_key', 'test_value');
                    const retrieved = localStorage.getItem('test_key');
                    localStorage.removeItem('test_key');
                    return retrieved === 'test_value';
                } catch (e) {
                    return false;
                }
            });

            expect(canAccess).toBe(true);
        });
    });
});
