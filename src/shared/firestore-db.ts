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
// @ts-ignore - Firebase compat import
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

// Type definitions for Firebase compat
// @ts-ignore
type FirestoreDocumentSnapshot = firebase.firestore.DocumentSnapshot;
// @ts-ignore
type FirestoreQuerySnapshot = firebase.firestore.QuerySnapshot;

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
const logFirestore = (...args: unknown[]): void => {
    if (DEBUG_FIRESTORE) {
        console.log('[Firestore]', ...args);
    }
};

// Firebase 동기화 재시도 설정
interface FirebaseRetryConfig {
    maxRetries: number;
    retryDelay: number;
    maxDelay: number;
}

const FIREBASE_RETRY_CONFIG: FirebaseRetryConfig = {
    maxRetries: 3,
    retryDelay: 2000,  // 2초
    maxDelay: 8000     // 최대 8초
};

/**
 * Firebase 작업을 재시도 로직으로 감싸기
 */
async function withFirebaseRetry<T>(
    operation: () => Promise<T>,
    context: string
): Promise<T> {
    let lastError: Error | unknown;

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

            const errorCode = (error as { code?: string }).code;
            if (errorCode && noRetryErrors.includes(errorCode)) {
                logFirestore(`재시도 불가 에러 (${context}):`, errorCode);
                break;
            }

            // 마지막 시도가 아니면 재시도
            if (attempt < FIREBASE_RETRY_CONFIG.maxRetries) {
                const delay = Math.min(
                    FIREBASE_RETRY_CONFIG.retryDelay * Math.pow(2, attempt - 1),
                    FIREBASE_RETRY_CONFIG.maxDelay
                );

                logFirestore(`${context} 실패 (${attempt}/${FIREBASE_RETRY_CONFIG.maxRetries}), ${delay}ms 후 재시도:`, errorCode || (error as Error).message);

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
const COLLECTION_MAP: Record<string, string> = {
    'soil': 'soilSamples',
    'water': 'waterSamples',
    'compost': 'compostSamples',
    'heavyMetal': 'heavyMetalSamples',
    'heavy-metal': 'heavyMetalSamples',
    'pesticide': 'pesticideSamples'
};

/**
 * 컬렉션 이름 가져오기
 */
function getCollectionName(sampleType: string, year: number): string {
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
 */
function normalizeId(id: string | number | null | undefined): string {
    if (id == null) return '';
    return String(id);
}

/**
 * 데이터 배열의 ID 정규화
 */
function normalizeDataIds<T extends { id?: string | number }>(data: T[]): Array<T & { id: string }> {
    if (!Array.isArray(data)) return data as Array<T & { id: string }>;
    return data.map(item => ({
        ...item,
        id: normalizeId(item.id)
    }));
}

interface QueueMetadata {
    type: string;
    description: string;
    sampleType?: string;
    year?: number;
    docId?: string;
    count?: number;
}

/**
 * 단일 문서 저장/업데이트 (compat 버전)
 */
async function saveDocument(
    sampleType: string,
    year: number,
    docId: string,
    data: Record<string, unknown>
): Promise<boolean> {
    if (!window.firebaseConfig?.isEnabled()) {
        return false;
    }

    // 네트워크 상태 확인
    if (window.networkStatus && typeof window.networkStatus.queueOperation === 'function' && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(
            () => saveDocument(sampleType, year, docId, data),
            {
                type: 'firebase-save',
                description: `${sampleType} ${year}년 문서 ${docId} 저장`,
                sampleType,
                year,
                docId
            } as QueueMetadata
        );
        if (typeof window.showToast === 'function') {
            window.showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        }
        return true;
    }

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig!.getDb();
            if (!db) return false;

            const collectionName = getCollectionName(sampleType, year);
            const normalizedId = normalizeId(docId);

            const docData: Record<string, unknown> = {
                ...data,
                id: normalizedId,
                // @ts-ignore - Firebase compat FieldValue
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (!docData.createdAt) {
                // @ts-ignore - Firebase compat FieldValue
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
                } as QueueMetadata
            );
        }

        if (window.ErrorHandler) {
            window.ErrorHandler.handle(error, 'FIREBASE_SYNC', { silent: false });
        }
        return false;
    }
}

/**
 * 단일 문서 조회 (compat 버전)
 */
async function getDocument(
    sampleType: string,
    year: number,
    docId: string
): Promise<Record<string, unknown> | null> {
    if (!window.firebaseConfig?.isEnabled()) {
        return null;
    }

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return null;

        const collectionName = getCollectionName(sampleType, year);
        const docSnap = await db.collection(collectionName).doc(docId).get();

        if (docSnap.exists) {
            return { id: docSnap.id, ...docSnap.data() } as Record<string, unknown>;
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

interface GetAllDocumentsOptions {
    skipOrder?: boolean;
}

/**
 * 컬렉션 전체 조회 (compat 버전)
 */
async function getAllDocuments(
    sampleType: string,
    year: number,
    options: GetAllDocumentsOptions = {}
): Promise<Array<Record<string, unknown>>> {
    if (!window.firebaseConfig?.isEnabled()) {
        return [];
    }

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig!.getDb();
            if (!db) return [];

            const collectionName = getCollectionName(sampleType, year);
            const querySnapshot = await db.collection(collectionName).get();

            const documents: Array<Record<string, unknown>> = [];
            querySnapshot.forEach((doc: FirestoreDocumentSnapshot) => {
                const docData = doc.data() as Record<string, unknown>;
                documents.push({
                    ...docData,
                    id: normalizeId((docData.id as string | number | undefined) || doc.id)
                });
            });

            // 로컬에서 정렬 (오름차순: createdAt → updatedAt → 0)
            if (documents.length > 0) {
                documents.sort((a, b) => {
                    const aTime = ((a.createdAt as { seconds?: number })?.seconds || (a.updatedAt as { seconds?: number })?.seconds || 0);
                    const bTime = ((b.createdAt as { seconds?: number })?.seconds || (b.updatedAt as { seconds?: number })?.seconds || 0);
                    return aTime - bTime;
                });
            }

            logFirestore(`조회 완료: ${collectionName}, ${documents.length}건`);
            return normalizeDataIds(documents);
        }, 'getAllDocuments');
    } catch (error) {
        if (window.ErrorHandler && window.ErrorHandler.handle) {
            window.ErrorHandler.handle(error, 'FIREBASE_LOAD', { silent: true });
        }
        return [];
    }
}

