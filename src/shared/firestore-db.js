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

/** 테스트 환경 컬렉션 접두사 */
const COLLECTION_PREFIX = 'test_';

/** 컬렉션 이름 매핑 */
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

        // 암호화: 민감 필드를 암호화하여 저장
        let dataToSave = data;
        let isEncrypted = false;
        if (window.encryptionManager?.isReady() && window.CryptoUtils) {
            try {
                const key = window.encryptionManager.getKey();
                dataToSave = await window.CryptoUtils.encryptRecord(data, key);
                isEncrypted = !!dataToSave._enc;
                if (isEncrypted) {
                    logFirestore(`문서 암호화 완료: ${docId} (필드: ${Object.keys(dataToSave._enc).join(', ')})`);
                }
            } catch (encErr) {
                console.error(`[Firestore] 암호화 실패 (${docId}):`, encErr.message);
                // 암호화가 활성화된 상태에서 실패하면 저장 중단 (평문 폴백 금지)
                return false;
            }
        }

        const saveData = {
            ...dataToSave,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            syncedAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // 암호화 시 평문 민감 필드를 명시적으로 삭제 (merge:true가 기존 평문을 유지하는 문제 방지)
        if (isEncrypted && window.CryptoUtils?.SENSITIVE_FIELDS) {
            for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
                if (!(field in saveData) || saveData[field] === undefined) {
                    saveData[field] = firebase.firestore.FieldValue.delete();
                }
            }
        }

        await db.collection(collectionName).doc(docId).set(saveData, { merge: true });

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
            let doc = { id: docSnap.id, ...docSnap.data() };

            // 복호화: _enc 필드가 있으면 복호화
            if (doc._enc && window.encryptionManager?.isReady() && window.CryptoUtils) {
                try {
                    const key = window.encryptionManager.getKey();
                    const encFields = Object.keys(doc._enc);
                    logFirestore(`문서 복호화 시도: ${docId} (암호화 필드: ${encFields.join(', ')})`);
                    doc = await window.CryptoUtils.decryptRecord(doc, key);
                    logFirestore('문서 복호화 완료:', docId);
                } catch (decErr) {
                    console.error(`[Firestore] 문서 복호화 실패: ${docId}`, decErr.message);
                    console.error('[Firestore] 복호화 실패 상세 - 키소스:', window.encryptionManager.getKeySource(), ', _enc 필드:', Object.keys(doc._enc || {}));
                }
            } else if (doc._enc && !window.encryptionManager?.isReady()) {
                console.warn(`[Firestore] 암호화된 문서이나 키 미준비: ${docId} (encManager ready: ${window.encryptionManager?.isReady()}, CryptoUtils: ${!!window.CryptoUtils})`);
            }

            return doc;
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

        // 정렬 옵션 - 오름차순으로 변경 (오래된 데이터가 위로)
        if (!options.skipOrder) {
            try {
                queryRef = queryRef.orderBy('createdAt', 'asc');  // createdAt 기준 오름차순
            } catch (indexError) {
                try {
                    queryRef = queryRef.orderBy('updatedAt', 'asc');  // createdAt가 없으면 updatedAt 사용
                } catch (indexError2) {
                    (window.logger?.warn || console.warn)('[Firestore] 인덱스 없음, 정렬 없이 조회:', indexError2.message);
                }
            }
        }

        const querySnapshot = await queryRef.get();

        const documents = [];
        querySnapshot.forEach((doc) => {
            documents.push({ id: doc.id, ...doc.data() });
        });

        // skipOrder인 경우 로컬에서 정렬 (오름차순)
        if (options.skipOrder && documents.length > 0) {
            documents.sort((a, b) => {
                // createdAt 우선, 없으면 updatedAt 사용
                const aTime = (a.createdAt?.seconds || a.updatedAt?.seconds || 0);
                const bTime = (b.createdAt?.seconds || b.updatedAt?.seconds || 0);
                return aTime - bTime;  // 오름차순
            });
        }

        logFirestore(`조회 완료: ${collectionName} (${documents.length}건)`);

        // 복호화: 암호화된 문서들을 복호화
        const encryptedCount = documents.filter(d => d._enc).length;
        if (window.encryptionManager?.isReady() && window.CryptoUtils) {
            if (encryptedCount > 0) {
                logFirestore(`일괄 복호화 시도: ${encryptedCount}/${documents.length}건 암호화됨`);
            }
            try {
                const key = window.encryptionManager.getKey();
                const decryptedDocs = await window.CryptoUtils.decryptRecords(documents, key);
                const failedDocs = decryptedDocs.filter(d => d._enc);
                if (failedDocs.length > 0) {
                    console.warn(`[Firestore] 부분 복호화 실패: ${failedDocs.length}건 (IDs: ${failedDocs.map(d => d.id).join(', ')})`);
                }
                logFirestore(`복호화 완료: ${decryptedDocs.length}건 (실패: ${failedDocs.length}건)`);
                return normalizeDataIds(decryptedDocs);
            } catch (decErr) {
                console.error('[Firestore] 일괄 복호화 실패:', decErr.message);
                console.error('[Firestore] 키소스:', window.encryptionManager.getKeySource());
            }
        } else if (encryptedCount > 0) {
            console.warn(`[Firestore] 암호화된 문서 ${encryptedCount}건이 있으나 키 미준비 (encManager: ${!!window.encryptionManager}, ready: ${window.encryptionManager?.isReady()}, CryptoUtils: ${!!window.CryptoUtils})`);
        }

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

        // 암호화: 민감 필드를 암호화
        let docsToSave = documents;
        let batchEncrypted = false;
        if (window.encryptionManager?.isReady() && window.CryptoUtils) {
            try {
                const key = window.encryptionManager.getKey();
                docsToSave = await window.CryptoUtils.encryptRecords(documents, key);
                batchEncrypted = docsToSave.some(d => d._enc);
                logFirestore(`배치 암호화 완료: ${docsToSave.length}건`);
            } catch (encErr) {
                console.error('[Firestore] 배치 암호화 실패, 저장 중단:', encErr.message);
                return false;
            }
        }

        // Firestore batch는 최대 500개로 제한됨
        const BATCH_SIZE = 450;
        const chunks = [];
        for (let i = 0; i < docsToSave.length; i += BATCH_SIZE) {
            chunks.push(docsToSave.slice(i, i + BATCH_SIZE));
        }

        logFirestore(`배치 저장 시작: ${collectionName} (${docsToSave.length}건, ${chunks.length}개 청크)`);

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

                const saveData = {
                    ...docData,
                    id: docId, // 문자열 ID 저장
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    syncedAt: firebase.firestore.FieldValue.serverTimestamp()
                };

                // 암호화 시 평문 민감 필드를 명시적으로 삭제
                if (batchEncrypted && docData._enc && window.CryptoUtils?.SENSITIVE_FIELDS) {
                    for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
                        if (!(field in saveData) || saveData[field] === undefined) {
                            saveData[field] = firebase.firestore.FieldValue.delete();
                        }
                    }
                }

                const docRef = db.collection(collectionName).doc(docId);
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

        const unsubscribe = db.collection(collectionName)
            .orderBy('updatedAt', 'desc')
            .onSnapshot(async (snapshot) => {
                const documents = [];
                snapshot.forEach((doc) => {
                    documents.push({ id: doc.id, ...doc.data() });
                });

                // 복호화: 암호화된 문서들을 복호화
                let resultDocs = documents;
                const encCount = documents.filter(d => d._enc).length;
                if (window.encryptionManager?.isReady() && window.CryptoUtils) {
                    try {
                        const key = window.encryptionManager.getKey();
                        resultDocs = await window.CryptoUtils.decryptRecords(documents, key);
                        if (encCount > 0) {
                            logFirestore(`실시간 동기화 복호화: ${encCount}건 처리`);
                        }
                    } catch (decErr) {
                        console.error('[Firestore] 실시간 동기화 복호화 실패:', decErr.message, '(암호화 문서:', encCount, '건)');
                    }
                } else if (encCount > 0) {
                    console.warn(`[Firestore] 실시간 동기화: 암호화된 문서 ${encCount}건이 있으나 키 미준비`);
                }

                callback(resultDocs, snapshot.metadata.fromCache);
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

/**
 * 데이터 재암호화: _enc 제거 후 현재 키로 다시 암호화
 * merge:true 버그로 평문이 남아있는 문서에서 _enc를 제거하고 재암호화
 * @param {string} sampleType - 시료 타입 (soil, water 등)
 * @param {number} year - 연도
 * @returns {Promise<{success: boolean, total: number, reEncrypted: number, failed: number, plaintext: number}>}
 */
async function reEncryptData(sampleType, year) {
    if (!window.firebaseConfig?.isEnabled()) {
        return { success: false, total: 0, reEncrypted: 0, failed: 0, plaintext: 0, error: 'Firebase not enabled' };
    }

    if (!window.encryptionManager?.isReady() || !window.CryptoUtils) {
        return { success: false, total: 0, reEncrypted: 0, failed: 0, plaintext: 0, error: 'Encryption not ready' };
    }

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return { success: false, total: 0, reEncrypted: 0, failed: 0, plaintext: 0, error: 'No DB' };

        const collectionName = getCollectionName(sampleType, year);
        const key = window.encryptionManager.getKey();

        console.log(`[ReEncrypt] Starting re-encryption: ${collectionName}`);

        // 1. 모든 문서 Raw 조회 (복호화 없이)
        const snapshot = await db.collection(collectionName).get();
        const total = snapshot.size;
        let reEncrypted = 0;
        let failed = 0;
        let plaintext = 0;

        console.log(`[ReEncrypt] Found ${total} documents in ${collectionName}`);

        // 배치로 처리 (450개씩)
        const BATCH_SIZE = 200;
        const docs = [];
        snapshot.forEach(doc => docs.push({ ref: doc.ref, id: doc.id, data: doc.data() }));

        for (let i = 0; i < docs.length; i += BATCH_SIZE) {
            const chunk = docs.slice(i, i + BATCH_SIZE);
            const batch = db.batch();

            for (const { ref, id, data } of chunk) {
                try {
                    if (!data._enc) {
                        // 이미 평문 → 암호화만 수행
                        const encrypted = await window.CryptoUtils.encryptRecord({ ...data }, key);
                        if (encrypted._enc) {
                            const saveData = { ...encrypted };
                            // 민감 필드 삭제
                            for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
                                if (!(field in saveData) || saveData[field] === undefined) {
                                    saveData[field] = firebase.firestore.FieldValue.delete();
                                }
                            }
                            saveData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                            batch.set(ref, saveData, { merge: true });
                            plaintext++;
                        }
                        continue;
                    }

                    // _enc가 있는 문서 → 평문 필드가 남아있는지 확인
                    const hasSensitiveFields = window.CryptoUtils.SENSITIVE_FIELDS.some(
                        f => data[f] && data[f] !== '[복호화 실패]'
                    );

                    if (!hasSensitiveFields) {
                        // 평문 필드가 없음 → 복호화 시도
                        try {
                            const decrypted = await window.CryptoUtils.decryptRecord({ ...data }, key);
                            // 복호화 성공 → 이미 올바른 키로 암호화됨, 스킵
                            console.log(`[ReEncrypt] ${id}: already correctly encrypted, skip`);
                            continue;
                        } catch {
                            // 복호화 실패 + 평문 없음 → 복구 불가
                            console.error(`[ReEncrypt] ${id}: UNRECOVERABLE - no plaintext, wrong key`);
                            failed++;
                            continue;
                        }
                    }

                    // 평문 필드가 있음 → _enc 제거 후 재암호화
                    console.log(`[ReEncrypt] ${id}: has plaintext fields, re-encrypting...`);

                    // _enc 제거한 클린 데이터
                    const cleanData = { ...data };
                    delete cleanData._enc;

                    // 현재 키로 암호화
                    const encrypted = await window.CryptoUtils.encryptRecord(cleanData, key);

                    if (encrypted._enc) {
                        const saveData = { ...encrypted };
                        // 민감 필드 명시적 삭제
                        for (const field of window.CryptoUtils.SENSITIVE_FIELDS) {
                            if (!(field in saveData) || saveData[field] === undefined) {
                                saveData[field] = firebase.firestore.FieldValue.delete();
                            }
                        }
                        saveData.updatedAt = firebase.firestore.FieldValue.serverTimestamp();
                        batch.set(ref, saveData, { merge: true });
                        reEncrypted++;
                    }
                } catch (docErr) {
                    console.error(`[ReEncrypt] ${id}: ERROR -`, docErr.message);
                    failed++;
                }
            }

            await batch.commit();
            console.log(`[ReEncrypt] Batch ${Math.floor(i / BATCH_SIZE) + 1} committed`);
        }

        const result = { success: true, total, reEncrypted, failed, plaintext };
        console.log(`[ReEncrypt] Complete:`, result);
        return result;
    } catch (error) {
        console.error('[ReEncrypt] Failed:', error);
        return { success: false, total: 0, reEncrypted: 0, failed: 0, plaintext: 0, error: error.message };
    }
}

