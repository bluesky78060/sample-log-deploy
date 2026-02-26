// ========================================
// 공통 파일 API 모듈
// Electron과 Web 환경 모두 지원
// ========================================

// PathSecurity 로드 (있으면 사용)
const pathSecurity = window.PathSecurity || null;

// Electron 환경 여부 감지
const isElectron = window.electronAPI?.isElectron === true;

// ========================================
// 웹 환경 폴더 핸들 관리 (File System Access API)
// ========================================

/** @type {FileSystemDirectoryHandle|null} 선택된 폴더 핸들 */
let _webDirHandle = null;

/**
 * 웹 환경에서 자동 저장 폴더 선택 (showDirectoryPicker)
 * @returns {Promise<{success: boolean, folderName?: string}>}
 */
async function selectWebAutoSaveFolder() {
    if (!('showDirectoryPicker' in window)) {
        return { success: false, error: 'File System Access API not supported' };
    }
    try {
        _webDirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
        return { success: true, folderName: _webDirHandle.name };
    } catch (e) {
        if (e.name === 'AbortError') return { success: false, error: 'cancelled' };
        console.error('[FileAPI] Folder select error:', e);
        return { success: false, error: e.message };
    }
}

/**
 * 웹 폴더 핸들이 설정되어 있는지 확인
 * @returns {boolean}
 */
function hasWebAutoSaveFolder() {
    return !!_webDirHandle;
}

/**
 * 웹 폴더 핸들 가져오기
 * @returns {FileSystemDirectoryHandle|null}
 */
function getWebDirHandle() {
    return _webDirHandle;
}

/**
 * 웹 환경에서 폴더에 파일 쓰기
 * @param {string} fileName - 파일명
 * @param {string} content - 저장할 내용
 * @returns {Promise<boolean>}
 */
async function webWriteFile(fileName, content) {
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
    } catch (e) {
        console.warn('[FileAPI] Web write failed:', e.message);
        return false;
    }
}

/**
 * 웹 환경에서 폴더에서 파일 읽기
 * @param {string} fileName - 파일명
 * @returns {Promise<string|null>}
 */
async function webReadFile(fileName) {
    if (!_webDirHandle) return null;
    try {
        const fileHandle = await _webDirHandle.getFileHandle(fileName);
        const file = await fileHandle.getFile();
        return await file.text();
    } catch (e) {
        // NotFoundError는 정상 (파일이 아직 없는 경우)
        if (e.name !== 'NotFoundError') {
            console.warn('[FileAPI] Web read failed:', e.message);
        }
        return null;
    }
}

/**
 * 파일 API 팩토리 함수
 * @param {string} sampleType - 시료 타입 (soil, water, pesticide, compost, heavy-metal)
 * @returns {Object} FileAPI 인스턴스
 */
function createFileAPI(sampleType) {
    return {
        autoSavePath: null,
        autoSaveFileName: null,
        sampleType: sampleType,

        /**
         * 초기화
         * @param {number|string} year - 연도
         */
        async init(year) {
            if (isElectron && window.electronAPI) {
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
            if (isElectron && window.electronAPI) {
                this.autoSavePath = await window.electronAPI.getAutoSavePath(this.sampleType, year);
            }
            this.autoSaveFileName = `auto-save-${sampleType}-${year}.json`;
        },

        /**
         * 파일 저장
         * @param {string} content - 저장할 내용
         * @param {string} suggestedName - 제안 파일명
         * @returns {Promise<boolean>} 성공 여부
         */
        async saveFile(content, suggestedName = 'data.json') {
            if (isElectron && window.electronAPI) {
                const filePath = await window.electronAPI.saveFileDialog({
                    title: '파일 저장',
                    defaultPath: suggestedName,
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                if (filePath) {
                    const result = await window.electronAPI.writeFile(filePath, content);
                    return result.success;
                }
                return false;
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
                    } catch (e) {
                        if (e.name !== 'AbortError') console.error(e);
                        return false;
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
        },

        /**
         * 파일 열기
         * @returns {Promise<string|null>} 파일 내용 또는 null
         */
        async openFile() {
            if (isElectron && window.electronAPI) {
                const filePath = await window.electronAPI.openFileDialog({
                    title: '파일 열기',
                    filters: [
                        { name: 'JSON Files', extensions: ['json'] },
                        { name: 'All Files', extensions: ['*'] }
                    ]
                });
                if (filePath) {
                    const result = await window.electronAPI.readFile(filePath);
                    if (result.success) {
                        return result.content || null;
                    }
                }
                return null;
            } else {
                // Web 환경: File System Access API 사용
                if ('showOpenFilePicker' in window && window.showOpenFilePicker) {
                    try {
                        const [handle] = await window.showOpenFilePicker({
                            types: [{
                                description: 'JSON Files',
                                accept: { 'application/json': ['.json'] }
                            }]
                        });
                        const file = await handle.getFile();
                        return await file.text();
                    } catch (e) {
                        if (e.name !== 'AbortError') console.error(e);
                        return null;
                    }
                } else {
                    return null;
                }
            }
        },

        /**
         * 자동 저장
         * @param {string} content - 저장할 내용
         * @returns {Promise<boolean>} 성공 여부
         */
        async autoSave(content) {
            // Electron 환경
            if (isElectron && this.autoSavePath && window.electronAPI) {
                const result = await window.electronAPI.writeFile(this.autoSavePath, content);
                return result.success;
            }
            // 웹 환경: 폴더 핸들이 있으면 파일로 저장
            if (!isElectron && _webDirHandle && this.autoSaveFileName) {
                return await webWriteFile(this.autoSaveFileName, content);
            }
            return false;
        },

        /**
         * 자동 저장 데이터 로드
         * @returns {Promise<string|null>} 파일 내용 또는 null
         */
        async loadAutoSave() {
            // Electron 환경
            if (isElectron && this.autoSavePath && window.electronAPI) {
                const result = await window.electronAPI.readFile(this.autoSavePath);
                if (result.success) {
                    return result.content || null;
                }
            }
            // 웹 환경: 폴더 핸들에서 파일 읽기
            if (!isElectron && _webDirHandle && this.autoSaveFileName) {
                return await webReadFile(this.autoSaveFileName);
            }
            return null;
        }
    };
}

// 전역으로 내보내기
window.createFileAPI = createFileAPI;
window.isElectron = isElectron;
window.selectWebAutoSaveFolder = selectWebAutoSaveFolder;
window.hasWebAutoSaveFolder = hasWebAutoSaveFolder;
window.getWebDirHandle = getWebDirHandle;
