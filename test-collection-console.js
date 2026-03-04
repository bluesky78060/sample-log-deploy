/**
 * Firebase 컬렉션 이름 검증 - 브라우저 콘솔에서 실행
 *
 * 사용법:
 * 1. 브라우저 개발자 도구 (F12) 열기
 * 2. Console 탭 선택
 * 3. 이 스크립트 내용을 복사하여 붙여넣고 Enter
 */

(function() {
    console.log('='.repeat(60));
    console.log('Firebase 컬렉션 이름 검증 테스트');
    console.log('='.repeat(60));
    console.log('');

    // 1. COLLECTION_PREFIX 확인
    console.log('1️⃣ COLLECTION_PREFIX 상수 확인');
    const expectedPrefix = 'test_';
    console.log(`   예상 값: "${expectedPrefix}"`);

    // 2. firestoreDb 모듈 로드 확인
    if (!window.firestoreDb) {
        console.error('❌ window.firestoreDb가 로드되지 않았습니다.');
        console.log('   → 페이지가 완전히 로드되었는지 확인하세요.');
        return;
    }
    console.log('✅ firestoreDb 모듈 로드됨');
    console.log('');

    // 3. getCollectionName 함수 확인
    if (typeof window.firestoreDb.getCollectionName !== 'function') {
        console.error('❌ getCollectionName 함수가 없습니다.');
        return;
    }
    console.log('✅ getCollectionName 함수 존재');
    console.log('');

    // 4. 각 시료 타입별 컬렉션 이름 테스트
    console.log('2️⃣ 컬렉션 이름 생성 테스트');
    const sampleTypes = ['soil', 'water', 'compost', 'heavyMetal', 'pesticide'];
    const year = new Date().getFullYear();

    console.log(`   테스트 연도: ${year}`);
    console.log('');

    let allPassed = true;
    const results = [];

    sampleTypes.forEach(type => {
        const collectionName = window.firestoreDb.getCollectionName(type, year);
        const hasPrefix = collectionName.startsWith(expectedPrefix);
        const passed = hasPrefix;

        results.push({
            type,
            name: collectionName,
            hasPrefix,
            passed
        });

        const icon = passed ? '✅' : '❌';
        console.log(`   ${icon} ${type.padEnd(12)} → ${collectionName}`);

        if (!passed) {
            allPassed = false;
            console.warn(`      ⚠️ 경고: test_ 접두사가 없습니다!`);
        }
    });

    console.log('');
    console.log('-'.repeat(60));
    console.log('');

    // 5. 최종 결과
    console.log('3️⃣ 검증 결과');
    if (allPassed) {
        console.log('%c✅ 모든 컬렉션 이름이 올바릅니다!', 'color: green; font-weight: bold;');
    } else {
        console.error('%c❌ 일부 컬렉션 이름이 올바르지 않습니다!', 'color: red; font-weight: bold;');
        console.log('   → 위 경고 메시지를 확인하세요.');
    }
    console.log('');

    // 6. localStorage 확인 (혹시 다른 설정이 있는지)
    console.log('4️⃣ localStorage 설정 확인');
    const relevantKeys = Object.keys(localStorage).filter(key =>
        key.includes('firebase') || key.includes('collection') || key.includes('prefix')
    );

    if (relevantKeys.length === 0) {
        console.log('   관련 설정 없음');
    } else {
        relevantKeys.forEach(key => {
            console.log(`   ${key}: ${localStorage.getItem(key)}`);
        });
    }
    console.log('');

    // 7. Firebase 진단 실행 (있는 경우)
    if (window.firebaseDiagnostics && typeof window.firebaseDiagnostics.diagnose === 'function') {
        console.log('5️⃣ Firebase 전체 진단 실행');
        window.firebaseDiagnostics.diagnose().then(result => {
            console.log('   진단 완료:', result);
            if (result.checks.collectionNames) {
                console.log('   컬렉션 이름 검증:', result.checks.collectionNames);
            }
        }).catch(err => {
            console.error('   진단 실패:', err);
        });
    }

    console.log('='.repeat(60));
    console.log('테스트 완료');
    console.log('='.repeat(60));

    return {
        allPassed,
        results
    };
})();