/**
 * 모든 시료 타입의 데이터를 재암호화
 * @param {number} year - 연도
 * @returns {Promise<Object>} 타입별 결과
 */
async function reEncryptAll(year) {
    const types = Object.keys(COLLECTION_MAP);
    const results = {};

    for (const type of types) {
        console.log(`[ReEncrypt] Processing type: ${type}...`);
        results[type] = await reEncryptData(type, year);
    }

    console.log('[ReEncrypt] All types complete:', results);
    return results;
}

/**
 * Firebase 테스트 데이터 정리 (암호화 초기화용)
 * - test_system/encryptionKey 문서 삭제
 * - 모든 테스트 컬렉션에서 _enc 필드 제거
 * 콘솔에서 실행: await firestoreDb.cleanupEncryption(2026)
 * @param {number} year - 연도
 * @returns {Promise<Object>} 정리 결과
 */
async function cleanupEncryption(year) {
    if (!isFirestoreEnabled()) {
        return { error: 'Firestore not enabled' };
    }

    const db = window.firebaseConfig.getDb();
    const results = { systemKeyDeleted: false, collectionsCleared: {} };

    // 1. test_system/encryptionKey 삭제
    const systemCollection = COLLECTION_PREFIX ? COLLECTION_PREFIX + 'system' : '_system';
    try {
        await db.collection(systemCollection).doc('encryptionKey').delete();
        results.systemKeyDeleted = true;
        console.log(`[Cleanup] Deleted ${systemCollection}/encryptionKey`);
    } catch (err) {
        console.warn(`[Cleanup] ${systemCollection}/encryptionKey delete failed:`, err.message);
    }

    // _system (접두사 없는 것도) 삭제 시도
    try {
        await db.collection('_system').doc('encryptionKey').delete();
        console.log('[Cleanup] Deleted _system/encryptionKey (fallback)');
    } catch (err) {
        // 없을 수 있으므로 무시
    }

    // 2. 모든 테스트 컬렉션에서 _enc 필드 제거
    const types = Object.keys(COLLECTION_MAP);
    for (const type of types) {
        const collectionName = getCollectionName(type, year);
        try {
            const snapshot = await db.collection(collectionName).get();
            let cleaned = 0;

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (data._enc) {
                    // _enc 필드만 삭제 (FieldValue.delete() 사용)
                    await db.collection(collectionName).doc(docSnap.id).update({
                        _enc: firebase.firestore.FieldValue.delete()
                    });
                    cleaned++;
                }
            }

            results.collectionsCleared[type] = { total: snapshot.size, cleaned };
            if (cleaned > 0) {
                console.log(`[Cleanup] ${collectionName}: removed _enc from ${cleaned}/${snapshot.size} docs`);
            }
        } catch (err) {
            results.collectionsCleared[type] = { error: err.message };
            console.warn(`[Cleanup] ${collectionName} cleanup failed:`, err.message);
        }
    }

    console.log('[Cleanup] Complete:', JSON.stringify(results, null, 2));
    return results;
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
    getCollectionName: getCollectionName,
    reEncrypt: reEncryptData,
    reEncryptAll: reEncryptAll,
    cleanupEncryption: cleanupEncryption
};