/**
 * 문서 삭제 (compat 버전) - id 필드 기반 쿼리로 삭제
 */
async function deleteDocument(
    sampleType: string,
    year: number,
    docId: string
): Promise<boolean> {
    if (!window.firebaseConfig?.isEnabled()) {
        return false;
    }

    // 네트워크 상태 확인
    if (window.networkStatus && typeof window.networkStatus.queueOperation === 'function' && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(
            () => deleteDocument(sampleType, year, docId),
            {
                type: 'firebase-delete',
                description: `${sampleType} ${year}년 문서 ${docId} 삭제`,
                sampleType,
                year,
                docId
            } as QueueMetadata
        );
        if (typeof window.showToast === 'function') {
            window.showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        }
        return true;
    }

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig!.getDb();
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
            const deletePromises: Promise<void>[] = [];
            querySnapshot.forEach((docSnap: FirestoreDocumentSnapshot) => {
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
                } as QueueMetadata
            );
        }

        if (window.ErrorHandler) {
            window.ErrorHandler.handle(error, 'FIREBASE_SYNC', { silent: false });
        }
        return false;
    }
}

interface BatchSaveOptions {
    signal?: AbortSignal;
}

/**
 * 여러 문서 일괄 저장 (compat 버전 - 배치)
 * Firestore writeBatch는 최대 500개 작업으로 제한되므로 청크로 나누어 처리
 */
