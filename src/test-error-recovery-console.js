/**
 * 콘솔에서 에러 복구 기능을 테스트하기 위한 스크립트
 * 브라우저 콘솔에서 아래 명령어를 실행하여 테스트 가능
 */

// 기본 액션 버튼 테스트
console.log('1. 기본 액션 버튼 테스트:');
console.log('showToast("파일 저장에 실패했습니다.", "error", { actionLabel: "다시 시도", action: () => console.log("재시도!") });');

// ErrorHandler를 통한 테스트
console.log('\n2. ErrorHandler를 통한 테스트:');
console.log('ErrorHandler.handle(new Error("Test"), "FILE_WRITE", { retry: () => console.log("Retry!"), showRetryButton: true });');

// 영구 토스트 테스트
console.log('\n3. 영구 토스트 테스트:');
console.log('showToast("이 토스트는 자동으로 사라지지 않습니다.", "warning", { persistent: true, actionLabel: "확인", action: () => console.log("확인!") });');

// 여러 에러 연속 발생
console.log('\n4. 여러 에러 연속 발생:');
console.log(`
const errors = ['NETWORK', 'FILE_WRITE', 'FIREBASE_SYNC'];
errors.forEach((context, index) => {
    setTimeout(() => {
        ErrorHandler.handle(
            new Error('Test error ' + index),
            context,
            {
                retry: () => showToast(context + ' 재시도 성공', 'success'),
                showRetryButton: true
            }
        );
    }, index * 500);
});
`);
