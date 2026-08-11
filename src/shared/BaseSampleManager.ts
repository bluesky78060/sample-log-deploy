// ========================================
// Base Sample Manager 클래스 (TypeScript)
// 모든 시료 타입의 공통 기능을 관리하는 기본 클래스
// ========================================

import { smartMerge as syncSmartMerge, mergeCloudData } from './sync-utils';
import type { DataItem } from './sync-utils';
import { sanitizeHTML } from './sanitize';

// ========================================
// Type Definitions
// ========================================

/**
 * Minimal BaseSample interface for generic constraint
 * Note: This is a minimal interface to ensure compatibility with different sample types.
 * The actual sample types in sample-types.d.ts extend this with additional fields.
 */
export interface BaseSample {
  /** Unique identifier (UUID) */
  id: string;
  /** Completion status */
  completed?: boolean;
}

/**
 * BaseSampleManager 생성자 설정
 */
export interface BaseSampleManagerConfig {
  moduleKey: string;
  moduleName: string;
  storageKey: string;
  sampleType?: string;
  autoSaveFile?: string;
  debug?: boolean;
}

/**
 * 공통 검색 필터 인터페이스
 */
export interface BaseSearchFilter {
  dateFrom: string;
  dateTo: string;
  name: string;
  receptionFrom: string;
  receptionTo: string;
  completed: 'all' | 'completed' | 'incomplete';
}

/**
 * Toast notification type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * File API Instance interface
 */
export interface FileAPIInstance {
  autoSavePath: string | null;
  autoSaveFileName: string | null;
  sampleType: string;
  init(year: number | string): Promise<void>;
  updateAutoSavePath(year: number | string): Promise<void>;
  saveFile(content: string, suggestedName?: string): Promise<boolean>;
  openFile(): Promise<string | null>;
  autoSave(content: string): Promise<boolean>;
  loadAutoSave(): Promise<string | null>;
  saveExcel?(buffer: ArrayBuffer, suggestedName?: string): Promise<boolean>;
}

/**
 * Pagination Manager Instance interface
 */
export interface PaginationManagerInstance {
  currentPage: number;
  itemsPerPage: number;
  totalPages: number;
  setData(data: unknown[]): void;
  setTableElements(tableBody: HTMLElement | null, emptyState: HTMLElement | null): void;
  goToPage(page: number): void;
  updatePagination(): void;
  reset(): void;
  getPageRange(): { start: number; end: number };
  render?(): void;
}

/**
 * Event Delegator interface
 */
export interface EventDelegator {
  on(eventType: string, selector: string, callback: (event: Event, target: HTMLElement) => void): void;
  off(eventType: string, selector?: string): void;
  destroy(): void;
}

// ========================================
// Firebase Cache Entry Type
// ========================================

interface FirebaseCacheEntry<T> {
  data: T[];
  timestamp: number;
  /** SAMPL-1-80: 캐시된 응답의 원래 fromCache 신뢰도 보존 */
  fromCache?: boolean;
}

// ========================================
// Base Sample Manager Class
// ========================================

/**
 * 시료 관리의 기본 클래스
 * 모든 시료 타입 (soil, water, compost, pesticide, heavy-metal)이 공통으로 사용하는 기능 제공
 *
 * @template T - 시료 데이터 타입 (BaseSample 확장)
 */
export abstract class BaseSampleManager<T extends BaseSample = BaseSample> {
  // ========================================
  // Config Properties
  // ========================================

  /** 모듈 키 (예: 'soil', 'water') */
  public readonly moduleKey: string;

  /** 모듈 표시명 (예: '토양', '수질분석') */
  public readonly moduleName: string;

  /** localStorage 키 (예: 'soilSampleLogs') */
  public readonly storageKey: string;

  /** 시료 타입명 */
  public readonly sampleType: string;

  /** 자동 저장 파일명 */
  public readonly autoSaveFile: string;

  /** 디버그 모드 여부 */
  public readonly debug: boolean;

  // ========================================
  // State Properties
  // ========================================

  /** 시료 데이터 배열 */
  protected sampleLogs: T[] = [];

  /** 선택된 연도 */
  protected selectedYear: string;

  /** 현재 편집 중인 항목 ID */
  protected editingId: string | null = null;

  /** 현재 페이지 (레거시) */
  protected currentPage: number = 1;

  /** 페이지당 항목 수 (레거시) */
  protected itemsPerPage: number = 100;

  /** 총 페이지 수 (레거시) */
  protected totalPages: number = 1;

  /** 클라우드 동기화 중 여부 */
  protected isCloudSyncing: boolean = false;

  /** L2: 클라우드 동기화 실패 상태 (중복 토스트 방지) */
  protected _cloudSyncFailed: boolean = false;

  /** L2: online 복귀 재시도 리스너 참조 */
  protected _retryCloudSyncHandler: (() => void) | null = null;

  /** Promise 기반 동기화 락 */
  protected cloudSyncPromise: Promise<void> | null = null;

  /** PER-5: 목록 뷰 리렌더 필요 여부 */
  protected listViewStale: boolean = true;

  /** 현재 검색 필터 (서브클래스에서 확장 가능) */
  protected currentSearchFilter: BaseSearchFilter = {
    dateFrom: '',
    dateTo: '',
    name: '',
    receptionFrom: '',
    receptionTo: '',
    completed: 'incomplete',
  };

  /** PER-9: 연도별 Firebase 데이터 캐시 */
  private _firebaseCache: Map<string, FirebaseCacheEntry<T>> = new Map();

  /** PER-9: 캐시 유효 시간 (30초) */
  private readonly _firebaseCacheTTL: number = 30000;

  // ========================================
  // DOM References
  // ========================================

  /** 폼 요소 */
  protected form: HTMLFormElement | null = null;

  /** 테이블 본문 요소 */
  protected tableBody: HTMLElement | null = null;

  /** 빈 상태 표시 요소 */
  protected emptyState: HTMLElement | null = null;

  /** 레코드 수 표시 요소 */
  protected recordCountEl: HTMLElement | null = null;

  // ========================================
  // Manager Instances
  // ========================================

