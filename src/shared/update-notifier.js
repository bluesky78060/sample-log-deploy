/**
 * @fileoverview 자동 업데이트 알림 UI
 */

class UpdateNotifier {
    constructor() {
        this.updateAvailable = false;
        this.updateInfo = null;
        this.downloadProgress = 0;
    }

    /**
     * 업데이트 사용 가능 다이얼로그 표시
     * @param {Object} info - 업데이트 정보
     */
    showUpdateDialog(info) {
        this.updateInfo = info;
        this.updateAvailable = true;

        // 기존 모달 제거
        const existingModal = document.getElementById('updateModal');
        if (existingModal) existingModal.remove();

        const modal = document.createElement('div');
        modal.id = 'updateModal';
        modal.className = 'update-modal-overlay';
        modal.innerHTML = `
            <div class="update-modal">
                <h2>🎉 새 버전 사용 가능</h2>
                <p class="update-version">버전 ${info.version || '알 수 없음'}이 준비되었습니다.</p>
                ${info.releaseNotes ? `<div class="release-notes">${this.formatReleaseNotes(info.releaseNotes)}</div>` : ''}
                <div class="update-actions">
                    <button class="btn-later" onclick="window.updateNotifier.dismissUpdate()">나중에</button>
                    <button class="btn-update" onclick="window.updateNotifier.installUpdate()">지금 업데이트</button>
                </div>
                <div class="download-progress hidden">
                    <div class="progress-bar"><div class="progress-fill"></div></div>
                    <span class="progress-text">다운로드 중... 0%</span>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        this.addStyles();
    }

    /**
     * 릴리스 노트 포맷팅
     */
    formatReleaseNotes(notes) {
        if (typeof notes === 'string') {
            return notes.replace(/\n/g, '<br>');
        }
        return '';
    }

    /**
     * 업데이트 설치
     */
    installUpdate() {
        if (window.electronAPI?.quitAndInstall) {
            window.electronAPI.quitAndInstall();
        } else {
            console.log('자동 업데이트 API를 사용할 수 없습니다.');
        }
    }

    /**
     * 업데이트 다이얼로그 닫기
     */
    dismissUpdate() {
        const modal = document.getElementById('updateModal');
        if (modal) modal.remove();
    }

    /**
     * 다운로드 진행률 업데이트
     * @param {number} percent - 진행률 (0-100)
     */
    updateProgress(percent) {
        this.downloadProgress = percent;
        const progressContainer = document.querySelector('.download-progress');
        const progressFill = document.querySelector('.progress-fill');
        const progressText = document.querySelector('.progress-text');
        const buttons = document.querySelector('.update-actions');

        if (progressContainer && progressFill && progressText) {
            progressContainer.classList.remove('hidden');
            buttons?.classList.add('hidden');
            progressFill.style.width = `${percent}%`;
            progressText.textContent = `다운로드 중... ${Math.round(percent)}%`;
        }
    }

    /**
     * 스타일 추가
     */
    addStyles() {
        if (document.getElementById('updateNotifierStyles')) return;

        const style = document.createElement('style');
        style.id = 'updateNotifierStyles';
        style.textContent = `
            .update-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.5);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10001;
            }
            .update-modal {
                background: var(--bg-primary, #fff);
                border-radius: 12px;
                padding: 24px;
                max-width: 400px;
                width: 90%;
                box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
            }
            .update-modal h2 {
                margin: 0 0 12px 0;
                font-size: 1.25rem;
            }
            .update-version {
                color: var(--text-secondary, #666);
                margin-bottom: 16px;
            }
            .release-notes {
                background: var(--bg-secondary, #f5f5f5);
                padding: 12px;
                border-radius: 8px;
                max-height: 150px;
                overflow-y: auto;
                font-size: 0.875rem;
                margin-bottom: 16px;
            }
            .update-actions {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            .btn-later, .btn-update {
                padding: 8px 16px;
                border-radius: 6px;
                border: none;
                cursor: pointer;
                font-size: 0.875rem;
            }
            .btn-later {
                background: var(--bg-secondary, #e0e0e0);
                color: var(--text-primary, #333);
            }
            .btn-update {
                background: var(--primary, #7C9082);
                color: white;
            }
            .download-progress {
                margin-top: 16px;
            }
            .download-progress.hidden {
                display: none;
            }
            .progress-bar {
                height: 8px;
                background: var(--bg-secondary, #e0e0e0);
                border-radius: 4px;
                overflow: hidden;
            }
            .progress-fill {
                height: 100%;
                background: var(--primary, #7C9082);
                width: 0%;
                transition: width 0.3s ease;
            }
            .progress-text {
                display: block;
                text-align: center;
                margin-top: 8px;
                font-size: 0.875rem;
                color: var(--text-secondary, #666);
            }
        `;
        document.head.appendChild(style);
    }
}

// 전역 인스턴스
window.updateNotifier = new UpdateNotifier();
