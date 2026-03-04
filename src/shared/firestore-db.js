/**
 * @fileoverview Firestore 데이터베이스 CRUD 모듈 (compat 버전)
 * @description 시료 데이터의 Firestore 저장/조회/수정/삭제 기능
 *
 * 컬렉션 구조:
 * - soilSamples: 토양 시료
 * - waterSamples: 수질분석 시료
 * - compostSamples: 퇴·액비 시료
 * - heavyMetalSamples: 토양 중금속 시료
 * - pesticideSamples: 잔류농약 시료
 */
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

/**
 * 디버그 모드 - 개발 환경에서만 활성화
 * Electron: process.env.NODE_ENV 또는 --dev 플래그 확인
 * Web: localStorage의 debug 플래그 확인
 */
const DEBUG_FIRESTORE = (() => {
    // Electron 환경
    if (typeof process !== 'undefined' && process.env) {
        return process.env.NODE_ENV === 'development' || process.argv?.includes('--dev');
    }
    // 웹 환경
    try {
        return localStorage.getItem('DEBUG_MODE') === 'true';
    } catch {
        return false;
    }
})();

/** 조건부 로깅 */
const logFirestore = (...args) => DEBUG_FIRESTORE && console.log('[Firestore]', ...args);

// Firebase 동기화 재시도 설정
const FIREBASE_RETRY_CONFIG = {
    maxRetries: 3,
    retryDelay: 2000,  // 2초
    maxDelay: 8000     // 최대 8초
};

/**
 * Firebase 작업을 재시도 로직으로 감싸기
 * @param {Function} operation - 실행할 비동기 작업
 * @param {string} context - 작업 컨텍스트 (로깅용)
 * @returns {Promise<*>} 작업 결과
 */
