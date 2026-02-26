/**
 * @fileoverview Electron Preload 스크립트
 * @description 렌더러 프로세스에 안전한 API 노출 (Context Isolation)
 */

const { contextBridge, ipcRenderer } = require('electron');

/**
 * @typedef {Object} SaveDialogOptions
 * @property {string} [title] - 다이얼로그 제목
 * @property {string} [defaultPath] - 기본 경로
 * @property {Array<{name: string, extensions: string[]}>} [filters] - 파일 필터
 */

/**
 * @typedef {Object} OpenDialogOptions
 * @property {string} [title] - 다이얼로그 제목
 * @property {Array<{name: string, extensions: string[]}>} [filters] - 파일 필터
 */

/**
 * @typedef {Object} WriteResult
 * @property {boolean} success - 성공 여부
 * @property {string} [error] - 에러 메시지
 */

/**
 * @typedef {Object} ReadResult
 * @property {boolean} success - 성공 여부
 * @property {string} [content] - 파일 내용
 * @property {string} [error] - 에러 메시지
 */

/**
 * @typedef {Object} SelectFolderResult
 * @property {boolean} success - 성공 여부
 * @property {boolean} [canceled] - 취소 여부
 * @property {string} [folder] - 선택된 폴더 경로
 * @property {string} [path] - 전체 파일 경로
 */

// 렌더러 프로세스에 안전하게 API 노출
contextBridge.exposeInMainWorld('electronAPI', {
    // 파일 저장 다이얼로그
    saveFileDialog: (options) => ipcRenderer.invoke('save-file-dialog', options),

    // 파일 열기 다이얼로그
    openFileDialog: (options) => ipcRenderer.invoke('open-file-dialog', options),

    // 파일 쓰기
    writeFile: (filePath, content) => ipcRenderer.invoke('write-file', filePath, content),

    // 파일 읽기
    readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),

    // 자동 저장 경로 가져오기 (타입별, 연도별로 다른 파일명 사용)
    getAutoSavePath: (type, year) => ipcRenderer.invoke('get-auto-save-path', type, year),

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
    saveAuthFile: (content) => ipcRenderer.invoke('save-auth-file', content),

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
    saveKeyFile: (content) => ipcRenderer.invoke('save-key-file', content),

    // 키 파일 내보내기 (다이얼로그 + 저장)
    exportKeyFile: (content) => ipcRenderer.invoke('export-key-file', content),

    // 키 파일 가져오기 (다이얼로그 + 읽기)
    importKeyFile: () => ipcRenderer.invoke('import-key-file'),

    // Salt 저장
    saveSalt: (saltBase64) => ipcRenderer.invoke('save-salt', saltBase64),

    // Salt 로드
    loadSalt: () => ipcRenderer.invoke('load-salt'),

    // 복구 블롭 저장
    saveRecoveryBlob: (blobJson) => ipcRenderer.invoke('save-recovery-blob', blobJson),

    // 복구 블롭 로드
    loadRecoveryBlob: () => ipcRenderer.invoke('load-recovery-blob'),

    // ========================================
    // 세션 비밀번호 (메인 프로세스 메모리)
    // ========================================

    // 세션 비밀번호 저장
    storeSessionPassword: (password) => ipcRenderer.invoke('store-session-password', password),

    // 세션 비밀번호 조회
    getSessionPassword: () => ipcRenderer.invoke('get-session-password'),

    // 세션 비밀번호 삭제
    clearSessionPassword: () => ipcRenderer.invoke('clear-session-password'),

    // Electron 환경 여부
    isElectron: true
});