  /** PaginationManager 인스턴스 */
  protected pagination: PaginationManagerInstance | null = null;

  /** FileAPI 인스턴스 */
  protected FileAPI: FileAPIInstance | undefined;

  /** 테이블 이벤트 위임자 */
  private tableDelegator: EventDelegator | null = null;

  // ========================================
  // Auto-save Properties
  // ========================================

  /** 자동 저장 타이머 ID */
  private autoSaveTimer: ReturnType<typeof setTimeout> | null = null;

  /** 마지막 저장 데이터 해시 */
  private lastSavedDataHash: string | null = null;

  // ========================================
  // Constructor
  // ========================================

  /**
   * BaseSampleManager 생성자
   * @param config - 시료 타입별 설정
   */
  constructor(config: BaseSampleManagerConfig) {
    // 설정
    this.moduleKey = config.moduleKey;
    this.moduleName = config.moduleName;
    this.storageKey = config.storageKey;
    this.sampleType = config.sampleType ?? config.moduleName;
    this.autoSaveFile = config.autoSaveFile ?? `${config.moduleKey}-autosave.json`;
    this.debug = config.debug ?? false;

    // 상태 초기화
    this.selectedYear = new Date().getFullYear().toString();

    // FileAPI 인스턴스 생성
    if (window.createFileAPI) {
      this.FileAPI = window.createFileAPI(this.moduleKey);
    }
  }

  // ========================================
  // 초기화 메서드
  // ========================================

  /**
   * 매니저 초기화
   */
  public async init(): Promise<void> {
    try {
      this.log('초기화 시작');

      // FileAPI 초기화
      if (this.FileAPI) {
        await this.FileAPI.init(this.getCurrentYear());
      }

      // Firebase + AutoSave 병렬 초기화
      await Promise.all([this.initFirebase(), this.initAutoSave()]);

      // UI 초기화 (DOM 요소 캐싱)
      this.initUI();

      // 데이터가 있는 연도 찾기
      this.selectedYear = this.findYearWithData();
      this.syncYearSelects(this.selectedYear);
      this.log('선택된 연도:', this.selectedYear);

      // 선택된 연도의 데이터 로드
      await this.loadYearData(this.selectedYear);

      // 이벤트 리스너 설정
      this.setupEventListeners();

      // 타입별 추가 이벤트 (서브클래스 hook)
      this.setupTypeSpecificEvents();

      // hash 기반 뷰 전환
      this.handleHashChange();
      window.addEventListener('hashchange', () => this.handleHashChange());

      this.log('초기화 완료');
    } catch (error) {
      (window.logger?.error || console.error)('매니저 초기화 실패:', error);
    }
  }

  /**
   * Firebase 초기화
   */
  protected async initFirebase(): Promise<void> {
    if (window.firebaseConfig?.initialize && !window.firebaseInitialized) {
      try {
        window.firebaseInitialized = await window.firebaseConfig.initialize();
        this.log('Firebase 초기화 결과:', window.firebaseInitialized);
      } catch (err) {
        (window.logger?.error || console.error)('Firebase 초기화 에러:', err);
      }
    }

    if (window.firebaseInitialized && window.firestoreDb?.init && !window.firestoreInitialized) {
      try {
        window.firestoreInitialized = await window.firestoreDb.init();
        this.log('Firestore 초기화 결과:', window.firestoreInitialized);
      } catch (err) {
        (window.logger?.error || console.error)('Firestore 초기화 에러:', err);
      }
    }
  }

  // ========================================
  // 연도 관리 메서드
  // ========================================

  /**
   * 현재 연도 반환
   */
  public getCurrentYear(): number {
    return new Date().getFullYear();
  }

  /**
   * 연도별 스토리지 키 생성
   * @param year - 연도
   */
  public getStorageKey(year: string): string {
    return `${this.storageKey}_${year}`;
  }