async function batchSave(
    sampleType: string,
    year: number,
    documents: Array<Record<string, unknown>>,
    options: BatchSaveOptions = {}
): Promise<boolean> {
    if (!window.firebaseConfig?.isEnabled() || !documents.length) {
        return false;
    }

    const { signal } = options;

    // 네트워크 상태 확인
    if (window.networkStatus && typeof window.networkStatus.queueOperation === 'function' && !window.networkStatus.isOnline) {
        window.networkStatus.queueOperation(
            () => batchSave(sampleType, year, documents, options),
            {
                type: 'firebase-batch',
                description: `${sampleType} ${year}년 데이터 ${documents.length}건 일괄 동기화`,
                sampleType,
                year,
                count: documents.length
            } as QueueMetadata
        );
        if (typeof window.showToast === 'function') {
            window.showToast('오프라인 상태입니다. 나중에 동기화됩니다.', 'warning');
        }
        return true;
    }

    const operationId = 'firebaseBatchSave';

    try {
        return await withFirebaseRetry(async () => {
            const db = window.firebaseConfig!.getDb();
            if (!db) return false;

            const collectionName = getCollectionName(sampleType, year);
            const CHUNK_SIZE = 500;
            const chunks: Array<Array<Record<string, unknown>>> = [];

            for (let i = 0; i < documents.length; i += CHUNK_SIZE) {
                chunks.push(documents.slice(i, i + CHUNK_SIZE));
            }

            logFirestore(`배치 저장 시작: ${collectionName}, ${documents.length}건 (${chunks.length} 청크)`);

            // 로딩 시작 (진행률 표시, 취소 버튼 포함)
            if (window.loadingManager) {
                window.loadingManager.show(operationId, `Firebase 동기화 중... (0/${chunks.length})`, {
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
                    const normalizedId = normalizeId(doc.id as string | number | undefined);
                    const docRef = db.collection(collectionName).doc(normalizedId);
                    const docData: Record<string, unknown> = {
                        ...doc,
                        id: normalizedId,
                        // @ts-ignore - Firebase compat FieldValue
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    };

                    if (!docData.createdAt) {
                        // @ts-ignore - Firebase compat FieldValue
                        docData.createdAt = firebase.firestore.FieldValue.serverTimestamp();
                    }

                    batch.set(docRef, docData, { merge: true });
                });

                await batch.commit();

                // 진행률 업데이트
                const progress = ((chunkIndex + 1) / chunks.length) * 100;
                if (window.loadingManager) {
                    window.loadingManager.updateProgress(
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
        if ((error as Error).name === 'AbortError') {
            if (typeof window.showToast === 'function') {
                window.showToast('동기화가 취소되었습니다.', 'info');
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
                } as QueueMetadata
            );
        }

        if (window.ErrorHandler) {
            window.ErrorHandler.handle(error, 'FIREBASE_SYNC', { silent: false });
        }
        return false;
    } finally {
        // 로딩 종료
        if (window.loadingManager) {
            window.loadingManager.hide(operationId);
        }
    }
}

interface MigrationResult {
    success: boolean;
    count: number;
}

/**
 * localStorage 데이터를 Firestore로 마이그레이션 (compat 버전)
 */
async function migrateFromLocalStorage(
    sampleType: string,
    year: number,
    localStorageKey: string
): Promise<MigrationResult> {
    if (!window.firebaseConfig?.isEnabled()) {
        return { success: false, count: 0 };
    }

    try {
        const localData = localStorage.getItem(localStorageKey);
        if (!localData) {
            logFirestore('마이그레이션할 데이터가 없습니다.');
            return { success: true, count: 0 };
        }

        const samples = JSON.parse(localData) as Array<Record<string, unknown>>;
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
 */
function generateUniqueId(): string {
    // crypto.randomUUID가 지원되면 사용 (더 안전한 난수)
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // 폴백: 타임스탬프 + crypto 안전 난수
    return Date.now().toString(36) + Array.from(crypto.getRandomValues(new Uint8Array(6)), b => b.toString(36)).join('').substring(0, 9);
}

/**
 * 마이그레이션용 ID 생성 (하위 호환성 유지)
 */
function generateMigrationId(): string {
    return generateUniqueId();
}

/**
 * 실시간 동기화 리스너 설정 (compat 버전)
 */
function subscribeToChanges(
    sampleType: string,
    year: number,
    callback: (documents: Array<Record<string, unknown>>, fromCache: boolean) => void
): (() => void) | null {
    if (!window.firebaseConfig?.isEnabled()) {
        return null;
    }

    try {
        const db = window.firebaseConfig.getDb();
        if (!db) return null;

        const collectionName = getCollectionName(sampleType, year);

        // orderBy 제거: updatedAt이 없는 문서가 제외되는 문제 방지
        const unsubscribe = db.collection(collectionName)
            .onSnapshot((snapshot: FirestoreQuerySnapshot) => {
                const documents: Array<Record<string, unknown>> = [];
                snapshot.forEach((doc: FirestoreDocumentSnapshot) => {
                    documents.push({ id: doc.id, ...doc.data() } as Record<string, unknown>);
                });
                callback(documents, snapshot.metadata.fromCache);
            }, (error: Error) => {
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
 */
function isFirestoreEnabled(): boolean {
    return window.firebaseConfig?.isEnabled() === true;
}

/**
 * 오프라인 지원 여부 확인
 */
function isFirestoreOfflineEnabled(): boolean {
    return window.firebaseConfig?.isOfflineSupported() === true;
}

// 전역으로 내보내기
window.firestoreDb = {
    // init은 호환성을 위해 빈 함수 (실제 초기화는 firebase-config에서 수행)
    init: async function(): Promise<boolean> {
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
