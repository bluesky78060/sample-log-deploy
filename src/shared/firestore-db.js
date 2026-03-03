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
    return `${COLLECTION_PREFIX}${baseName}_${year}`;
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

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return false;

        const collectionName = getCollectionName(sampleType, year);

        await db.collection(collectionName).doc(docId).set({
            ...data,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        }, { merge: true });

        logFirestore(`저장 완료: ${collectionName}/${docId}`);
        return true;
    } catch (error) {
        (window.logger?.error || console.error)('Firestore 저장 실패:', error);
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
        (window.logger?.error || console.error)('Firestore 조회 실패:', error);
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
        const db = window.firebaseConfig.getDb();
        if (!db) return [];

        const collectionName = getCollectionName(sampleType, year);
        let queryRef = db.collection(collectionName);

        // orderBy를 사용하지 않고 전체 조회 후 로컬 정렬
        // (Firestore orderBy는 해당 필드가 없는 문서를 제외하므로 데이터 누락 방지)
        const querySnapshot = await queryRef.get();

        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
        });

        // 로컬에서 정렬 (오름차순: createdAt → updatedAt → 0)
        if (documents.length > 0) {
            documents.sort((a, b) => {
                const aTime = (a.createdAt?.seconds || a.updatedAt?.seconds || 0);
                const bTime = (b.createdAt?.seconds || b.updatedAt?.seconds || 0);
                return aTime - bTime;
            });
        }

        logFirestore(`조회 완료: ${collectionName} (${documents.length}건)`);
        return normalizeDataIds(documents);
    } catch (error) {
        (window.logger?.error || console.error)('Firestore 전체 조회 실패:', error);
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

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return false;

        const collectionName = getCollectionName(sampleType, year);

        // ID를 문자열로 변환
        const stringDocId = typeof docId === 'number' ? String(docId) : String(docId || '');
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
    } catch (error) {
        console.error('Firestore 삭제 실패:', error);
        return false;
    }
}

/**
 * 여러 문서 일괄 저장 (compat 버전 - 배치)
 * Firestore writeBatch는 최대 500개 작업으로 제한되므로 청크로 나누어 처리
 * @param {string} sampleType - 시료 타입
 * @param {number} year - 연도
 * @param {Array} documents - 저장할 문서 배열 [{id, ...data}]
 * @returns {Promise<boolean>} 성공 여부
 */
async function batchSave(sampleType, year, documents) {
    if (!window.firebaseConfig?.isEnabled() || !documents.length) {
        return false;
    }

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return false;

        const collectionName = getCollectionName(sampleType, year);

        // Firestore batch는 최대 500개로 제한됨
        const BATCH_SIZE = 450;
        const chunks = [];
        for (let i = 0; i < documents.length; i += BATCH_SIZE) {
            chunks.push(documents.slice(i, i + BATCH_SIZE));
        }

        logFirestore(`배치 저장 시작: ${collectionName} (${documents.length}건, ${chunks.length}개 청크)`);

        for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
            const chunk = chunks[chunkIndex];
            const batch = db.batch();

            chunk.forEach((docData) => {
                // ID 정규화 - 항상 문자열로 통일
                let docId = normalizeId(docData.id).trim();

                // ID가 없거나 유효하지 않으면 새로 생성
                if (!docId) {
                    docId = generateUniqueId();
                }

                const docRef = db.collection(collectionName).doc(docId);
                const saveData = {
                    ...docData,
                    id: docId, // 문자열 ID 저장
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    syncedAt: firebase.firestore.FieldValue.serverTimestamp()
                };
                // createdAt이 없으면 추가 (orderBy 누락 방지)
                if (!docData.createdAt) {
                    saveData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                }
                batch.set(docRef, saveData, { merge: true });
            });

            await batch.commit();
            logFirestore(`청크 ${chunkIndex + 1}/${chunks.length} 완료 (${chunk.length}건)`);
        }

        logFirestore(`배치 저장 완료: ${collectionName} (${documents.length}건)`);
        return true;
    } catch (error) {
        (window.logger?.error || console.error)('Firestore 배치 저장 실패:', error);
        return false;
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