  /**
   * 데이터가 있는 연도 자동 감지
   */
  protected findYearWithData(): string {
    const currentYear = this.getCurrentYear();
    // 현재 연도부터 2020년까지 검색
    for (let year = currentYear; year >= 2020; year--) {
      const key = this.getStorageKey(year.toString());
      const data = localStorage.getItem(key);
      if (data) {
        try {
          const parsed = JSON.parse(data);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return year.toString();
          }
        } catch (e) {
          this.log('JSON 파싱 오류 (무시됨):', key, (e as Error).message);
        }
      }
    }
    return currentYear.toString();
  }

  /**
   * 연도 선택 드롭다운 동기화
   * @param newYear - 새로운 연도
   */
  protected syncYearSelects(newYear: string): void {
    const yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
    const listYearSelect = document.getElementById('listYearSelect') as HTMLSelectElement | null;

    if (yearSelect) yearSelect.value = newYear;
    if (listYearSelect) listYearSelect.value = newYear;

    this.selectedYear = newYear;
    this.onYearChange(newYear);
  }

  // ========================================
  // 데이터 관리 메서드
  // ========================================

  /**
   * 데이터 저장
   */
  public async saveLogs(): Promise<void> {
    this.listViewStale = true; // PER-5: 데이터 변경 시 목록 리렌더 필요
    this._firebaseCache.delete(this.selectedYear); // PER-9: 캐시 무효화

    // 저장 전 hook (서브클래스에서 데이터 가공)
    const processed = this.onBeforeSave(this.sampleLogs);
    if (processed) this.sampleLogs = processed;

    const yearStorageKey = this.getStorageKey(this.selectedYear);

    // ID 생성 (없는 경우)
    this.sampleLogs = this.sampleLogs.map((item) => ({
      ...item,
      id: item.id || this.generateId(),
    }));

    // 로컬 저장 (Firebase는 호출자에서 개별 변경분만 저장 — Quota 절감)
    try {
      localStorage.setItem(yearStorageKey, JSON.stringify(this.sampleLogs));
    } catch (e) {
      if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
        this.showToast('저장 공간이 부족합니다. 오래된 데이터를 정리해주세요.', 'error');
        (window.logger?.error || console.error)('localStorage QuotaExceededError:', e);
        return; // Don't proceed with Firebase sync or auto-save
      }
      throw e;
    }
    this.log('💾 로컬 저장 완료:', this.sampleLogs.length, '건');

    // Firebase 백그라운드 동기화 (UI 비블로킹 — 실패 시 토스트 + online 재시도)
    // soil은 자체 override로 개별 저장, 나머지(water/compost/heavy-metal/pesticide)는 batchSave
    // 주의: batchSave는 실패 시 throw가 아닌 false 반환 → 반환값 검사 필수
    // 빈 배열은 batchSave가 false를 반환하므로 호출 생략
    if (window.firestoreDb?.isEnabled() && this.sampleLogs.length > 0) {
      window.firestoreDb.batchSave(this.moduleKey, parseInt(this.selectedYear), this.sampleLogs as unknown as Record<string, unknown>[])
        .then((ok: boolean) => {
          if (ok) {
            this._clearCloudSyncFailure();
            this.log('Firebase 동기화 완료:', this.sampleLogs.length, '건');
          } else {
            this._handleCloudSyncFailure();
          }
        })
        .catch((err: unknown) => {
          (window.logger?.error || console.error)('Firebase 동기화 실패:', err);
          this._handleCloudSyncFailure();
        });
    }

    // 자동 저장 트리거
    this.triggerAutoSave();

    // 레코드 수 업데이트
    this.updateRecordCount();

    // 저장 후 hook
    this.onAfterSave(this.sampleLogs);
  }

  /**
   * 샘플 삭제 - Firebase 우선
   * @param id - 삭제할 샘플 ID
   */
  public async deleteSample(id: string): Promise<void> {
    this.listViewStale = true; // PER-5
    this._firebaseCache.delete(this.selectedYear); // PER-9: 캐시 무효화

    // 로컬 삭제 먼저 (UI 블로킹 방지)
    this.sampleLogs = this.sampleLogs.filter((l) => String(l.id) !== String(id));
    await this.saveLogs();
    this.filterAndRenderLogs();
    this.showToast('삭제되었습니다.', 'success');

    // Firebase 삭제 (백그라운드 — 실패 시 다음 병합에서 항목이 부활할 수 있으므로 사용자에게 알림)
    if (window.firestoreDb?.isEnabled()) {
      window.firestoreDb.delete(this.moduleKey, parseInt(this.selectedYear), String(id))
        .then((ok: boolean) => {
          if (ok) this.log('Firebase 삭제 완료:', id);
          else this._handleCloudSyncFailure();
        })
        .catch((err: unknown) => {
          (window.logger?.error || console.error)('Firebase 삭제 실패:', err);
          this._handleCloudSyncFailure();
        });
    }
  }

  /**
   * L2: 클라우드 동기화 실패 처리 — 사용자 알림 + 온라인 복귀 시 1회 자동 재시도
   * batchSave/delete는 실패 시 false를 반환하므로 호출부에서 이 메서드를 호출한다.
   */
  protected _handleCloudSyncFailure(): void {
    if (this._cloudSyncFailed) return; // 이미 알림/재시도 대기 중이면 중복 방지
    this._cloudSyncFailed = true;
    this.showToast(
      '클라우드 동기화 실패 — 데이터는 이 컴퓨터에 저장되어 있습니다. 온라인 연결 시 자동 재시도합니다.',
      'error'
    );
    if (!this._retryCloudSyncHandler) {
      this._retryCloudSyncHandler = () => {
        this._retryCloudSyncHandler = null;
        this._cloudSyncFailed = false;
        this.log('🔁 온라인 복귀 — 클라우드 동기화 재시도');
        this._retryCloudSyncAction();
      };
      window.addEventListener('online', this._retryCloudSyncHandler, { once: true });
    }
  }

  /**
   * L2: online 복귀 시 실행할 재시도 동작 — 서브클래스 오버라이드 지점
   * (기본: saveLogs가 전체 batchSave를 수행. soil처럼 saveLogs가 로컬 전용인
   *  서브클래스는 클라우드 동기화 메서드로 오버라이드할 것)
   */
  protected _retryCloudSyncAction(): void {
    this.saveLogs();
  }

  /**
   * L2: 동기화 성공 시 실패 상태 해제 — 플래그 리셋 + 대기 중 재시도 리스너 정리
   */
  protected _clearCloudSyncFailure(): void {
    this._cloudSyncFailed = false;
    if (this._retryCloudSyncHandler) {
      window.removeEventListener('online', this._retryCloudSyncHandler);
      this._retryCloudSyncHandler = null;
    }
  }


  /**
   * 년도별 데이터 로드
   * @param year - 연도
   */
  public async loadYearData(year: string): Promise<void> {
    this.listViewStale = true; // PER-5
    this.log(`📅 ${year}년 데이터 로드 시작`);

    try {
      const yearStorageKey = this.getStorageKey(year);
      this.log(' loadYearData - storageKey:', yearStorageKey);

      // Firebase가 활성화되어 있으면 Firebase에서 먼저 데이터 로드
      if (window.firebaseConfig?.isEnabled()) {
        try {
          // PER-9: TTL 기반 Firebase 캐시 확인
          const cacheEntry = this._firebaseCache.get(year);
          const cacheValid = cacheEntry && Date.now() - cacheEntry.timestamp < this._firebaseCacheTTL;
          this.log(cacheValid ? ` Firebase 캐시 사용 (${year}년)` : ' Firebase에서 데이터 로드 시작');
          // SAMPL-1-80: firebaseLogs와 함께 fromCache(읽기 신뢰도)도 확보
          let firebaseLogs: T[];
          let fromCache: boolean;
          if (cacheValid) {
            firebaseLogs = cacheEntry!.data;
            fromCache = cacheEntry!.fromCache === true; // 캐시된 응답의 원래 신뢰도 보존
          } else {
            const res = await this.loadFromFirebase(year);
            firebaseLogs = res.data;
            fromCache = res.fromCache === true;
          }

          if (firebaseLogs && firebaseLogs.length > 0) {
            this.log(' Firebase 데이터:', firebaseLogs.length, '건', `(fromCache=${fromCache})`);

            // L2-P0: 무병합 덮어쓰기 금지 — 미업로드 로컬 항목(syncedAt 없음) 보존
            // SAMPL-1-80: fromCache(불완전 가능) 읽기에서는 cross-device 삭제를 보류
            const localLogs = this.loadFromLocalStorage(yearStorageKey);
            const merged = mergeCloudData(
              localLogs as unknown as DataItem[],
              firebaseLogs as unknown as DataItem[],
              { fromCache }
            );
            this.sampleLogs = merged.data as unknown as T[];

            // PER-9: TTL 포함 캐시 저장 (Firebase 원본 응답 기준 — 병합 결과 아님)
            if (!cacheValid) {
              this._firebaseCache.set(year, { data: firebaseLogs, fromCache, timestamp: Date.now() });
            }

            // 병합 결과를 localStorage에 저장
            try {
              localStorage.setItem(yearStorageKey, JSON.stringify(merged.data));
            } catch (e) {
              if (e instanceof DOMException && (e.name === 'QuotaExceededError' || e.code === 22)) {
                (window.logger?.error || console.error)('localStorage QuotaExceededError (Firebase 캐싱):', e);
              } else {
                throw e;
              }
            }
            this.log(` Firebase 데이터를 localStorage에 캐싱 (로컬 전용 ${merged.localOnly.length}건 보존)`);

            // 보존된 로컬 전용 항목을 클라우드로 재업로드 (전체가 아닌 localOnly만 —
            // 전체 재업로드 시 모든 문서의 updatedAt이 갱신되어 타 기기 병합을 교란함)
            if (merged.localOnly.length > 0 && window.firestoreDb?.isEnabled()) {
              window.firestoreDb.batchSave(this.moduleKey, parseInt(year), merged.localOnly as unknown as Record<string, unknown>[])
                .then((ok: boolean) => {
                  if (ok) {
                    this.log(`☁️ 로컬 전용 ${merged.localOnly.length}건 클라우드 업로드 완료`);
                    // M-1: 캐시 무효화 — TTL 창 내 stale 캐시로 인한 반복 재업로드 방지
                    this._firebaseCache.delete(year);
                  } else {
                    this._handleCloudSyncFailure();
                  }
                })
                .catch(() => this._handleCloudSyncFailure());
            }
          } else {
            this.log(' Firebase에 데이터 없음, localStorage 확인');
            // Firebase에 데이터가 없으면 localStorage 확인
            this.sampleLogs = this.loadFromLocalStorage(yearStorageKey);
          }
        } catch (error) {
          (window.logger?.error || console.error)('Firebase 로드 실패:', error);
          // Firebase 로드 실패 시 localStorage 폴백
          this.sampleLogs = this.loadFromLocalStorage(yearStorageKey);
        }
      } else {
        this.log(' Firebase 비활성화, localStorage에서 로드');
        // Firebase가 비활성화되어 있으면 localStorage에서 로드
        this.sampleLogs = this.loadFromLocalStorage(yearStorageKey);
      }

      this.log(' 최종 sampleLogs 설정:', this.sampleLogs.length, '건');

      // 공통 마이그레이션 적용
      this.sampleLogs = this.migrateCompletedField(this.sampleLogs);

      // 추가 마이그레이션 (서브클래스 hook)
      const migrations = this.getAdditionalMigrations();
      for (const migrate of migrations) {
        const result = migrate(this.sampleLogs);
        if (result) this.sampleLogs = result;
      }

      // 후처리 hook (예: water의 smartMerge)
      const processed = this.onAfterLoad(this.sampleLogs, year);
      if (processed) this.sampleLogs = processed;

      // UI 업데이트 (기본 필터 적용)
      this.filterAndRenderLogs();
      this.updateRecordCount();

      // 다음 접수번호 설정 (서브클래스에서 구현된 경우)
      if (typeof (this as unknown as { generateNextReceptionNumber?: () => string }).generateNextReceptionNumber === 'function') {
        const nextNumber = (this as unknown as { generateNextReceptionNumber: () => string }).generateNextReceptionNumber();
        const receptionNumberInput = document.getElementById('receptionNumber') as HTMLInputElement | null;
        if (receptionNumberInput && nextNumber) {
          receptionNumberInput.value = nextNumber;
          receptionNumberInput.dataset.baseNumber = nextNumber;
        }
      }

      // FileAPI 경로 업데이트
      if (this.FileAPI) {
        await this.FileAPI.updateAutoSavePath(year);
      }

      // 자동 저장 트리거
      this.triggerAutoSave();

      this.log(`✅ ${year}년 데이터 로드 완료:`, this.sampleLogs.length, '건');
    } catch (error) {
      (window.logger?.error || console.error)('데이터 로드 실패:', error);
      this.showToast('데이터 로드 실패', 'error');
    }
  }

  /**
   * localStorage에서 데이터 로드 (헬퍼)
   */
  private loadFromLocalStorage(key: string): T[] {
    const localData = localStorage.getItem(key);
    if (localData) {
      try {
        const parsed = JSON.parse(localData);
        if (Array.isArray(parsed)) {
          return parsed as T[];
        }
      } catch {
        // 파싱 실패
      }
    }
    return [];
  }

  /**
   * 클라우드 동기화
   * @param year - 연도
   * @param localLogs - 로컬 로그 데이터
   */
  public async syncWithCloud(year: string, localLogs: T[]): Promise<void> {
    if (!window.firebaseConfig?.isEnabled()) {
      return;
    }

    // Promise-based lock: 이미 동기화 중이면 기존 작업 완료 대기
    if (this.cloudSyncPromise) {
      this.log('⏳ 기존 동기화 작업 대기 중...');
      await this.cloudSyncPromise;
      return;
    }

    this.cloudSyncPromise = (async () => {
      this.isCloudSyncing = true;
      this.log('☁️ 클라우드 동기화 시작');

      try {
        // SAMPL-1-80: loadFromFirebase는 { data, fromCache } 반환
        const { data: firebaseLogs, fromCache } = await this.loadFromFirebase(year);

        if (firebaseLogs && firebaseLogs.length > 0) {
          // SAMPL-1-80: fromCache(불완전 가능) 읽기에서는 cross-device 삭제 보류
          const mergedLogs = this.smartMerge(localLogs, firebaseLogs, { allowDeletions: !fromCache });

          if (
            mergedLogs.length !== localLogs.length ||
            this.hasChanges(localLogs, mergedLogs)
          ) {
            this.sampleLogs = mergedLogs;
            localStorage.setItem(this.getStorageKey(year), JSON.stringify(mergedLogs));
            this.log('✅ 클라우드 데이터 병합 완료');
          }
        }
      } finally {
        this.isCloudSyncing = false;
        this.cloudSyncPromise = null;
      }
    })();

    await this.cloudSyncPromise;
  }

  /**
   * Firebase에서 데이터 로드
   * @param year - 연도
   */
  protected async loadFromFirebase(year: string): Promise<{ data: T[]; fromCache: boolean }> {
    try {
      this.log(' Firebase getAll 호출 - moduleKey:', this.moduleKey, ', year:', year);
      this.log(' Firebase 상태:', {
        isEnabled: window.firestoreDb?.isEnabled ? window.firestoreDb.isEnabled() : 'isEnabled 메서드 없음',
        getAll: typeof window.firestoreDb?.getAll,
        firestoreDb: !!window.firestoreDb,
      });

      // SAMPL-1-80: fromCache 메타 포함 조회 (있으면) — 불완전 캐시 읽기 시 삭제 보류 판단용
      let data: Array<Record<string, unknown>> | undefined;
      let fromCache = false;
      if (typeof window.firestoreDb?.getAllWithMeta === 'function') {
        const res = await window.firestoreDb.getAllWithMeta(this.moduleKey, parseInt(year));
        data = res.documents;
        fromCache = res.fromCache === true;
      } else {
        data = await window.firestoreDb?.getAll(this.moduleKey, parseInt(year));
      }
      this.log(' Firebase 응답:', data ? `${data.length}건 (fromCache=${fromCache})` : 'null/undefined');
      this.log(' Firebase 데이터 샘플:', data && data.length > 0 ? data[0] : 'No data');
      return { data: (data as T[]) || [], fromCache };
    } catch (error) {
      (window.logger?.error || console.error)(`[${this.moduleName}] Firebase 로드 오류 상세:`, error);
      (window.logger?.error || console.error)('Firebase 로드 실패:', error);
      return { data: [], fromCache: false };
    }
  }

  /**
   * 스마트 병합 - sync-utils ES 모듈 import 사용
   */
  protected smartMerge(localData: T[], firebaseData: T[], options: { allowDeletions?: boolean } = {}): T[] {
    const result = syncSmartMerge(
      localData as Array<{ id: string }>,
      firebaseData as Array<{ id: string }>,
      options
    );
    return result.data as T[];
  }

  /**
   * 데이터 변경 감지 (최적화: 배열의 경우 id/updatedAt만 비교)
   */
  protected hasChanges(data1: unknown, data2: unknown): boolean {
    if (!Array.isArray(data1) || !Array.isArray(data2)) {
      return JSON.stringify(data1) !== JSON.stringify(data2);
    }
    if (data1.length !== data2.length) return true;
    for (let i = 0; i < data1.length; i++) {
      const item1 = data1[i] as Record<string, unknown>;
      const item2 = data2[i] as Record<string, unknown>;
      if (item1.id !== item2.id) return true;
      if (item1.updatedAt !== item2.updatedAt) return true;
    }
    return false;
  }

  // ========================================
  // 자동 저장 메서드
  // ========================================

  /**
   * 자동 저장 초기화
   */
  protected async initAutoSave(): Promise<void> {
    if (!this.FileAPI || !window.isElectron) {
      return;
    }

    // SampleUtils가 있으면 사용
    if (window.SampleUtils?.initAutoSave) {
      await window.SampleUtils.initAutoSave({
        moduleKey: this.moduleKey,
        moduleName: this.moduleName,
        FileAPI: this.FileAPI,
        currentYear: this.selectedYear,
        log: (...args: unknown[]) => this.log(...args),
        showToast: window.showToast,
      });

      // 자동 저장 파일에서 데이터 로드하는 함수
      window.loadFromAutoSaveFile = async () => {
        return await window.SampleUtils!.loadFromAutoSaveFile(
          this.FileAPI!,
          (...args: unknown[]) => this.log(...args)
        );
      };
    } else {
      // 폴백: 기본 자동 저장 처리
      try {
        const savedData = await this.FileAPI.loadAutoSave();
        if (savedData) {
          this.lastSavedDataHash = this.hashData(JSON.parse(savedData));
        }
      } catch (error) {
        this.log('자동 저장 데이터 로드 실패:', error);
      }
    }
  }

  /**
   * 자동 저장 트리거
   */
  protected triggerAutoSave(): void {
    if (!this.FileAPI || !window.isElectron) {
      return;
    }

    // 기존 타이머 클리어
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
    }

    // 3초 후 저장
    this.autoSaveTimer = setTimeout(() => {
      this.performAutoSave();
    }, 3000);
  }

  /**
   * 자동 저장 수행
   */
  protected async performAutoSave(): Promise<void> {
    try {
      // 자동 저장 활성화 여부 확인
      const enabledKey = `${this.moduleKey}AutoSaveEnabled`;
      if (localStorage.getItem(enabledKey) !== 'true') return;

      const currentDataHash = this.hashData(this.sampleLogs);

      // 데이터가 변경된 경우만 저장
      if (currentDataHash !== this.lastSavedDataHash) {
        const content = JSON.stringify(
          {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalRecords: this.sampleLogs.length,
            data: this.sampleLogs,
          },
          null,
          2
        );
        const result = await this.FileAPI!.autoSave(content);

        if (result) {
          this.lastSavedDataHash = currentDataHash;
          this.log('✅ 자동 저장 완료');
        }
      }
    } catch (error) {
      this.log('자동 저장 실패:', error);
    }
  }

  /**
   * 데이터 해시 생성
   */
  protected hashData(data: unknown): string {
    const str = JSON.stringify(data);
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString();
  }

  // ========================================
  // UI 관리 메서드
  // ========================================

  /**
   * UI 초기화
   */
  protected initUI(): void {
    // DOM 요소 캐싱
    this.cacheElements();

    // 뷰 초기화
    this.initViews();

    // 페이지네이션 초기화
    this.initPagination();

    // 이벤트 위임 설정
    this.setupTableEventDelegation();
  }

  /**
   * 테이블 이벤트 위임 설정 (메모리 효율적인 이벤트 처리)
   */
  protected setupTableEventDelegation(): void {
    if (!this.tableBody || !window.EventDelegator) return;

    this.tableDelegator = new window.EventDelegator(this.tableBody);

    // 수정 버튼
    this.tableDelegator.on('click', '.btn-edit', (_e: Event, target: HTMLElement) => {
      const id = target.dataset.id;
      if (id) this.editSample(id);
    });

    // 삭제 버튼
    this.tableDelegator.on('click', '.btn-delete', (_e: Event, target: HTMLElement) => {
      const id = target.dataset.id;
      if (id && confirm('이 항목을 삭제하시겠습니까?')) {
        this.deleteSample(id);
      }
    });

    // 완료 토글 버튼
    this.tableDelegator.on('click', '.btn-complete', (_e: Event, target: HTMLElement) => {
      const id = target.dataset.id;
      const self = this as unknown as { toggleComplete?: (id: string) => void };
      if (id && typeof self.toggleComplete === 'function') {
        self.toggleComplete(id);
      }
    });

    // 판정 토글 버튼
    this.tableDelegator.on('click', '.btn-result', (_e: Event, target: HTMLElement) => {
      const id = target.dataset.id;
      const self = this as unknown as { toggleResult?: (id: string) => void };
      if (id && typeof self.toggleResult === 'function') {
        self.toggleResult(id);
      }
    });

    // 접수번호 클릭 (편집)
    this.tableDelegator.on('click', '.btn-link.edit-btn', (e: Event, target: HTMLElement) => {
      e.preventDefault();
      const row = target.closest('tr');
      const editBtn = row?.querySelector('.btn-edit') as HTMLElement | null;
      const id = editBtn?.dataset.id;
      if (id) this.editSample(id);
    });
  }

  /**
   * 리소스 정리 (메모리 누수 방지)
   */
  public destroy(): void {
    // 이벤트 위임 정리
    if (this.tableDelegator) {
      this.tableDelegator.destroy();
      this.tableDelegator = null;
    }

    // 자동 저장 타이머 정리
    if (this.autoSaveTimer) {
      clearTimeout(this.autoSaveTimer);
      this.autoSaveTimer = null;
    }

    // 참조 정리
    this.form = null;
    this.tableBody = null;
    this.emptyState = null;
    this.recordCountEl = null;
  }

  /**
   * DOM 요소 캐싱
   */
  protected cacheElements(): void {
    this.form = document.getElementById('sampleForm') as HTMLFormElement | null;
    this.tableBody = document.getElementById('sampleTableBody');
    this.emptyState = document.querySelector('.empty-state');
    this.recordCountEl = document.getElementById('recordCount');
  }

  /**
   * 뷰 전환
   * @param viewName - 뷰 이름
   */
  public switchView(viewName: string): void {
    const views = document.querySelectorAll('.view');
    const navItems = document.querySelectorAll('.nav-btn');

    views.forEach((view) => view.classList.remove('active'));
    navItems.forEach((nav) => nav.classList.remove('active'));

    const targetView = document.getElementById(`${viewName}View`);
    const targetNav = document.querySelector(`.nav-btn[data-view="${viewName}"]`);

    if (targetView) targetView.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    // 목록 뷰로 전환 시 변경된 경우에만 테이블 새로고침 (PER-5)
    if (viewName === 'list' && this.listViewStale) {
      this.filterAndRenderLogs();
      this.listViewStale = false;
    }
  }

  /**
   * 레코드 수 업데이트
   */
  protected updateRecordCount(): void {
    if (this.recordCountEl) {
      const total = this.sampleLogs.length;
      const incomplete = this.sampleLogs.filter((log: T) => !(log as Record<string, unknown>).isComplete).length;
      this.recordCountEl.textContent = incomplete > 0
        ? `총 ${total}건 (미완료 ${incomplete}건)`
        : `총 ${total}건`;
    }
  }

  /**
   * 토스트 메시지 표시
   */
  protected showToast(message: string, type: ToastType = 'info'): void {
    if (window.showToast) {
      window.showToast(message, type);
    }
  }

  // ========================================
  // 이벤트 리스너 설정
  // ========================================

  /**
   * 이벤트 리스너 설정
   */
  protected setupEventListeners(): void {
    // 네비게이션
    this.setupNavigation();

    // 폼 이벤트
    this.setupFormEvents();

    // 연도 선택
    this.setupYearSelection();

    // 전화번호 포맷팅
    this.setupPhoneFormatting();

    // 수령 방법 선택
    this.setupReceptionMethod();
  }

  /**
   * 네비게이션 이벤트 설정
   */
  protected setupNavigation(): void {
    const navItems = document.querySelectorAll<HTMLElement>('.nav-btn');
    navItems.forEach((item) => {
      item.addEventListener('click', () => {
        const viewName = item.dataset.view;
        if (viewName) {
          this.switchView(viewName);
        }
      });
    });
  }

  /**
   * 폼 이벤트 설정
   */
  protected setupFormEvents(): void {
    if (this.form) {
      this.form.addEventListener('submit', (e) => {
        e.preventDefault();
        this.submitForm();
      });

      // 취소 버튼
      const cancelBtn = document.getElementById('cancelBtn');
      if (cancelBtn) {
        cancelBtn.addEventListener('click', () => {
          this.resetForm();
          this.editingId = null;
          this.switchView('register');
        });
      }
    }
  }

  /**
   * 연도 선택 이벤트 설정
   */
  protected setupYearSelection(): void {
    const yearSelect = document.getElementById('yearSelect') as HTMLSelectElement | null;
    const listYearSelect = document.getElementById('listYearSelect') as HTMLSelectElement | null;

    if (yearSelect) {
      yearSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this._firebaseCache.delete(target.value); // 연도 변경 시 캐시 무효화 → Firebase 재동기화
        this.syncYearSelects(target.value);
        this.loadYearData(target.value);
      });
    }

    if (listYearSelect) {
      listYearSelect.addEventListener('change', (e) => {
        const target = e.target as HTMLSelectElement;
        this._firebaseCache.delete(target.value); // 연도 변경 시 캐시 무효화 → Firebase 재동기화
        this.syncYearSelects(target.value);
        this.loadYearData(target.value);
      });
    }
  }

  /**
   * 전화번호 포맷팅 설정
   */
  protected setupPhoneFormatting(): void {
    const phoneInput = document.getElementById('phoneNumber') as HTMLInputElement | null;
    if (phoneInput && window.formatPhoneNumber) {
      phoneInput.addEventListener('input', (e) => {
        const target = e.target as HTMLInputElement;
        target.value = window.formatPhoneNumber!(target.value);
      });
    }
  }

  /**
   * 수령 방법 버튼 설정
   */
  protected setupReceptionMethod(): void {
    const methodBtns = document.querySelectorAll<HTMLButtonElement>('.method-btn');
    const methodInput = document.getElementById('receptionMethod') as HTMLInputElement | null;

    methodBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        methodBtns.forEach((b) => b.classList.remove('active'));
        btn.classList.add('active');
        if (methodInput) {
          methodInput.value = btn.dataset.value ?? '';
        }
      });
    });
  }

  // ========================================
  // 유틸리티 메서드
  // ========================================

  /**
   * 고유 ID 생성
   */
  protected generateId(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    return window.SampleUtils?.generateUUID?.() ?? crypto.randomUUID();
  }

  /**
   * 디버그 로그
   */
  protected log(...args: unknown[]): void {
    if (this.debug) {
      (window.logger?.debug || console.log)(`[${this.moduleName}]`, ...args);
    }
  }

  // ========================================
  // 추상 메서드 (서브클래스에서 구현 필요)
  // ========================================

  /**
   * 폼 제출 처리
   * @abstract
   */
  public abstract submitForm(): void;

  /**
   * 샘플 편집
   * @abstract
   * @param id - 편집할 샘플 ID
   */
  public abstract editSample(id: string): void;

  /**
   * 폼 초기화
   * @abstract
   */
  public abstract resetForm(): void;

  /**
   * 타입별 추가 이벤트 설정
   * @abstract
   */
  protected abstract setupTypeSpecificEvents(): void;

  // ========================================
  // 가상 메서드 (오버라이드 가능)
  // ========================================

  /**
   * 접수번호에서 숫자 추출
   */
  protected extractReceptionNumber(receptionNumber: string): number {
    const match = receptionNumber.match(/(\d+)$/);
    return match ? parseInt(match[1], 10) : 0;
  }

  /**
   * 공통 필터 체인 적용
   * 서브클래스에서 추가 필터가 필요하면 applyAdditionalFilters()를 오버라이드
   */
  public filterAndRenderLogs(): void {
    const filtered = this.sampleLogs.filter((log: T) => {
      const anyLog = log as Record<string, unknown>;

      // 성명 검색
      const matchesName = !this.currentSearchFilter.name ||
        ((anyLog.name as string) || '').toLowerCase().includes(this.currentSearchFilter.name);

      // 접수번호 범위 검색
      let matchesReception = true;
      if (this.currentSearchFilter.receptionFrom || this.currentSearchFilter.receptionTo) {
        const logNum = this.extractReceptionNumber((anyLog.receptionNumber as string) || '');
        const fromNum = this.currentSearchFilter.receptionFrom ? parseInt(this.currentSearchFilter.receptionFrom, 10) : 0;
        const toNum = this.currentSearchFilter.receptionTo ? parseInt(this.currentSearchFilter.receptionTo, 10) : Infinity;
        if (fromNum && logNum < fromNum) matchesReception = false;
        if (toNum !== Infinity && logNum > toNum) matchesReception = false;
      }

      // 날짜 범위 검색
      let matchesDate = true;
      if (this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo) {
        const logDate = (anyLog.date as string) || '';
        if (this.currentSearchFilter.dateFrom && logDate < this.currentSearchFilter.dateFrom) matchesDate = false;
        if (this.currentSearchFilter.dateTo && logDate > this.currentSearchFilter.dateTo) matchesDate = false;
      }

      // 완료 상태 필터
      let matchesCompleted = true;
      if (this.currentSearchFilter.completed === 'completed') {
        matchesCompleted = anyLog.isComplete === true;
      } else if (this.currentSearchFilter.completed === 'incomplete') {
        matchesCompleted = !anyLog.isComplete;
      }

      // 추가 필터 (서브클래스에서 오버라이드)
      const matchesAdditional = this.applyAdditionalFilters(log);

      return matchesName && matchesReception && matchesDate && matchesCompleted && matchesAdditional;
    });

    this.renderLogs(filtered);
    this.updateSearchButtonState();
  }

  /**
   * 추가 필터 적용 hook (서브클래스에서 오버라이드)
   * @returns true면 포함, false면 제외
   */
  protected applyAdditionalFilters(_log: T): boolean {
    return true;
  }

  /**
   * 검색 버튼 상태 업데이트
   */
  protected updateSearchButtonState(): void {
    const hasFilter = this.currentSearchFilter.dateFrom || this.currentSearchFilter.dateTo ||
      this.currentSearchFilter.name || this.currentSearchFilter.receptionFrom ||
      this.currentSearchFilter.receptionTo ||
      (this.currentSearchFilter.completed && this.currentSearchFilter.completed !== 'incomplete');
    const openSearchModalBtn = document.getElementById('openSearchModalBtn');
    if (openSearchModalBtn) {
      if (hasFilter) {
        openSearchModalBtn.classList.add('has-filter');
        openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색 중');
      } else {
        openSearchModalBtn.classList.remove('has-filter');
        openSearchModalBtn.innerHTML = sanitizeHTML('🔍 검색');
      }
    }
  }

  /**
   * 로그 렌더링 (테이블 그리기)
   */
  public renderLogs(logs: T[]): void {
    // 서브클래스의 prepareDataForRender hook
    const preparedData = this.prepareDataForRender(logs);

    if (this.pagination) {
      this.pagination.setData(preparedData);
    } else {
      // PaginationManager 없이 직접 렌더링 (폴백)
      if (this.tableBody) {
        this.tableBody.innerHTML = '';
        preparedData.forEach((item, index) => {
          const row = this.buildTableRow(item, index);
          if (row) this.tableBody!.appendChild(row);
        });
      }
    }
  }

  /**
   * 테이블 행 빌드 (PaginationManager에서 호출)
   * @param item - 데이터 항목
   * @param index - 인덱스
   * @returns tr 요소 또는 null
   */
  public buildTableRow(_item: unknown, _index: number): HTMLElement | null {
    // 서브클래스에서 구현 필요
    // PaginationManager 미사용 시에는 구현하지 않아도 됨
    return null;
  }

  /**
   * 렌더링 전 데이터 가공 - 기본: 접수번호 오름차순 정렬
   * @param logs - 원본 데이터
   * @returns 가공된 데이터
   */
  protected prepareDataForRender(logs: T[]): T[] {
    return [...logs].sort((a, b) => {
      const anyA = a as Record<string, unknown>;
      const anyB = b as Record<string, unknown>;
      const numA = parseInt((anyA.receptionNumber as string) || '', 10) || 0;
      const numB = parseInt((anyB.receptionNumber as string) || '', 10) || 0;
      return numA - numB;
    });
  }

  /**
   * 추가 마이그레이션 함수 목록 (pesticide: migrateProducerAddress 등)
   * @returns 마이그레이션 함수 배열
   */
  protected getAdditionalMigrations(): Array<(logs: T[]) => T[] | void> {
    return [];
  }

  /**
   * 공통 completed 필드 마이그레이션
   * @param logs - 데이터
   * @returns 마이그레이션된 데이터
   */
  protected migrateCompletedField(logs: T[]): T[] {
    if (!Array.isArray(logs)) return logs;
    return logs.map((log) => {
      const anyLog = log as Record<string, unknown>;
      if (anyLog.completed !== undefined || anyLog.isCompleted !== undefined) {
        anyLog.isComplete = anyLog.isComplete || anyLog.isCompleted || anyLog.completed || false;
        delete anyLog.completed;
        delete anyLog.isCompleted;
      }
      if (anyLog.isComplete === undefined) {
        anyLog.isComplete = false;
      }
      return log;
    });
  }

  /**
   * hash 기반 뷰 전환
   */
  protected handleHashChange(): void {
    const hash = window.location.hash.replace('#', '');
    if (hash) {
      this.switchView(hash);
    }
  }

  /**
   * 페이지 변경 시 콜백 (서브클래스에서 override)
   */
  protected onPageChange(_page: number, _pageData: unknown[]): void {
    // 서브클래스에서 오버라이드 가능
  }

  /**
   * 데이터 로드 후처리 hook
   */
  protected onAfterLoad(data: T[], _year: string): T[] {
    return data;
  }

  // ========================================
  // Hook 메서드 (선택적 오버라이드)
  // ========================================

  /**
   * 뷰 초기화 시 호출
   */
  protected initViews(): void {
    // 서브클래스에서 오버라이드 가능
  }

  /**
   * 페이지네이션 초기화
   */
  protected initPagination(): void {
    if (!window.PaginationManager) return;

    this.pagination = new window.PaginationManager({
      storageKey: `${this.moduleKey}ItemsPerPage`,
      defaultItemsPerPage: 100,
      onPageChange: (page: number, pageData: unknown[]) => {
        this.onPageChange(page, pageData);
      },
      renderRow: (item: unknown, index: number) => {
        return this.buildTableRow(item, index);
      },
    });

    this.pagination.setTableElements(this.tableBody, this.emptyState);
  }

  /**
   * 연도 변경 시 호출
   */
  protected onYearChange(_newYear: string): void {
    // 서브클래스에서 오버라이드 가능
  }

  /**
   * 데이터 저장 전 처리
   */
  protected onBeforeSave(data: T[]): T[] {
    return data;
  }

  /**
   * 데이터 저장 후 처리
   */
  protected onAfterSave(_data: T[]): void {
    // 서브클래스에서 오버라이드 가능
  }

  // ========================================
  // 정적 유틸리티 메서드
  // ========================================

  /**
   * 등록 결과 테이블 빌드 (DOM 직접 조작으로 XSS 방지)
   * @param tableBody - tbody 요소
   * @param rows - 테이블 행 데이터
   */
  public static buildResultTable(
    tableBody: HTMLElement | null,
    rows: Array<{ label: string; value: string; isMultiline?: boolean }>
  ): void {
    if (!tableBody) return;

    tableBody.innerHTML = '';

    rows.forEach(({ label, value, isMultiline }) => {
      const tr = document.createElement('tr');
      const th = document.createElement('th');
      const td = document.createElement('td');

      th.textContent = label;

      if (isMultiline && value && value !== '-') {
        // 줄바꿈을 <br>로 변환 (의뢰물품명 등)
        const div = document.createElement('div');
        div.className = 'request-content';
        String(value)
          .split('\n')
          .forEach((line, idx, arr) => {
            div.appendChild(document.createTextNode(line));
            if (idx < arr.length - 1) {
              div.appendChild(document.createElement('br'));
            }
          });
        td.appendChild(div);
      } else {
        td.textContent = value || '-';
      }

      tr.appendChild(th);
      tr.appendChild(td);
      tableBody.appendChild(tr);
    });
  }

  // ========================================
  // Getter for sampleLogs (read-only access)
  // ========================================

  /**
   * 현재 샘플 로그 데이터 조회 (읽기 전용)
   */
  public getSampleLogs(): readonly T[] {
    return this.sampleLogs;
  }

  /**
   * 선택된 연도 조회
   */
  public getSelectedYear(): string {
    return this.selectedYear;
  }
}

// 전역으로 내보내기 (Vite 번들 환경에서도 window에 노출)
(window as unknown as { BaseSampleManager: typeof BaseSampleManager }).BaseSampleManager = BaseSampleManager;

// Default export
export default BaseSampleManager;
