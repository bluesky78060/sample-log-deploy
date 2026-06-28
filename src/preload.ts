/**
 * @fileoverview Electron Preload 스크립트
 * @description 렌더러 프로세스에 안전한 API 노출 (Context Isolation)
 */

import { contextBridge, ipcRenderer } from 'electron';

interface SaveDialogOptions {
    title?: string;
    defaultPath?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}

interface OpenDialogOptions {
    title?: string;
    filters?: Array<{ name: string; extensions: string[] }>;
}

interface WriteResult {
    success: boolean;
    error?: string;
}

interface ReadResult {
    success: boolean;
    content?: string;
    error?: string;
}

interface SelectFolderResult {
    success: boolean;
    canceled?: boolean;
    folder?: string;
    path?: string;
}

interface ElectronAPI {
    saveFileDialog: (options: SaveDialogOptions) => Promise<string | undefined>;
    openFileDialog: (options: OpenDialogOptions) => Promise<string | undefined>;
    writeFile: (filePath: string, content: string) => Promise<WriteResult>;
    readFile: (filePath: string) => Promise<ReadResult>;
    getAutoSavePath: (type: string, year: string) => Promise<string>;
    selectAutoSaveFolder: () => Promise<SelectFolderResult>;
    getAutoSaveFolder: () => Promise<string>;
    getAppPath: () => Promise<string>;
    getVersion: () => Promise<string>;

    // Firebase 인증 파일 관련
    readAuthFile: () => Promise<ReadResult>;
    saveAuthFile: (content: string) => Promise<WriteResult>;
    deleteAuthFile: () => Promise<{ success: boolean; error?: string }>;
    checkAuthFile: () => Promise<boolean>;
    selectAuthFile: () => Promise<ReadResult>;

    // 암호화 키 파일/솔트 관련
    keyFileExists: () => Promise<boolean>;
    readKeyFile: () => Promise<ReadResult>;
    saveKeyFile: (content: string) => Promise<WriteResult>;
    exportKeyFile: (content: string) => Promise<WriteResult>;
    importKeyFile: () => Promise<ReadResult>;
    saveSalt: (saltBase64: string) => Promise<WriteResult>;
    loadSalt: () => Promise<ReadResult>;
    saveRecoveryBlob: (blobJson: string) => Promise<WriteResult>;
    loadRecoveryBlob: () => Promise<ReadResult>;

    // 세션 비밀번호 (메인 프로세스 메모리)
    storeSessionPassword: (password: string) => Promise<void>;
    getSessionPassword: () => Promise<string | null>;
    clearSessionPassword: () => Promise<void>;

    // 흙토람 팝업 창 열기
    openHeuktoram: () => Promise<boolean>;

    // 수질분석 결과 입력 팝업 창 열기
    openWaterAnalysis: () => Promise<boolean>;

    // 잔류농약 분석결과 조회 팝업 창 열기
    openPesticideAnalysis: () => Promise<boolean>;

    // 퇴·액비 분석결과 조회 팝업 창 열기
    openCompostAnalysis: () => Promise<boolean>;

    // 토양 중금속 분석결과 조회 팝업 창 열기
    openHeavyMetalAnalysis: () => Promise<boolean>;

    // VWORLD 지번 지오코딩 (키는 메인 프로세스 보유 — 렌더러는 주소만 전달)
    vworldGeocode: (address: string) => Promise<boolean | null>;

    // JUSO 도로명주소 검색 (키는 메인 프로세스 보유 — 렌더러는 검색어만 전달)
    // 반환 타입은 tsconfig.electron 범위 자체완결을 위해 인라인(globals.d.ts의 JusoSearchResult와 동형)
    jusoSearch: (payload: { keyword: string; page?: number; size?: number }) => Promise<{
      ok: boolean;
      items?: unknown[];
      total?: number;
      page?: number;
      size?: number;
      error?: string;
    }>;

    // MRL(식품안전나라) 내장 API 키 게터 (키는 메인 프로세스 env 보유 — 렌더러가 직접 fetch)
    // 반환 타입은 tsconfig.electron 자체완결을 위해 인라인(globals.d.ts ambient를 못 봄 — JUSO 동일 함정)
    mrlGetApiKey: () => Promise<string>;

    // PSIS(농촌진흥청) 농약 용도 조회 (http 엔드포인트라 메인 경유)
    psisLookupUse: (payload: { korName: string }) => Promise<{ useName: string | null; error?: string }>;

    isElectron: true;
}

// Note: Window.electronAPI is declared in globals.d.ts

