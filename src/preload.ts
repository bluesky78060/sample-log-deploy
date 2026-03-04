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

    // Electron 환경 여부
    isElectron: true as const
} as ElectronAPI);
