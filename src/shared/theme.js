/**
 * 다크 모드 테마 관리 모듈
 * 시스템 설정 연동 + 수동 토글 지원
 */

const ThemeManager = {
    STORAGE_KEY: 'theme-preference',

    /**
     * 테마 초기화
     * - localStorage에 저장된 설정 확인
     * - 없으면 시스템 설정 따름
     */
    init() {
        const savedTheme = localStorage.getItem(this.STORAGE_KEY);

        if (savedTheme) {
            this.setTheme(savedTheme);
        } else {
            // 시스템 다크 모드 설정 확인
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            this.setTheme(prefersDark ? 'dark' : 'light');
        }

        // 시스템 테마 변경 감지
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // 수동 설정이 없을 때만 시스템 설정 따름
            if (!localStorage.getItem(this.STORAGE_KEY)) {
                this.setTheme(e.matches ? 'dark' : 'light');
                this.updateToggleButton();
            }
        });
    },

    /**
     * 테마 설정
     * @param {string} theme - 'light' 또는 'dark'
     */
    setTheme(theme) {
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem(this.STORAGE_KEY, theme);
        // select 요소에 다크모드 스타일 강제 적용
        this.applySelectStyles(theme);
    },

    /**
     * select 요소에 다크모드 스타일 강제 적용
     * @param {string} theme - 'light' 또는 'dark'
     */
    applySelectStyles(theme) {
        const selects = document.querySelectorAll('select#subCategory, select#purpose, select#sampleName, .form-card .card-body select');

        if (theme === 'dark') {
            // 페이지별 테마 색상 결정
            const pageColors = this.getPageColors();

            selects.forEach(select => {
                select.style.setProperty('-webkit-appearance', 'none', 'important');
                select.style.setProperty('-moz-appearance', 'none', 'important');
                select.style.setProperty('appearance', 'none', 'important');
                select.style.setProperty('background-color', pageColors.bg, 'important');
                select.style.setProperty('color', pageColors.text, 'important');
                select.style.setProperty('border-color', pageColors.border, 'important');
                select.style.setProperty('background-image', pageColors.arrow, 'important');
                select.style.setProperty('background-repeat', 'no-repeat', 'important');
                select.style.setProperty('background-position', 'right 12px center', 'important');
                select.style.setProperty('background-size', '16px', 'important');
                select.style.setProperty('padding-right', '40px', 'important');
            });
        } else {
            // 라이트 모드: 인라인 스타일 제거
            selects.forEach(select => {
                select.style.removeProperty('-webkit-appearance');
                select.style.removeProperty('-moz-appearance');
                select.style.removeProperty('appearance');
                select.style.removeProperty('background-color');
                select.style.removeProperty('color');
                select.style.removeProperty('border-color');
                select.style.removeProperty('background-image');
                select.style.removeProperty('background-repeat');
                select.style.removeProperty('background-position');
                select.style.removeProperty('background-size');
                select.style.removeProperty('padding-right');
            });
        }
    },

    /**
     * 현재 페이지에 맞는 테마 색상 반환
     */
    getPageColors() {
        const body = document.body;

        if (body.classList.contains('soil-page')) {
            return {
                bg: 'rgba(20, 83, 45, 0.95)',
                text: '#86efac',
                border: 'rgba(34, 197, 94, 0.4)',
                arrow: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2386efac' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
            };
        } else if (body.classList.contains('compost-page')) {
            return {
                bg: 'rgba(69, 26, 3, 0.95)',
                text: '#fcd34d',
                border: 'rgba(217, 119, 6, 0.4)',
                arrow: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23fcd34d' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
            };
        } else if (body.classList.contains('pesticide-page')) {
            return {
                bg: 'rgba(59, 7, 100, 0.95)',
                text: '#e9d5ff',
                border: 'rgba(168, 85, 247, 0.4)',
                arrow: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23e9d5ff' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
            };
        } else if (body.classList.contains('water-page')) {
            return {
                bg: 'rgba(30, 41, 59, 0.95)',
                text: '#93c5fd',
                border: 'rgba(59, 130, 246, 0.4)',
                arrow: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2393c5fd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
            };
        } else if (body.classList.contains('heavy-metal-page')) {
            return {
                bg: 'rgba(30, 27, 46, 0.95)',
                text: '#c4b5fd',
                border: 'rgba(139, 92, 246, 0.4)',
                arrow: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23c4b5fd' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
            };
        }

        // 기본값 (다크 그레이)
        return {
            bg: '#2a2a2e',
            text: '#e2e8f0',
            border: '#4a4a50',
            arrow: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a1a1aa' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"
        };
    },

    /**
     * 현재 테마 가져오기
     * @returns {string} 'light' 또는 'dark'
     */
    getTheme() {
        return document.documentElement.getAttribute('data-theme') || 'light';
    },

    /**
     * 테마 토글
     */
    toggle() {
        const currentTheme = this.getTheme();
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
        this.updateToggleButton();
    },

    /**
     * 토글 버튼 상태 업데이트
     */
    updateToggleButton() {
        const toggleBtn = document.querySelector('.theme-toggle-btn');
        if (toggleBtn) {
            const isDark = this.getTheme() === 'dark';
            toggleBtn.classList.toggle('dark', isDark);
            toggleBtn.setAttribute('aria-label', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
            toggleBtn.setAttribute('title', isDark ? '라이트 모드로 전환' : '다크 모드로 전환');
        }
    },

    /**
     * 토글 버튼 생성 및 삽입
     * @param {HTMLElement} container - 버튼을 삽입할 컨테이너
     */
    createToggleButton(container) {
        if (!container) return;

        const isDark = this.getTheme() === 'dark';

        const themeToggle = document.createElement('div');
        themeToggle.className = 'theme-toggle';
        themeToggle.innerHTML = sanitizeHTML(`
            <span class="theme-icon sun">☀️</span>
            <button class="theme-toggle-btn ${isDark ? 'dark' : ''}"
                    aria-label="${isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}"
                    title="${isDark ? '라이트 모드로 전환' : '다크 모드로 전환'}">
            </button>
            <span class="theme-icon moon">🌙</span>
        `);

        const toggleBtn = themeToggle.querySelector('.theme-toggle-btn');
        toggleBtn.addEventListener('click', () => this.toggle());

        container.appendChild(themeToggle);
    }
};

// DOM 로드 시 자동 초기화 및 토글 버튼 이벤트 연결
function initThemeWithToggle() {
    ThemeManager.init();
    ThemeManager.updateToggleButton();

    // 토글 버튼 클릭 이벤트 연결
    const toggleBtn = document.getElementById('themeToggleBtn');
    if (toggleBtn && !toggleBtn.dataset.themeListenerAdded) {
        toggleBtn.addEventListener('click', () => {
            ThemeManager.toggle();
        });
        toggleBtn.dataset.themeListenerAdded = 'true';
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initThemeWithToggle);
} else {
    initThemeWithToggle();
}

// 전역 접근 가능하도록 노출
window.ThemeManager = ThemeManager;