async function withFirebaseRetry(operation, context) {
    let lastError;

    for (let attempt = 1; attempt <= FIREBASE_RETRY_CONFIG.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // 특정 에러 코드는 재시도 불필요
            const noRetryErrors = [
                'permission-denied',
                'unauthenticated',
                'invalid-argument',
                'not-found'
            ];

            if (noRetryErrors.includes(error.code)) {
                logFirestore(`재시도 불가 에러 (${context}):`, error.code);
                break;
            }

            // 마지막 시도가 아니면 재시도
            if (attempt < FIREBASE_RETRY_CONFIG.maxRetries) {
                const delay = Math.min(
                    FIREBASE_RETRY_CONFIG.retryDelay * Math.pow(2, attempt - 1),
                    FIREBASE_RETRY_CONFIG.maxDelay
                );

                logFirestore(`${context} 실패 (${attempt}/${FIREBASE_RETRY_CONFIG.maxRetries}), ${delay}ms 후 재시도:`, error.code || error.message);

                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // 모든 재시도 실패 → 오프라인 큐에 추가
    logFirestore(`${context} 최종 실패:`, lastError);
    throw lastError;
}

// 테스트 프로젝트: test_ 접두사로 메인 데이터와 분리
const COLLECTION_PREFIX = 'test_';

// 컬렉션 이름 매핑
const COLLECTION_MAP = {
    'soil': 'soilSamples',
    'water': 'waterSamples',
    'compost': 'compostSamples',
    'heavyMetal': 'heavyMetalSamples',
    'heavy-metal': 'heavyMetalSamples',
    'pesticide': 'pesticideSamples'
};

/**
 * 컬렉션 이름 가져오기
 * @param {string} sampleType - 시료 타입 (soil, water, compost, heavyMetal, pesticide)
 * @param {number} year - 연도
 * @returns {string} 컬렉션 이름
 */
function getCollectionName(sampleType, year) {
    const baseName = COLLECTION_MAP[sampleType] || sampleType;
    const collectionName = `${COLLECTION_PREFIX}${baseName}_${year}`;

    // 디버그 로깅 (개발 모드에서만)
    if (DEBUG_FIRESTORE) {
        console.log(`[Firestore] Collection name: ${collectionName} (prefix: "${COLLECTION_PREFIX}", base: ${baseName}, year: ${year})`);
    }

    // 안전 체크: test_ 접두사가 없으면 경고 및 강제 추가
    if (!collectionName.startsWith('test_')) {
        console.warn(`[Firestore] WARNING: Collection name missing 'test_' prefix: ${collectionName}`);
        console.warn('[Firestore] Forcing test_ prefix...');
        return `test_${baseName}_${year}`;
    }

    return collectionName;
}

/**
 * ID 정규화 - 항상 문자열로 통일
 * @param {string|number} id - 원본 ID
 * @returns {string} 정규화된 문자열 ID
 */
function normalizeId(id) {
    if (id == null) return '';
    return String(id);
}

/**
 * 데이터 배열의 ID 정규화
 * @param {Array} data - 데이터 배열
 * @returns {Array} ID가 정규화된 데이터 배열
 */
function normalizeDataIds(data) {
    if (!Array.isArray(data)) return data;
    return data.map(item => ({
        ...item,
        id: normalizeId(item.id)
    }));
}

/**
 * 단일 문서 저장/업데이트 (compat 버전)
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} docId - 문서 ID
 * @param {Object} data - 저장할 데이터
 * @returns {Promise<boolean>} 성공 여부
 */
async function saveDocument(sampleType, year, docId, data) {
    if (!window.firebaseConfig?.isEnabled()) {
        return false;
    }

    // 네트워크 상태 확인
    if (window.networkStatus && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(
            () => saveDocument(sampleType, year, docId, data),
            {
                type: 'firebase-save',
                description: `${sampleType} ${year}년 문서 ${docId} 저장`,
                sampleType,
                year,
                docId
            }
        );
        if (window.showToast) {
            showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        }
        return true;
    }

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig.getDb();
            if (!db) return false;

            const collectionName = getCollectionName(sampleType, year);
            const normalizedId = normalizeId(docId);

            const docData = {
                ...data,
                id: normalizedId,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!docData.createdAt) {
                docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            await db.collection(collectionName).doc(normalizedId).set(docData, { merge: true });
            logFirestore(`저장 완료: ${collectionName}/${normalizedId}`);
            return true;
        }, 'saveDocument');
    } catch (error) {
        // 재시도 실패 시 오프라인 큐에 추가
        if (window.networkStatus) {
            window.networkStatus.queueOperation(
                () => saveDocument(sampleType, year, docId, data),
                {
                    type: 'firebase-save',
                    description: `${sampleType} ${year}년 문서 ${docId} 저장 (재시도)`,
                    sampleType,
                    year,
                    docId
                }
            );
        }

        if (window.ErrorHandler) {
            ErrorHandler.handle(error, 'FIREBASE_SYNC', { silent: false });
        }
        return false;
    }
}

/**
 * 단일 문서 조회 (compat 버전)
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} docId - 문서 ID
 * @returns {Promise<Object|null>} 문서 데이터 또는 null
 */
async function getDocument(sampleType, year, docId) {
    if (!window.firebaseConfig?.isEnabled()) {
        return null;
    }

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return null;

        const collectionName = getCollectionName(sampleType, year);
        const docSnap = await db.collection(collectionName).doc(docId).get();

        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() };
        }
        return null;
    } catch (error) {
        if (window.ErrorHandler) {
            window.ErrorHandler.handle(error, 'FIREBASE_LOAD', { silent: true });
        } else {
            (window.logger?.error || console.error)('Firestore 조회 실패:', error);
        }
        return null;
    }
}

/**
 * 컬렉션 전체 조회 (compat 버전)
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {Object} options - 조회 옵션
 * @param {boolean} options.skipOrder - 정렬 생략 (속도 향상)
 * @returns {Promise<Array>} 문서 배열
 */
