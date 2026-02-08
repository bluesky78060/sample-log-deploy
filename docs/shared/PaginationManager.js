// ========================================
// Pagination Manager 모듈
// 모든 시료 타입에서 공통으로 사용하는 페이지네이션 기능
// ========================================

/**
 * 페이지네이션 관리 클래스
 */
class PaginationManager {
    /**
     * @param {Object} options - 페이지네이션 옵션
     * @param {Function} options.onPageChange - 페이지 변경 시 콜백
     * @param {Function} options.getFilteredData - 필터링된 데이터를 반환하는 함수
     */
    constructor(options) {
        this.onPageChange = options.onPageChange;
        this.getFilteredData = options.getFilteredData;

        // 상태
        this.currentPage = 1;
        this.itemsPerPage = 100;
        this.totalPages = 1;

        // DOM 요소
        this.firstPageBtn = document.getElementById('firstPage');
        this.prevPageBtn = document.getElementById('prevPage');
        this.nextPageBtn = document.getElementById('nextPage');
        this.lastPageBtn = document.getElementById('lastPage');
        this.pageInfo = document.getElementById('pageInfo');
        this.itemsPerPageSelect = document.getElementById('itemsPerPage');
        this.pageButtons = document.getElementById('pageButtons');

        this.init();
    }

    /**
     * 초기화
     */
    init() {
        this.setupEventListeners();

        // 페이지당 항목 수 초기화
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.value = this.itemsPerPage;
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    setupEventListeners() {
        // 첫 페이지
        if (this.firstPageBtn) {
            this.firstPageBtn.addEventListener('click', () => this.goToPage(1));
        }

        // 이전 페이지
        if (this.prevPageBtn) {
            this.prevPageBtn.addEventListener('click', () => {
                if (this.currentPage > 1) {
                    this.goToPage(this.currentPage - 1);
                }
            });
        }

        // 다음 페이지
        if (this.nextPageBtn) {
            this.nextPageBtn.addEventListener('click', () => {
                if (this.currentPage < this.totalPages) {
                    this.goToPage(this.currentPage + 1);
                }
            });
        }

        // 마지막 페이지
        if (this.lastPageBtn) {
            this.lastPageBtn.addEventListener('click', () => this.goToPage(this.totalPages));
        }

        // 페이지당 항목 수 변경
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.addEventListener('change', (e) => {
                this.itemsPerPage = parseInt(e.target.value);
                this.currentPage = 1; // 첫 페이지로 리셋
                this.updatePagination();
                this.onPageChange();
            });
        }
    }

    /**
     * 페이지 이동
     * @param {number} page - 이동할 페이지 번호
     */
    goToPage(page) {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updateUI();
            this.onPageChange();
        }
    }

    /**
     * 페이지네이션 업데이트
     */
    updatePagination() {
        const filteredData = this.getFilteredData();
        this.totalPages = Math.ceil(filteredData.length / this.itemsPerPage) || 1;

        // 현재 페이지가 총 페이지수를 초과하면 마지막 페이지로
        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }

        this.updateUI();
    }

    /**
     * UI 업데이트
     */
    updateUI() {
        // 페이지 정보 업데이트
        if (this.pageInfo) {
            this.pageInfo.textContent = `${this.currentPage} / ${this.totalPages} 페이지`;
        }

        // 버튼 상태 업데이트
        if (this.firstPageBtn) {
            this.firstPageBtn.disabled = this.currentPage === 1;
        }
        if (this.prevPageBtn) {
            this.prevPageBtn.disabled = this.currentPage === 1;
        }
        if (this.nextPageBtn) {
            this.nextPageBtn.disabled = this.currentPage === this.totalPages;
        }
        if (this.lastPageBtn) {
            this.lastPageBtn.disabled = this.currentPage === this.totalPages;
        }

        // 페이지 번호 버튼 렌더링
        this.renderPageNumbers();
    }

    /**
     * 페이지 번호 버튼 렌더링
     */
    renderPageNumbers() {
        if (!this.pageButtons) return;

        this.pageButtons.innerHTML = '';

        // 표시할 페이지 번호 계산
        const maxButtons = 5; // 최대 표시할 버튼 수
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        let endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

        // startPage 조정 (endPage에서 역산)
        if (endPage - startPage + 1 < maxButtons) {
            startPage = Math.max(1, endPage - maxButtons + 1);
        }

        // 첫 페이지와 생략 부호
        if (startPage > 1) {
            this.addPageButton(1);
            if (startPage > 2) {
                this.addEllipsis();
            }
        }

        // 페이지 번호 버튼들
        for (let i = startPage; i <= endPage; i++) {
            this.addPageButton(i);
        }

        // 마지막 페이지와 생략 부호
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                this.addEllipsis();
            }
            this.addPageButton(this.totalPages);
        }
    }

    /**
     * 페이지 버튼 추가
     * @param {number} pageNum - 페이지 번호
     */
    addPageButton(pageNum) {
        const button = document.createElement('button');
        button.className = 'page-btn';
        button.textContent = pageNum;

        if (pageNum === this.currentPage) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => this.goToPage(pageNum));
        this.pageButtons.appendChild(button);
    }

    /**
     * 생략 부호 추가
     */
    addEllipsis() {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '...';
        this.pageButtons.appendChild(span);
    }

    /**
     * 현재 페이지의 데이터 범위 가져오기
     * @returns {{start: number, end: number}}
     */
    getPageRange() {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return { start, end };
    }

    /**
     * 페이지네이션 리셋
     */
    reset() {
        this.currentPage = 1;
        this.updatePagination();
    }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaginationManager;
} else {
    window.PaginationManager = PaginationManager;
}