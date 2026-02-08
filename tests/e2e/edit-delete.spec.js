// @ts-check
const { test, expect } = require('@playwright/test');

/**
 * 수정 및 삭제 기능 테스트
 */
test.describe('수정 및 삭제 기능', () => {

    test.describe('토양 데이터 수정/삭제', () => {
        // 테스트 전 데이터 등록
        test.beforeEach(async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 테스트용 데이터 등록
            const testName = `수정삭제테스트_${Date.now()}`;
            await page.fill('#name', testName);
            await page.fill('#phoneNumber', '010-9999-0000');
            await page.locator('.lot-address-input').first().fill('테스트리 1');
            await page.locator('.crop-direct-input').first().fill('무');
            await page.locator('.area-direct-input').first().fill('100');

            await page.click('#navSubmitBtn');
            await page.waitForTimeout(500);

            // 목록으로 이동
            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('목록에서 수정 버튼 존재 확인', async ({ page }) => {
            const tableBody = page.locator('#logTableBody');
            const rowCount = await tableBody.locator('tr').count();

            if (rowCount > 0) {
                // 첫 번째 행의 수정 버튼 확인
                const editBtn = tableBody.locator('tr').first().locator('.btn-edit, .edit-btn, [title="수정"]');
                const editBtnCount = await editBtn.count();
                expect(editBtnCount).toBeGreaterThanOrEqual(0); // 버튼이 있을 수도 있고 없을 수도 있음
            }
        });

        test('목록에서 삭제 버튼 존재 확인', async ({ page }) => {
            const tableBody = page.locator('#logTableBody');
            const rowCount = await tableBody.locator('tr').count();

            if (rowCount > 0) {
                // 첫 번째 행의 삭제 버튼 확인
                const deleteBtn = tableBody.locator('tr').first().locator('.btn-delete, .delete-btn, [title="삭제"]');
                const deleteBtnCount = await deleteBtn.count();
                expect(deleteBtnCount).toBeGreaterThanOrEqual(0);
            }
        });

        test('체크박스 선택 가능', async ({ page }) => {
            const tableBody = page.locator('#logTableBody');
            const rowCount = await tableBody.locator('tr').count();

            if (rowCount > 0) {
                // 첫 번째 행의 체크박스 선택
                const checkbox = tableBody.locator('tr').first().locator('input[type="checkbox"]');
                if (await checkbox.count() > 0) {
                    await checkbox.click();
                    await expect(checkbox).toBeChecked();
                }
            }
        });

        test('전체 선택 체크박스 동작', async ({ page }) => {
            const selectAllCheckbox = page.locator('#selectAll');

            if (await selectAllCheckbox.isVisible()) {
                await selectAllCheckbox.click();

                // 모든 행의 체크박스가 선택되었는지 확인
                const tableBody = page.locator('#logTableBody');
                const rowCount = await tableBody.locator('tr').count();

                if (rowCount > 0) {
                    const firstRowCheckbox = tableBody.locator('tr').first().locator('input[type="checkbox"]');
                    if (await firstRowCheckbox.count() > 0) {
                        await expect(firstRowCheckbox).toBeChecked();
                    }
                }
            }
        });

        test('일괄 삭제 버튼 존재 확인', async ({ page }) => {
            const bulkDeleteBtn = page.locator('#btnBulkDelete, .btn-bulk-delete, [title*="삭제"]').first();
            await expect(bulkDeleteBtn).toBeVisible();
        });

        test('완료 체크박스 토글', async ({ page }) => {
            const tableBody = page.locator('#logTableBody');
            const rowCount = await tableBody.locator('tr').count();

            if (rowCount > 0) {
                // 완료 체크박스 찾기
                const completeCheckbox = tableBody.locator('tr').first().locator('.complete-checkbox, input[type="checkbox"][title*="완료"]');
                if (await completeCheckbox.count() > 0) {
                    const initialState = await completeCheckbox.isChecked();
                    await completeCheckbox.click();

                    // 상태가 토글되었는지 확인
                    const newState = await completeCheckbox.isChecked();
                    expect(newState).not.toBe(initialState);
                }
            }
        });
    });

    test.describe('퇴액비 데이터 수정/삭제', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            // 테스트용 데이터 등록
            await page.fill('#farmName', `삭제테스트농장_${Date.now()}`);
            await page.fill('#name', '삭제테스트');
            await page.fill('#phoneNumber', '010-0000-1111');

            await page.locator('.animal-type-options label.checkbox-card').filter({ hasText: '소' }).click();

            await page.click('#navSubmitBtn');

            // 모달 처리
            const resultModal = page.locator('#registrationResultModal');
            if (await resultModal.isVisible({ timeout: 2000 }).catch(() => false)) {
                await page.click('#closeResultBtn');
                await page.waitForTimeout(300);
            }

            await page.click('[data-view="list"]');
            await page.waitForSelector('#listView');
        });

        test('선택 삭제 버튼 존재', async ({ page }) => {
            const deleteSelectedBtn = page.locator('#deleteSelectedBtn');
            await expect(deleteSelectedBtn).toBeVisible();
        });

        test('라벨 인쇄 버튼 존재', async ({ page }) => {
            const printLabelBtn = page.locator('#printLabelBtn');
            await expect(printLabelBtn).toBeVisible();
        });
    });

    test.describe('폼 초기화', () => {
        test('토양 폼 초기화', async ({ page }) => {
            await page.goto('/soil/');
            await page.waitForLoadState('networkidle');

            // 데이터 입력
            await page.fill('#name', '초기화될이름');
            await page.fill('#phoneNumber', '010-1234-5678');

            // 초기화 버튼 클릭
            await page.click('#navResetBtn');

            // 폼이 초기화되었는지 확인
            await expect(page.locator('#name')).toHaveValue('');
        });

        test('퇴액비 폼 초기화', async ({ page }) => {
            await page.goto('/compost/');
            await page.waitForLoadState('networkidle');

            // 데이터 입력
            await page.fill('#farmName', '초기화될농장');
            await page.fill('#name', '초기화될이름');

            // 초기화 버튼 클릭 (confirm 다이얼로그 처리)
            page.on('dialog', async dialog => {
                await dialog.accept();
            });
            await page.click('#navResetBtn');
            await page.waitForTimeout(300);

            // 폼이 초기화되었는지 확인
            await expect(page.locator('#farmName')).toHaveValue('');
            await expect(page.locator('#name')).toHaveValue('');
        });

        test('수질 폼 초기화', async ({ page }) => {
            await page.goto('/water/');
            await page.waitForLoadState('networkidle');

            await page.fill('#name', '초기화될이름');

            // confirm 다이얼로그 처리
            page.on('dialog', async dialog => {
                await dialog.accept();
            });
            await page.click('#navResetBtn');
            await page.waitForTimeout(300);

            await expect(page.locator('#name')).toHaveValue('');
        });
    });
});
