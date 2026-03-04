#!/usr/bin/env node

/**
 * Firebase 데이터 마이그레이션 스크립트
 * soilSamples_2026 → test_soilSamples_2026
 *
 * 실행 방법:
 * 1. Firebase Admin SDK 서비스 계정 키 다운로드
 * 2. GOOGLE_APPLICATION_CREDENTIALS 환경 변수 설정
 * 3. node migrate-firebase-data.js
 */

const admin = require('firebase-admin');
const readline = require('readline');

// Firebase Admin 초기화
if (!admin.apps.length) {
    // 환경 변수에서 서비스 계정 키 경로 읽기
    if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        admin.initializeApp({
            credential: admin.credential.applicationDefault()
        });
    } else {
        console.error('❌ GOOGLE_APPLICATION_CREDENTIALS 환경 변수가 설정되지 않았습니다.');
        console.error('');
        console.error('설정 방법:');
        console.error('1. Firebase Console → 프로젝트 설정 → 서비스 계정');
        console.error('2. "새 비공개 키 생성" 클릭 → JSON 다운로드');
        console.error('3. export GOOGLE_APPLICATION_CREDENTIALS="/path/to/serviceAccountKey.json"');
        process.exit(1);
    }
}

const db = admin.firestore();

// 마이그레이션할 컬렉션 목록
const COLLECTIONS = [
    { source: 'soilSamples_2026', target: 'test_soilSamples_2026', name: '토양' },
    { source: 'waterSamples_2026', target: 'test_waterSamples_2026', name: '수질분석' },
    { source: 'compostSamples_2026', target: 'test_compostSamples_2026', name: '퇴·액비' },
    { source: 'heavyMetalSamples_2026', target: 'test_heavyMetalSamples_2026', name: '토양 중금속' },
    { source: 'pesticideSamples_2026', target: 'test_pesticideSamples_2026', name: '잔류농약' }
];

/**
 * 사용자 확인 받기
 */
async function confirm(message) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    return new Promise((resolve) => {
        rl.question(message + ' (y/N): ', (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes');
        });
    });
}

/**
 * 컬렉션 상태 확인
 */
async function checkStatus() {
    console.log('\n📊 컬렉션 상태 확인\n');
    console.log('┌─────────────┬──────────────────────────────┬───────┬──────────────────────────────┬───────┐');
    console.log('│ 타입        │ 원본 컬렉션                  │ 건수  │ 대상 컬렉션                  │ 건수  │');
    console.log('├─────────────┼──────────────────────────────┼───────┼──────────────────────────────┼───────┤');

    const status = [];

    for (const collection of COLLECTIONS) {
        const sourceSnapshot = await db.collection(collection.source).get();
        const targetSnapshot = await db.collection(collection.target).get();

        const sourceCount = sourceSnapshot.size;
        const targetCount = targetSnapshot.size;

        console.log(
            `│ ${collection.name.padEnd(11)} │ ${collection.source.padEnd(28)} │ ${String(sourceCount).padStart(5)} │ ${collection.target.padEnd(28)} │ ${String(targetCount).padStart(5)} │`
        );

        status.push({
            ...collection,
            sourceCount,
            targetCount,
            needsMigration: sourceCount > 0 && targetCount === 0
        });
    }

    console.log('└─────────────┴──────────────────────────────┴───────┴──────────────────────────────┴───────┘');

    return status;
}

/**
 * 단일 컬렉션 마이그레이션
 */