// 렌더러 프로세스에 안전하게 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 파일 저장 다이얼로그
    saveFileDialog: (options: SaveDialogOptions) => ipcRenderer.invoke('save-file-dialog', options),

    // 파일 열기 다이얼로그
    openFileDialog: (options: OpenDialogOptions) => ipcRenderer.invoke('open-file-dialog', options),

    // 파일 쓰기
    writeFile: (filePath: string, content: string) => ipcRenderer.invoke('write-file', filePath, content),

    // 파일 읽기
    readFile: (filePath: string) => ipcRenderer.invoke('read-file', filePath),

    // 자동 저장 경로 가져오기 (타입별, 연도별로 다른 파일명 사용)
    getAutoSavePath: (type: string, year: string) => ipcRenderer.invoke('get-auto-save-path', type, year),

    // 자동 저장 폴더 선택
    selectAutoSaveFolder: () => ipcRenderer.invoke('select-auto-save-folder'),

    // 현재 자동 저장 폴더 가져오기
    getAutoSaveFolder: () => ipcRenderer.invoke('get-auto-save-folder'),

    // 앱 데이터 경로 가져오기
    getAppPath: () => ipcRenderer.invoke('get-app-path'),

    // 앱 버전 가져오기
    getVersion: () => ipcRenderer.invoke('get-app-version'),

    // ========================================
    // Firebase 인증 파일 관련
    // ========================================

    // 인증 파일 읽기
    readAuthFile: () => ipcRenderer.invoke('read-auth-file'),

    // 인증 파일 저장
    saveAuthFile: (content: string) => ipcRenderer.invoke('save-auth-file', content),

    // 인증 파일 삭제
    deleteAuthFile: () => ipcRenderer.invoke('delete-auth-file'),

    // 인증 파일 존재 여부 확인
    checkAuthFile: () => ipcRenderer.invoke('check-auth-file'),

    // 인증 파일 선택 다이얼로그 (Electron 네이티브)
    selectAuthFile: () => ipcRenderer.invoke('select-auth-file'),

    // ========================================
    // 암호화 키 파일/솔트 관련
    // ========================================

    // 키 파일 존재 여부 확인
    keyFileExists: () => ipcRenderer.invoke('key-file-exists'),

    // 키 파일 읽기
    readKeyFile: () => ipcRenderer.invoke('read-key-file'),

    // 키 파일 저장
    saveKeyFile: (content: string) => ipcRenderer.invoke('save-key-file', content),

    // 키 파일 내보내기 (다이얼로그 + 저장)
    exportKeyFile: (content: string) => ipcRenderer.invoke('export-key-file', content),

    // 키 파일 가져오기 (다이얼로그 + 읽기)
    importKeyFile: () => ipcRenderer.invoke('import-key-file'),

    // Salt 저장
    saveSalt: (saltBase64: string) => ipcRenderer.invoke('save-salt', saltBase64),

    // Salt 로드
    loadSalt: () => ipcRenderer.invoke('load-salt'),

    // 복구 블롭 저장
    saveRecoveryBlob: (blobJson: string) => ipcRenderer.invoke('save-recovery-blob', blobJson),

    // 복구 블롭 로드
    loadRecoveryBlob: () => ipcRenderer.invoke('load-recovery-blob'),

    // ========================================
    // 세션 비밀번호 (메인 프로세스 메모리)
    // ========================================

    // 세션 비밀번호 저장
    storeSessionPassword: (password: string) => ipcRenderer.invoke('store-session-password', password),

    // 세션 비밀번호 조회
    getSessionPassword: () => ipcRenderer.invoke('get-session-password'),

    // 세션 비밀번호 삭제
    clearSessionPassword: () => ipcRenderer.invoke('clear-session-password'),

    // 흙토람 팝업 창 열기
    openHeuktoram: () => ipcRenderer.invoke('open-heuktoram'),

    // 수질분석 결과 입력 팝업 창 열기
    openWaterAnalysis: () => ipcRenderer.invoke('open-water-analysis'),

    // 잔류농약 분석결과 조회 팝업 창 열기
    openPesticideAnalysis: () => ipcRenderer.invoke('open-pesticide-analysis'),

    // 퇴·액비 분석결과 조회 팝업 창 열기
    openCompostAnalysis: () => ipcRenderer.invoke('open-compost-analysis'),

    // 토양 중금속 분석결과 조회 팝업 창 열기
    openHeavyMetalAnalysis: () => ipcRenderer.invoke('open-heavy-metal-analysis'),

    // VWORLD 지번 지오코딩 (main process 경유, Origin 제한 없음)
    // 키는 메인 프로세스에서만 보유한다(SAMPL-2-19) — 렌더러는 주소만 전달.
    vworldGeocode: (address: string) => ipcRenderer.invoke('vworld-geocode', { address }),

    // JUSO 도로명주소 검색 (main process 경유, 키 노출 없음)
    // payload: { keyword, page?, size? } → { ok, items?, total?, page?, size?, error? }
    jusoSearch: (payload: { keyword: string; page?: number; size?: number }) =>
      ipcRenderer.invoke('juso:search', payload),

    // MRL(식품안전나라) 내장 API 키 게터 — 키는 메인 process env 보유 (렌더러가 직접 fetch)
    mrlGetApiKey: () => ipcRenderer.invoke('mrl:get-api-key'),

    // PSIS(농촌진흥청) 농약 용도 조회 — main process 경유(http 엔드포인트)
    psisLookupUse: (payload: { korName: string }) => ipcRenderer.invoke('psis:lookup-use', payload),

    // Electron 환경 여부
    isElectron: true as const
} as ElectronAPI);
