/**
 * @fileoverview Firebase 컬렉션 마이그레이션 도구
 * @description soilSamples_2026 → test_soilSamples_2026 데이터 복사
 */

/**
 * Firebase 컬렉션 마이그레이션
 * 원본 컬렉션 → test_ 컬렉션으로 데이터 복사
 */
class FirebaseMigrationTool {
    constructor() {
        this.db = null;
        this.migrationLog = [];
    }

    /**
     * 초기화
     */
    async init() {
        if (!window.firebaseConfig?.isEnabled()) {
            throw new Error('Firebase가 활성화되지 않았습니다.');
        }

        this.db = window.firebaseConfig.getDb();
        if (!this.db) {
            throw new Error('Firebase DB 인스턴스를 가져올 수 없습니다.');
        }

        console.log('[Migration] Firebase 초기화 완료');
    }

    /**
     * 컬렉션 데이터 개수 확인
     * @param {string} collectionName - 컬렉션 이름
     * @returns {Promise<number>} 문서 개수
     */
    async countDocuments(collectionName) {
        try {
            const snapshot = await this.db.collection(collectionName).get();
            return snapshot.size;
        } catch (error) {
            console.error(`[Migration] ${collectionName} 조회 실패:`, error);
            return 0;
        }
    }

    /**
     * 마이그레이션 상태 확인
     * @returns {Promise<Object>} 상태 정보
     */
    async checkStatus() {
        const sampleTypes = [
            { key: 'soil', name: 'soilSamples' },
            { key: 'water', name: 'waterSamples' },
            { key: 'compost', name: 'compostSamples' },
            { key: 'heavyMetal', name: 'heavyMetalSamples' },
            { key: 'pesticide', name: 'pesticideSamples' }
        ];

        const year = 2026;
        const status = {};

        for (const type of sampleTypes) {
            const original = `${type.name}_${year}`;
            const test = `test_${type.name}_${year}`;

            const originalCount = await this.countDocuments(original);
            const testCount = await this.countDocuments(test);

            status[type.key] = {
                original: { name: original, count: originalCount },
                test: { name: test, count: testCount },
                needsMigration: originalCount > 0 && testCount === 0
            };
        }

        return status;
    }

    /**
     * 단일 컬렉션 마이그레이션
     * @param {string} sourceCollection - 원본 컬렉션 이름
     * @param {string} targetCollection - 대상 컬렉션 이름
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 마이그레이션 결과
     */
    async migrateCollection(sourceCollection, targetCollection, options = {}) {
        const {
            dryRun = false,  // true면 실제 쓰기 안 함
            batchSize = 500,  // Firestore batch 최대 500
            onProgress = null  // 진행률 콜백
        } = options;

        console.log(`[Migration] ${sourceCollection} → ${targetCollection} 시작 (dryRun: ${dryRun})`);

        try {
            // 1. 원본 데이터 읽기
            const sourceSnapshot = await this.db.collection(sourceCollection).get();
            const totalDocs = sourceSnapshot.size;

            console.log(`[Migration] 원본 문서: ${totalDocs}건`);

            if (totalDocs === 0) {
                return {
                    success: true,
                    source: sourceCollection,
                    target: targetCollection,
                    copied: 0,
                    message: '원본 데이터가 없습니다.'
                };
            }

            // 2. 대상 컬렉션 확인 (이미 데이터가 있는지)
            const targetSnapshot = await this.db.collection(targetCollection).get();
            const existingDocs = targetSnapshot.size;

            console.log(`[Migration] 대상 문서: ${existingDocs}건 (기존)`);

            if (existingDocs > 0 && !options.overwrite) {
                return {
                    success: false,
                    source: sourceCollection,
                    target: targetCollection,
                    copied: 0,
                    message: `대상 컬렉션에 이미 ${existingDocs}건의 데이터가 있습니다. overwrite: true로 실행하세요.`
                };
            }

            if (dryRun) {
                return {
                    success: true,
                    source: sourceCollection,
                    target: targetCollection,
                    copied: 0,
                    dryRun: true,
                    message: `DRY RUN: ${totalDocs}건을 복사할 수 있습니다.`
                };
            }

            // 3. 배치 단위로 복사
            let copiedCount = 0;
            const docs = sourceSnapshot.docs;

            for (let i = 0; i < docs.length; i += batchSize) {
                const batch = this.db.batch();
                const chunk = docs.slice(i, Math.min(i + batchSize, docs.length));

                chunk.forEach(doc => {
                    const targetRef = this.db.collection(targetCollection).doc(doc.id);
                    batch.set(targetRef, doc.data());
                });

                await batch.commit();
                copiedCount += chunk.length;

                if (onProgress) {
                    onProgress({
                        current: copiedCount,
                        total: totalDocs,
                        percentage: Math.round((copiedCount / totalDocs) * 100)
                    });
                }

                console.log(`[Migration] 진행: ${copiedCount}/${totalDocs} (${Math.round((copiedCount / totalDocs) * 100)}%)`);
            }

            return {
                success: true,
                source: sourceCollection,
                target: targetCollection,
                copied: copiedCount,
                message: `${copiedCount}건 복사 완료`
            };

        } catch (error) {
            console.error('[Migration] 마이그레이션 실패:', error);
            return {
                success: false,
                source: sourceCollection,
                target: targetCollection,
                copied: 0,
                error: error.message
            };
        }
    }

