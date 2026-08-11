// ========================================
// 공통 파일 API 모듈
// Electron과 Web 환경 모두 지원
// ========================================

// PathSecurity 로드 (있으면 사용)
const pathSecurity = (window as any).PathSecurity || null;

// Electron 환경 여부 감지 (파일 스코프 변수)
const _isElectron = window.electronAPI?.isElectron === true;

// ========================================
// 파일 I/O 재시도 로직
// ========================================

/** 파일 I/O 재시도 설정 */
const RETRY_CONFIG = {
    maxAttempts: 3,       // 최대 재시도 횟수
    baseDelay: 1000,      // 기본 지연 시간 (1초)
    maxDelay: 5000        // 최대 지연 시간 (5초)
};

/**
 * 재시도 로직을 가진 래퍼 함수
 */
async function withRetry<T>(
    operation: () => Promise<T>,
    context: string
): Promise<T> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= RETRY_CONFIG.maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            lastError = error;

            // 마지막 시도가 아니면 재시도
            if (attempt < RETRY_CONFIG.maxAttempts) {
                const delay = Math.min(
                    RETRY_CONFIG.baseDelay * Math.pow(2, attempt - 1),
                    RETRY_CONFIG.maxDelay
                );

                if (window.logger) {
                    window.logger.warn(`[FileAPI] ${context} 실패 (${attempt}/${RETRY_CONFIG.maxAttempts}), ${delay}ms 후 재시도`);
                }

                // 지연 후 재시도
                await new Promise(resolve => setTimeout(resolve, delay));
            }
        }
    }

    // 모든 재시도 실패
    if (window.logger) {
        window.logger.error(`[FileAPI] ${context} 최종 실패:`, lastError);
    }
    throw lastError;
}

// ========================================
// 웹 환경 폴더 핸들 관리 (File System Access API)
// ========================================

/** 선택된 폴더 핸들 */
let _webDirHandle: FileSystemDirectoryHandle | null = null;

/**
 * 웹 환경에서 자동 저장 폴더 선택 (showDirectoryPicker)
 */
async function selectWebAutoSaveFolder(): Promise<{
    success: boolean;
    folderName?: string;
    error?: string;
}> {
    if (!window.showDirectoryPicker) {
        return { success: false, error: 'File System Access API not supported' };
    }
    try {
        _webDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        return { success: true, folderName: _webDirHandle.name };
    } catch (e: any) {
        if (e.name === 'AbortError') return { success: false, error: 'cancelled' };
        (window.logger?.error || console.error)('[FileAPI] Folder select error:', e);
        return { success: false, error: e.message };
    }
}

/**
 * 웹 폴더 핸들이 설정되어 있는지 확인
 */
function hasWebAutoSaveFolder(): boolean {
    return !!_webDirHandle;
}

/**
 * 웹 폴더 핸들 가져오기
 */
function getWebDirHandle(): FileSystemDirectoryHandle | null {
    return _webDirHandle;
}

/**
 * 웹 환경에서 폴더에 파일 쓰기
 */
async function webWriteFile(fileName: string, content: string): Promise<boolean> {
    if (!_webDirHandle) return false;
    try {
        // 권한 재확인 (탭 전환 후 권한 만료 대비)
        const perm = await _webDirHandle.queryPermission({ mode: 'readwrite' });
        if (perm !== 'granted') {
            const requested = await _webDirHandle.requestPermission({ mode: 'readwrite' });
            if (requested !== 'granted') return false;
        }
        const fileHandle = await _webDirHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        return true;
    } catch (e: any) {
        (window.logger?.warn || console.warn)('[FileAPI] Web write failed:', e.message);
        return false;
    }
}

/**
 * 웹 환경에서 폴더에서 파일 읽기
 */