async function getAllDocuments(sampleType, year, options = {}) {
    if (!window.firebaseConfig?.isEnabled()) {
        return [];
    }

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig.getDb();
            if (!db) return [];

            const collectionName = getCollectionName(sampleType, year);
            const querySnapshot = await db.collection(collectionName).get();

            const documents = [];
            querySnapshot.forEach((doc) => {
                documents.push({
                    ...doc.data(),
                    id: normalizeId(doc.data().id || doc.id)
                });
            });

            // 로컬에서 정렬 (오름차순: createdAt → updatedAt → 0)
            if (documents.length > 0) {
                documents.sort((a, b) => {
                    const aTime = (a.createdAt?.seconds || a.updatedAt?.seconds || 0);
                    const bTime = (b.createdAt?.seconds || b.updatedAt?.seconds || 0);
                    return aTime - bTime;
                });
            }

            logFirestore(`조회 완료: ${collectionName}, ${documents.length}건`);
            return normalizeDataIds(documents);
        }, 'getAllDocuments');
    } catch (error) {
        if (window.ErrorHandler) {
            ErrorHandler.handle(error, 'FIREBASE_LOAD', { silent: true });
        }
        return [];
    }
}

/**
 * 문서 삭제 (compat 버전) - id 필드 기반 쿼리로 삭제
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} docId - 데이터의 id 필드 값
 * @returns {Promise<boolean>} 성공 여부
 */
async function deleteDocument(sampleType, year, docId) {
    if (!window.firebaseConfig?.isEnabled()) {
        return false;
    }

    // 네트워크 상태 확인
    if (window.networkStatus && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(
            () => deleteDocument(sampleType, year, docId),
            {
                type: 'firebase-delete',
                description: `${sampleType} ${year}년 문서 ${docId} 삭제`,
                sampleType,
                year,
                docId
            }
        );
        if (window.showToast) {
            showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        }
        return true;
    }

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig.getDb();
            if (!db) return false;

            const collectionName = getCollectionName(sampleType, year);
            const stringDocId = normalizeId(docId);
            const numericDocId = parseInt(stringDocId, 10);

            if (!stringDocId) return false;

            // 1차: 문서 ID로 직접 삭제 시도
            const directDocRef = db.collection(collectionName).doc(stringDocId);
            const directDocSnap = await directDocRef.get();

            if (directDocSnap.exists) {
                await directDocRef.delete();
                logFirestore(`삭제 완료: ${collectionName}/${stringDocId}`);
                return true;
            }

            // 2차: id 필드로 쿼리 (문자열)
            let querySnapshot = await db.collection(collectionName)
                .where('id', '==', stringDocId)
                .get();

            // 3차: 문자열로 찾지 못하면 숫자로도 쿼리 시도
            if (querySnapshot.empty && !isNaN(numericDocId)) {
                querySnapshot = await db.collection(collectionName)
                    .where('id', '==', numericDocId)
                    .get();
            }

            if (querySnapshot.empty) {
                logFirestore(`삭제 대상 없음: ${collectionName}/${stringDocId}`);
                return false;
            }

            // 찾은 문서 삭제
            const deletePromises = [];
            querySnapshot.forEach((docSnap) => {
                deletePromises.push(docSnap.ref.delete());
            });
            await Promise.all(deletePromises);

            logFirestore(`삭제 완료 (쿼리): ${collectionName}/${stringDocId} (${querySnapshot.size}건)`);
            return true;
        }, 'deleteDocument');
    } catch (error) {
        // 재시도 실패 시 오프라인 큐에 추가
        if (window.networkStatus) {
            window.networkStatus.queueOperation(
                () => deleteDocument(sampleType, year, docId),
                {
                    type: 'firebase-delete',
                    description: `${sampleType} ${year}년 문서 ${docId} 삭제 (재시도)`,
                    sampleType,
                    year,
                    docId
                }
            );
        }

        if (window.ErrorHandler) {
            ErrorHandler.handle(error, 'FIREBASE_SYNC', { silent: false });
        }
        return false;
    }
}