    /**
     * 전체 마이그레이션 실행
     * @param {Object} options - 옵션
     * @returns {Promise<Object>} 마이그레이션 결과
     */
    async migrateAll(options = {}) {
        const status = await this.checkStatus();
        const results = [];

        for (const [key, info] of Object.entries(status)) {
            if (info.needsMigration || options.force) {
                console.log(`\n[Migration] ${key} 마이그레이션 시작...`);

                const result = await this.migrateCollection(
                    info.original.name,
                    info.test.name,
                    options
                );

                results.push({ type: key, ...result });
            } else {
                console.log(`[Migration] ${key} 스킵 (이미 마이그레이션됨)`);
                results.push({
                    type: key,
                    success: true,
                    skipped: true,
                    message: '마이그레이션 불필요'
                });
            }
        }

        return {
            timestamp: new Date().toISOString(),
            results,
            summary: {
                total: results.length,
                success: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                skipped: results.filter(r => r.skipped).length
            }
        };
    }

    /**
     * 마이그레이션 로그 저장
     * @param {Object} result - 마이그레이션 결과
     */
    saveLog(result) {
        this.migrationLog.push({
            timestamp: new Date().toISOString(),
            result
        });

        // localStorage에 저장
        try {
            localStorage.setItem('firebase_migration_log', JSON.stringify(this.migrationLog));
        } catch (error) {
            console.warn('[Migration] 로그 저장 실패:', error);
        }
    }

    /**
     * 마이그레이션 로그 조회
     * @returns {Array} 로그 배열
     */
    getLog() {
        try {
            const log = localStorage.getItem('firebase_migration_log');
            return log ? JSON.parse(log) : [];
        } catch (error) {
            console.error('[Migration] 로그 조회 실패:', error);
            return [];
        }
    }

    /**
     * 마이그레이션 로그 클리어
     */
    clearLog() {
        this.migrationLog = [];
        localStorage.removeItem('firebase_migration_log');
    }
}

// 전역 객체로 등록
window.FirebaseMigrationTool = FirebaseMigrationTool;

// 편의 함수: 즉시 실행 가능한 마이그레이션
window.runFirebaseMigration = async function(options = {}) {
    const tool = new FirebaseMigrationTool();

    try {
        await tool.init();

        console.log('=== Firebase 마이그레이션 상태 확인 ===\n');
        const status = await tool.checkStatus();
        console.table(Object.entries(status).map(([type, info]) => ({
            타입: type,
            원본: `${info.original.name} (${info.original.count}건)`,
            대상: `${info.test.name} (${info.test.count}건)`,
            마이그레이션필요: info.needsMigration ? '예' : '아니오'
        })));

        if (options.dryRun !== false) {
            console.log('\n⚠️  DRY RUN 모드 (실제 복사 안 함)');
            console.log('실제 마이그레이션: runFirebaseMigration({ dryRun: false })');
        }

        console.log('\n=== 마이그레이션 시작 ===\n');
        const result = await tool.migrateAll(options);

        console.log('\n=== 마이그레이션 완료 ===');
        console.table(result.results.map(r => ({
            타입: r.type,
            원본: r.source || '-',
            대상: r.target || '-',
            복사건수: r.copied || 0,
            상태: r.success ? '✅ 성공' : '❌ 실패',
            메시지: r.message || r.error || '-'
        })));

        console.log(`\n총 ${result.summary.total}개 타입 중 ${result.summary.success}개 성공, ${result.summary.failed}개 실패, ${result.summary.skipped}개 스킵`);

        tool.saveLog(result);
        return result;

    } catch (error) {
        console.error('마이그레이션 초기화 실패:', error);
        throw error;
    }
};

console.log('✅ Firebase 마이그레이션 도구 로드 완료');
console.log('');
console.log('사용법:');
console.log('1. 상태 확인 (DRY RUN):');
console.log('   await runFirebaseMigration()');
console.log('');
console.log('2. 실제 마이그레이션 실행:');
console.log('   await runFirebaseMigration({ dryRun: false })');
console.log('');
console.log('3. 강제 덮어쓰기:');
console.log('   await runFirebaseMigration({ dryRun: false, overwrite: true })');
