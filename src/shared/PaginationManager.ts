// ========================================
// Pagination Manager 모듈
// 모든 시료 타입에서 공통으로 사용하는 페이지네이션 기능
// ========================================

/**
 * 페이지 범위 인터페이스
 */
interface PageRange {
    start: number;
    end: number;
}

/**
 * 페이지네이션 옵션 인터페이스
 */
interface PaginationManagerOptions {
    /** 페이지 변경 시 콜백 */
    onPageChange: () => void;
    /** 필터링된 데이터를 반환하는 함수 */
    getFilteredData: () => unknown[];
}

/**
 * 페이지네이션 관리 클래스
 */
class PaginationManager {
    private onPageChange: () => void;
    private getFilteredData: () => unknown[];

    // 상태
    public currentPage: number;
    public itemsPerPage: number;
    public totalPages: number;

    // DOM 요소
    private firstPageBtn: HTMLButtonElement | null;
    private prevPageBtn: HTMLButtonElement | null;
    private nextPageBtn: HTMLButtonElement | null;
    private lastPageBtn: HTMLButtonElement | null;
    private pageInfo: HTMLElement | null;
    private itemsPerPageSelect: HTMLSelectElement | null;
    private pageButtons: HTMLElement | null;

    /**
     * @param options - 페이지네이션 옵션
     */
    constructor(options: PaginationManagerOptions) {
        this.onPageChange = options.onPageChange;
        this.getFilteredData = options.getFilteredData;

        // 상태
        this.currentPage = 1;
        this.itemsPerPage = 100;
        this.totalPages = 1;

        // DOM 요소
        this.firstPageBtn = document.getElementById('firstPage') as HTMLButtonElement | null;
        this.prevPageBtn = document.getElementById('prevPage') as HTMLButtonElement | null;
        this.nextPageBtn = document.getElementById('nextPage') as HTMLButtonElement | null;
        this.lastPageBtn = document.getElementById('lastPage') as HTMLButtonElement | null;
        this.pageInfo = document.getElementById('pageInfo');
        this.itemsPerPageSelect = document.getElementById('itemsPerPage') as HTMLSelectElement | null;
        this.pageButtons = document.getElementById('pageButtons');

        this.init();
    }

    /**
     * 초기화
     */
    private init(): void {
        this.setupEventListeners();

        // 페이지당 항목 수 초기화
        if (this.itemsPerPageSelect) {
            this.itemsPerPageSelect.value = String(this.itemsPerPage);
        }
    }

    /**
     * 이벤트 리스너 설정
     */
    private setupEventListeners(): void {
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
            this.itemsPerPageSelect.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                this.itemsPerPage = parseInt(target.value);
                this.currentPage = 1; // 첫 페이지로 리셋
                this.updatePagination();
                this.onPageChange();
            });
        }
    }

    /**
     * 페이지 이동
     * @param page - 이동할 페이지 번호
     */
    goToPage(page: number): void {
        if (page >= 1 && page <= this.totalPages) {
            this.currentPage = page;
            this.updateUI();
            this.onPageChange();
        }
    }

    /**
     * 페이지네이션 업데이트
     */
    updatePagination(): void {
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
    private updateUI(): void {
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
    private renderPageNumbers(): void {
        if (!this.pageButtons) return;

        this.pageButtons.innerHTML = '';

        // 표시할 페이지 번호 계산
        const maxButtons = 5; // 최대 표시할 버튼 수
        let startPage = Math.max(1, this.currentPage - Math.floor(maxButtons / 2));
        const endPage = Math.min(this.totalPages, startPage + maxButtons - 1);

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
     * @param pageNum - 페이지 번호
     */
    private addPageButton(pageNum: number): void {
        const button = document.createElement('button');
        button.className = 'page-btn';
        button.textContent = String(pageNum);

        if (pageNum === this.currentPage) {
            button.classList.add('active');
        }

        button.addEventListener('click', () => this.goToPage(pageNum));
        this.pageButtons!.appendChild(button);
    }

    /**
     * 생략 부호 추가
     */
    private addEllipsis(): void {
        const span = document.createElement('span');
        span.className = 'page-ellipsis';
        span.textContent = '...';
        this.pageButtons!.appendChild(span);
    }

    /**
     * 현재 페이지의 데이터 범위 가져오기
     * @returns 시작과 끝 인덱스
     */
    getPageRange(): PageRange {
        const start = (this.currentPage - 1) * this.itemsPerPage;
        const end = start + this.itemsPerPage;
        return { start, end };
    }

    /**
     * 페이지네이션 리셋
     */
    reset(): void {
        this.currentPage = 1;
        this.updatePagination();
    }
}

// 전역으로 내보내기
if (typeof module !== 'undefined' && module.exports) {
    module.exports = PaginationManager;
} else {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).PaginationManager = PaginationManager;
}

export { PaginationManager, PaginationManagerOptions, PageRange };