async function webReadFile(fileName: string): Promise<string | null> {
    if (!_webDirHandle) return null;
    try {
        const fileHandle = await _webDirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (e: any) {
        // NotFoundError는 정상 (파일이 아직 없는 경우)
        if (e.name !== 'NotFoundError') {
            (window.logger?.warn || console.warn)('[FileAPI] Web read failed:', e.message);
        }
        return null;
    }
}

/**
 * 파일 API 팩토리 함수
 */
function createFileAPI(sampleType: string): FileAPIInstance {
    return {
        autoSavePath: null,
        autoSaveFileName: null,
        sampleType: sampleType,

        /**
         * 초기화
         * @param {number|string} year - 연도
         */
        async init(year) {
            if (_isElectron && window.electronAPI) {
                this.autoSavePath = await window.electronAPI.getAutoSavePath(this.sampleType, year);
            }
            // 웹 환경용 파일명 설정
            this.autoSaveFileName = `auto-save-${sampleType}-${year}.json`;
        },

        /**
         * 연도 변경 시 경로 업데이트
         * @param {number|string} year - 연도
         */
        async updateAutoSavePath(year) {
            if (_isElectron && window.electronAPI) {
                this.autoSavePath = await window.electronAPI.getAutoSavePath(this.sampleType, year);
            }
            this.autoSaveFileName = `auto-save-${sampleType}-${year}.json`;
        },

        /**
         * 파일 저장 (재시도 지원)
         * @param {string} content - 저장할 내용
         * @param {string} suggestedName - 제안 파일명
         * @returns {Promise<boolean>} 성공 여부
         */
        async saveFile(content, suggestedName = 'data.json') {
            return withRetry(async () => {
                if (_isElectron && window.electronAPI) {
                    const filePath = await window.electronAPI.saveFileDialog({
                        title: '파일 저장',
                        defaultPath: suggestedName,
                        filters: [
                            { name: 'JSON Files', extensions: ['json'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });

                    if (!filePath) return false;

                    const result = await window.electronAPI.writeFile(filePath, content);
                    if (!result.success) {
                        throw new Error(result.error || 'Write failed');
                    }
                    return true;
                } else {
                    // Web 환경: File System Access API 사용
                    if ('showSaveFilePicker' in window && window.showSaveFilePicker) {
                        try {
                            const handle = await window.showSaveFilePicker({
                                suggestedName,
                                types: [{
                                    description: 'JSON Files',
                                    accept: { 'application/json': ['.json'] }
                                }]
                            });
                            const writable = await handle.createWritable();
                            await writable.write(content);
                            await writable.close();
                            return true;
                        } catch (e: any) {
                            if (e.name === 'AbortError') return false;
                            throw e;
                        }
                    } else {
                        // 폴백: Blob 다운로드
                        const blob = new Blob([content], { type: 'application/json' });
                        const url = URL.createObjectURL(blob);
                        const a = document.createElement('a');
                        a.href = url;
                        // 파일명 보안 검증
                        const safeName = suggestedName.replace(/[<>:"|?*\x00-\x1f]/g, '_');
                        a.download = safeName;
                        a.click();
                        URL.revokeObjectURL(url);
                        return true;
                    }
                }
            }, 'saveFile');
        },

        /**
         * 파일 열기 (재시도 지원)
         * @returns {Promise<string|null>} 파일 내용 또는 null
         */
        async openFile() {
            return withRetry(async () => {
                if (_isElectron && window.electronAPI) {
                    const filePath = await window.electronAPI.openFileDialog({
                        title: '파일 열기',
                        filters: [
                            { name: 'JSON Files', extensions: ['json'] },
                            { name: 'All Files', extensions: ['*'] }
                        ]
                    });

                    if (!filePath) return null;

                    const result = await window.electronAPI.readFile(filePath);
                    if (!result.success) {
                        throw new Error(result.error || 'Read failed');
                    }
                    return result.content || null;
                } else {
                    // Web 환경: File System Access API 사용
                    if (window.showOpenFilePicker) {
                        try {
                            const [fileHandle] = await window.showOpenFilePicker({
                                types: [{
                                    description: 'JSON Files',
                                    accept: { 'application/json': ['.json'] }
                                }],
                                multiple: false
                            });
                            const file = await fileHandle.getFile();
                            return await file.text();
                        } catch (e: any) {
                            if (e.name === 'AbortError') return null;
                            throw e;
                        }
                    }
                    return null;
                }
            }, 'openFile');
        },

        /**
         * 자동 저장 (재시도 지원)
         * @param {string} content - 저장할 내용
         * @returns {Promise<boolean>} 성공 여부
         */
        async autoSave(content) {
            return withRetry(async () => {
                if (_isElectron && this.autoSavePath && window.electronAPI) {
                    const result = await window.electronAPI.writeFile(this.autoSavePath, content);
                    if (!result.success) {
                        throw new Error(result.error || 'Auto-save write failed');
                    }
                    return true;
                } else {
                    // 웹 환경: 폴더 핸들이 있으면 파일로 저장
                    const success = await webWriteFile(this.autoSaveFileName!, content);
                    if (!success) {
                        // FSA 실패 → localStorage 폴백
                        try {
                            const storageKey = `autoSave_${this.sampleType}_${this.autoSaveFileName}`;
                            localStorage.setItem(storageKey, content);
                            return true;
                        } catch (e: any) {
                            throw new Error('localStorage fallback failed: ' + e.message);
                        }
                    }
                    return success;
                }
            }, 'autoSave');
        },

        /**
         * 자동 저장 파일 로드 (재시도 지원)
         */
        async loadAutoSave(): Promise<string | null> {
            return withRetry(async () => {
                if (_isElectron && this.autoSavePath && window.electronAPI) {
                    const result = await window.electronAPI.readFile(this.autoSavePath);
                    if (!result.success) {
                        // 파일이 없는 경우는 에러가 아님
                        if (result.error?.includes('ENOENT') || result.error?.includes('no such file')) {
                            return null;
                        }
                        throw new Error(result.error || 'Auto-save read failed');
                    }
                    return result.content || null;
                } else {
                    // 웹 환경: 폴더 핸들에서 파일 읽기
                    const content = await webReadFile(this.autoSaveFileName!);
                    if (!content) {
                        // FSA 실패 → localStorage 폴백
                        try {
                            const storageKey = `autoSave_${this.sampleType}_${this.autoSaveFileName}`;
                            return localStorage.getItem(storageKey);
                        } catch (e) {
                            return null;
                        }
                    }
                    return content;
                }
            }, 'loadAutoSave');
        }
    };
}

/**
 * 대용량 파일 저장 (청크 단위, 취소 가능)
 */
async function saveLargeFile(
    content: string,
    fileName: string,
    options: { signal?: AbortSignal } = {}
): Promise<boolean> {
    const { signal } = options;
    const CHUNK_SIZE = 1024 * 1024; // 1MB 청크
    const totalSize = content.length;
    const chunks = Math.ceil(totalSize / CHUNK_SIZE);

    const operationId = 'saveLargeFile';

    try {
        if (window.loadingManager) {
            window.loadingManager.show(operationId, `파일 저장 중... (0/${chunks})`, {
                showProgress: true,
                cancellable: true,
                onCancel: () => {
                    if (window.logger) {
                        window.logger.info('[FileAPI] 파일 저장 취소');
                    }
                }
            });
        }

        if (_isElectron && window.electronAPI) {
            // Electron 환경: 파일 다이얼로그 사용
            const filePath = await window.electronAPI.saveFileDialog({
                title: '파일 저장',
                defaultPath: fileName,
                filters: [
                    { name: 'JSON Files', extensions: ['json'] },
                    { name: 'All Files', extensions: ['*'] }
                ]
            });

            if (!filePath) return false;

            // 청크로 나누어 저장 (시뮬레이션)
            for (let i = 0; i < chunks; i++) {
                // 취소 확인
                if (signal?.aborted) {
                    throw new DOMException('파일 저장이 취소되었습니다.', 'AbortError');
                }

                const start = i * CHUNK_SIZE;
                const end = Math.min(start + CHUNK_SIZE, totalSize);
                const chunk = content.slice(start, end);

                // 진행률 업데이트
                const progress = ((i + 1) / chunks) * 100;
                if (window.loadingManager) {
                    window.loadingManager.updateProgress(
                        operationId,
                        progress,
                        `파일 저장 중... (${i + 1}/${chunks})`
                    );
                }

                // 시뮬레이션: 실제로는 마지막에 한 번만 쓰기
                if (i === chunks - 1) {
                    const result = await window.electronAPI.writeFile(filePath, content);
                    if (!result.success) {
                        throw new Error(result.error || 'Write failed');
                    }
                }

                // 진행률 시뮬레이션을 위한 짧은 지연
                await new Promise(resolve => setTimeout(resolve, 50));
            }

            return true;
        } else {
            // 웹 환경: File System Access API 사용
            if ('showSaveFilePicker' in window && window.showSaveFilePicker) {
                try {
                    const handle = await window.showSaveFilePicker({
                        suggestedName: fileName,
                        types: [{
                            description: 'JSON Files',
                            accept: { 'application/json': ['.json'] }
                        }]
                    });

                    const writable = await handle.createWritable();

                    // 청크로 나누어 쓰기
                    for (let i = 0; i < chunks; i++) {
                        // 취소 확인
                        if (signal?.aborted) {
                            await writable.abort();
                            throw new DOMException('파일 저장이 취소되었습니다.', 'AbortError');
                        }

                        const start = i * CHUNK_SIZE;
                        const end = Math.min(start + CHUNK_SIZE, totalSize);
                        const chunk = content.slice(start, end);

                        await writable.write(chunk);

                        // 진행률 업데이트
                        const progress = ((i + 1) / chunks) * 100;
                        if (window.loadingManager) {
                            window.loadingManager.updateProgress(
                                operationId,
                                progress,
                                `파일 저장 중... (${i + 1}/${chunks})`
                            );
                        }
                    }

                    await writable.close();
                    return true;
                } catch (e: any) {
                    if (e.name === 'AbortError') throw e;
                    throw e;
                }
            } else {
                // 폴백: Blob 다운로드 (청크 없이)
                const blob = new Blob([content], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                const safeName = fileName.replace(/[<>:"|?*\x00-\x1f]/g, '_');
                a.download = safeName;
                a.click();
                URL.revokeObjectURL(url);
                return true;
            }
        }
    } catch (error: any) {
        if (error.name === 'AbortError') {
            if (window.showToast) {
                window.showToast('파일 저장이 취소되었습니다.', 'info');
            }
            return false;
        }
        throw error;
    } finally {
        if (window.loadingManager) {
            window.loadingManager.hide(operationId);
        }
    }
}

// 전역으로 내보내기
window.createFileAPI = createFileAPI;
window.isElectron = _isElectron;
window.selectWebAutoSaveFolder = selectWebAutoSaveFolder;
window.hasWebAutoSaveFolder = hasWebAutoSaveFolder;
window.getWebDirHandle = getWebDirHandle;
window.saveLargeFile = saveLargeFile;

// Export for module usage
export { createFileAPI, _isElectron as isElectron, selectWebAutoSaveFolder, hasWebAutoSaveFolder, getWebDirHandle, saveLargeFile };