async function migrateCollection(source, target, name) {
    try {
        console.log(`\n🔄 ${name} 마이그레이션 시작: ${source} → ${target}`);

        // 원본 데이터 조회
        const snapshot = await db.collection(source).get();

        if (snapshot.empty) {
            console.log(`   ⚠️  원본 컬렉션이 비어있습니다. 스킵합니다.`);
            return { success: true, copied: 0, skipped: true };
        }

        const totalDocs = snapshot.size;
        console.log(`   📦 원본 문서: ${totalDocs}건`);

        // Firestore batch는 최대 500개
        const BATCH_SIZE = 500;
        let copiedCount = 0;

        for (let i = 0; i < snapshot.docs.length; i += BATCH_SIZE) {
            const batch = db.batch();
            const chunk = snapshot.docs.slice(i, Math.min(i + BATCH_SIZE, snapshot.docs.length));

            chunk.forEach(doc => {
                const targetRef = db.collection(target).doc(doc.id);
                batch.set(targetRef, doc.data());
            });

            await batch.commit();
            copiedCount += chunk.length;

            const percentage = Math.round((copiedCount / totalDocs) * 100);
            console.log(`   ⏳ 진행: ${copiedCount}/${totalDocs} (${percentage}%)`);
        }

        console.log(`   ✅ 완료: ${copiedCount}건 복사됨`);

        return { success: true, copied: copiedCount };

    } catch (error) {
        console.error(`   ❌ 오류: ${error.message}`);
        return { success: false, error: error.message };
    }
}

/**
 * 전체 마이그레이션 실행
 */
async function migrate(dryRun = false) {
    console.log('\n' + '='.repeat(80));
    console.log(`🔄 Firebase 데이터 마이그레이션 ${dryRun ? '(DRY RUN)' : ''}`);
    console.log('='.repeat(80));

    // 상태 확인
    const status = await checkStatus();

    // 마이그레이션 필요한 항목 확인
    const needsMigration = status.filter(s => s.needsMigration);

    if (needsMigration.length === 0) {
        console.log('\n✅ 모든 컬렉션이 이미 마이그레이션되었거나 원본이 비어있습니다.');
        return;
    }

    console.log(`\n⚠️  마이그레이션이 필요한 컬렉션: ${needsMigration.length}개`);
    needsMigration.forEach(item => {
        console.log(`   - ${item.name}: ${item.sourceCount}건`);
    });

    if (dryRun) {
        console.log('\n📋 DRY RUN 모드: 실제 복사는 수행하지 않습니다.');
        console.log('실제 마이그레이션: node migrate-firebase-data.js --execute');
        return;
    }

    // 사용자 확인
    console.log('\n⚠️  주의: 이 작업은 데이터를 실제로 복사합니다.');
    const confirmed = await confirm('계속하시겠습니까?');

    if (!confirmed) {
        console.log('\n❌ 마이그레이션이 취소되었습니다.');
        return;
    }

    // 마이그레이션 실행
    const results = [];

    for (const item of needsMigration) {
        const result = await migrateCollection(item.source, item.target, item.name);
        results.push({ ...item, ...result });
    }

    // 결과 요약
    console.log('\n' + '='.repeat(80));
    console.log('📊 마이그레이션 결과');
    console.log('='.repeat(80));

    let totalCopied = 0;
    let successCount = 0;
    let failedCount = 0;

    results.forEach(result => {
        if (result.success) {
            successCount++;
            if (!result.skipped) {
                totalCopied += result.copied;
                console.log(`✅ ${result.name}: ${result.copied}건 복사 완료`);
            } else {
                console.log(`⚠️  ${result.name}: 스킵됨 (원본 비어있음)`);
            }
        } else {
            failedCount++;
            console.log(`❌ ${result.name}: 실패 - ${result.error}`);
        }
    });

    console.log('\n' + '-'.repeat(80));
    console.log(`총 ${results.length}개 중 ${successCount}개 성공, ${failedCount}개 실패`);
    console.log(`총 ${totalCopied}건의 문서가 복사되었습니다.`);
    console.log('='.repeat(80));

    if (successCount > 0) {
        console.log('\n✨ 마이그레이션이 완료되었습니다!');
        console.log('앱을 새로고침하면 test_ 컬렉션의 데이터를 볼 수 있습니다.');
    }
}

// 실행
const args = process.argv.slice(2);
const dryRun = !args.includes('--execute');

migrate(dryRun)
    .then(() => {
        console.log('\n프로그램을 종료합니다.');
        process.exit(0);
    })
    .catch(error => {
        console.error('\n❌ 치명적 오류:', error);
        process.exit(1);
    });
