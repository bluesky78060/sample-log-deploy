// @ts-check
const { test, expect } = require('@playwright/test');

test.describe('수정 기능 테스트', () => {
  test('토양 페이지에서 수정 시 입력이 가능한지 확인', async ({ page }) => {
    // 콘솔 로그 수집
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto('/soil/');
    await page.waitForTimeout(500);

    // 데이터를 직접 추가하고 렌더링 함수 호출
    await page.evaluate(() => {
      const year = new Date().getFullYear();
      const testData = [{
        id: 'test-1',
        receptionNumber: '1',
        date: `${year}-01-08`,
        name: '홍길동',
        phoneNumber: '010-1234-5678',
        address: '(12345) 경북 봉화군 봉화읍',
        subCategory: '논',
        purpose: '작물재배',
        receptionMethod: '직접수령',
        parcels: [{
          lotAddress: '100',
          isMountain: false,
          subLots: [],
          crops: [{ crop: '벼', area: 1000 }],
          category: '논',
          note: ''
        }],
        note: '테스트 비고'
      }];
      localStorage.setItem(`soilSampleLogs_${year}`, JSON.stringify(testData));
    });

    // 페이지 새로고침
    await page.reload();
    await page.waitForTimeout(500);

    // 데이터 보기 탭 클릭
    await page.click('.nav-btn[data-view="list"]');
    await page.waitForTimeout(300);

    // 테이블 행 수 확인
    const rowCount = await page.locator('#logTableBody tr').count();
    console.log('테이블 행 수:', rowCount);

    expect(rowCount).toBeGreaterThan(0);

    // 수정 버튼 클릭
    await page.click('.btn-edit');
    await page.waitForTimeout(500);

    // 이름 필드 확인 및 입력 시도
    const nameInput = page.locator('#name');
    const currentName = await nameInput.inputValue();
    console.log('현재 이름 값:', currentName);

    // 이름 필드 상태 확인
    const nameDisabled = await nameInput.isDisabled();
    const nameReadonly = await nameInput.getAttribute('readonly');
    console.log('이름 필드 disabled:', nameDisabled);
    console.log('이름 필드 readonly:', nameReadonly);

    // 입력 시도
    await nameInput.clear();
    await nameInput.type('수정된이름');
    const newName = await nameInput.inputValue();
    console.log('입력 후 이름 값:', newName);

    // 필지 주소 필드 확인
    const lotInput = page.locator('.lot-address-input').first();
    const currentLot = await lotInput.inputValue();
    console.log('현재 필지주소 값:', currentLot);

    const lotDisabled = await lotInput.isDisabled();
    const lotReadonly = await lotInput.getAttribute('readonly');
    console.log('필지주소 필드 disabled:', lotDisabled);
    console.log('필지주소 필드 readonly:', lotReadonly);

    await lotInput.clear();
    await lotInput.type('200');
    const newLot = await lotInput.inputValue();
    console.log('입력 후 필지주소 값:', newLot);

    // 콘솔 에러 출력
    if (consoleErrors.length > 0) {
      console.log('=== 콘솔 에러 ===');
      consoleErrors.forEach(err => console.log(err));
    }

    // 검증
    expect(newName).toBe('수정된이름');
    expect(newLot).toBe('200');
  });
});