/**
 * 여러 문서 일괄 저장 (compat 버전 - 배치)
 * Firestore writeBatch는 최대 500개 작업으로 제한되므로 청크로 나누어 처리
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {Array} documents - 저장할 문서 배열 [{id, ...data}]
 * @param {Object} options - 옵션
 * @param {AbortSignal} options.signal - 취소 신호
 * @returns {Promise<boolean>} 성공 여부
 */
async function batchSave(sampleType, year, documents, options = {}) {
    if (!window.firebaseConfig?.isEnabled() || !documents.length) {
        return false;
    }

    const { signal } = options;

    // 네트워크 상태 확인
    if (window.networkStatus && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(
            () => batchSave(sampleType, year, documents, options),
            {
                type: 'firebase-batch',
                description: `${sampleType} ${year}년 데이터 ${documents.length}건 일괄 동기화`,
                sampleType,
                year,
                count: documents.length
            }
        );
        if (window.showToast) {
            showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        }
        return true;
    }

    const operationId = 'firebaseBatchSave';

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig.getDb();
            if (!db) return false;

            const collectionName = getCollectionName(sampleType, year);
            const CHUNK_SIZE = 500;
            const chunks = [];

            for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
                chunks.push(documents.slice(i, i + CHUNK_SIZE));
            }

            logFirestore(`배치 저장 시작: ${collectionName}, ${documents.length}건 (${chunks.length} 청크)`);

            // 로딩 시작 (진행률 표시, 취소 버튼 포함)
            if (window.loadingManager) {
                loadingManager.show(operationId, `Firebase 동기화 중... (0/${chunks.length})`, {
                    showProgress: true,
                    cancellable: true,
                    onCancel: () => {
                        logFirestore('사용자가 배치 저장을 취소했습니다.');
                    }
                });
            }

            for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
                // 취소 확인
                if (signal?.aborted) {
                    logFirestore('배치 저장이 취소되었습니다.');
                    throw new DOMException('작업이 취소되었습니다.', 'AbortError');
                }

                const chunk = chunks[chunkIndex];
                const batch = db.batch();

                chunk.forEach(doc => {
                    const normalizedId = normalizeId(doc.id);
                    const docRef = db.collection(collectionName).doc(normalizedId);
                    const docData = {
                        ...doc,
                        id: normalizedId,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    if (!docData.createdAt) {
                        docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    }

                    batch.set(docRef, docData, { merge: true });
                });

                await batch.commit();

                // 진행률 업데이트
                const progress = ((chunkIndex + 1) / chunks.length) * 100;
                if (window.loadingManager) {
                    loadingManager.updateProgress(
                        operationId,
                        progress,
                        `Firebase 동기화 중... (${chunkIndex + 1}/${chunks.length})`
                    );
                }

                logFirestore(`배치 진행률: ${Math.round(progress)}% (${chunkIndex + 1}/${chunks.length} 청크)`);
            }

            logFirestore(`배치 저장 완료: ${documents.length}건`);
            return true;
        }, 'batchSave');
    } catch (error) {
        // AbortError는 토스트 표시하지 않음
        if (error.name === 'AbortError') {
            if (window.showToast) {
                showToast('동기화가 취소되었습니다.', 'info');
            }
            return false;
        }

        // 재시도 실패 시 오프라인 큐에 추가
        if (window.networkStatus) {
            window.networkStatus.queueOperation(
                () => batchSave(sampleType, year, documents, options),
                {
                    type: 'firebase-batch',
                    description: `${sampleType} ${year}년 데이터 ${documents.length}건 일괄 동기화 (재시도)`,
                    sampleType,
                    year,
                    count: documents.length
                }
            );
        }

        if (window.ErrorHandler) {
            ErrorHandler.handle(error, 'FIREBASE_SYNC', { silent: false });
        }
        return false;
    } finally {
        // 로딩 종료
        if (window.loadingManager) {
            loadingManager.hide(operationId);
        }
    }
}

/**
 * localStorage 데이터를 Firestore로 마이그레이션 (compat 버전)
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {string} localStorageKey - localStorage 키
 * @returns {Promise<{success: boolean, count: number}>} 결과
 */
async function migrateFromLocalStorage(sampleType, year, localStorageKey) {
    if (!window.firebaseConfig?.isEnabled()) {
        return { success: false, count: 0 };
    }

    try {
        const localData = localStorage.getItem(localStorageKey);
        if (!localData) {
            logFirestore('마이그레이션할 데이터가 없습니다.');
            return { success: true, count: 0 };
        }

        const samples = JSON.parse(localData);
        if (!Array.isArray(samples) || samples.length === 0) {
            return { success: true, count: 0 };
        }

        // ID가 없는 경우 생성
        const documentsWithId = samples.map(sample => ({
            ...sample,
            id: sample.id || generateMigrationId()
        }));

        await batchSave(sampleType, year, documentsWithId);

        logFirestore(`마이그레이션 완료: ${localStorageKey} → Firestore (${documentsWithId.length}건)`);
        return { success: true, count: documentsWithId.length };
    } catch (error) {
        (window.logger?.error || console.error)('마이그레이션 실패:', error);
        return { success: false, count: 0 };
    }
}

/**
 * 고유 ID 생성 (crypto.randomUUID 우선 사용)
 * @returns {string} 고유 ID
 */
function generateUniqueId() {
    // crypto.randomUUID가 지원되면 사용 (더 안전한 난수)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 폴백: 타임스탬프 + crypto 안전 난수
    return Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(36)).join('').substring(0, 9);
}

/**
 * 마이그레이션용 ID 생성 (하위 호환성 유지)
 * @returns {string} 고유 ID
 */
function generateMigrationId() {
    return generateUniqueId();
}

/**
 * 실시간 동기화 리스너 설정 (compat 버전)
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {Function} callback - 변경 시 호출될 콜백 함수
 * @returns {Function|null} 구독 해제 함수 또는 null
 */
function subscribeToChanges(sampleType, year, callback) {
    if (!window.firebaseConfig?.isEnabled()) {
        return null;
    }

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return null;

        const collectionName = getCollectionName(sampleType, year);

        // orderBy 제거: updatedAt이 없는 문서가 제외되는 문제 방지
        const unsubscribe = db.collection(collectionName)
            .onSnapshot((snapshot) => {
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({ id: doc.id, ...doc.data() });
                });
                callback(documents, snapshot.metadata.fromCache);
            }, (error) => {
                (window.logger?.error || console.error)('실시간 동기화 에러:', error);
            });

        logFirestore(`실시간 동기화 시작: ${collectionName}`);
        return unsubscribe;
    } catch (error) {
        (window.logger?.error || console.error)('실시간 동기화 설정 실패:', error);
        return null;
    }
}

/**
 * Firestore 연결 상태 확인
 * @returns {boolean} 활성화 여부
 */
function isFirestoreEnabled() {
    return window.firebaseConfig?.isEnabled() === true;
}

/**
 * 오프라인 지원 여부 확인
 * @returns {boolean} 오프라인 지원 여부
 */
function isFirestoreOfflineEnabled() {
    return window.firebaseConfig?.isOfflineSupported() === true;
}

// 전역으로 내보내기
window.firestoreDb = {
    // init은 호환성을 위해 빈 함수 (실제 초기화는 firebase-config에서 수행)
    init: async function() {
        logFirestore('firestoreDb.init() 호출됨 (no-op)');
        return true;
    },
    save: saveDocument,
    get: getDocument,
    getAll: getAllDocuments,
    delete: deleteDocument,
    batchSave: batchSave,
    migrate: migrateFromLocalStorage,
    subscribe: subscribeToChanges,
    isEnabled: isFirestoreEnabled,
    isOfflineEnabled: isFirestoreOfflineEnabled,
    getCollectionName: getCollectionName
};
