// ========================================
// 공통 페이지네이션 모듈
// ========================================

/**
 * 페이지네이션 DOM 요소 인터페이스
 */
interface TablePaginationElements {
    paginationInfo: HTMLElement | null;
    itemsPerPageSelect: HTMLSelectElement | null;
    pageNumbersContainer: HTMLElement | null;
    firstPageBtn: HTMLButtonElement | null;
    prevPageBtn: HTMLButtonElement | null;
    nextPageBtn: HTMLButtonElement | null;
    lastPageBtn: HTMLButtonElement | null;
    paginationContainer: HTMLElement | null;
    tableBody: HTMLElement | null;
    emptyState: HTMLElement | null;
}

/**
 * 페이지네이션 옵션 인터페이스
 */
interface TablePaginationOptions<T = unknown> {
    /** localStorage 키 (예: 'soilItemsPerPage') */
    storageKey: string;
    /** 기본 페이지당 항목 수 (기본값: 100) */
    defaultItemsPerPage?: number;
    /** 페이지 변경 시 콜백 */
    onPageChange?: (page: number, pageData: T[]) => void;
    /** 행 렌더링 함수 */
    renderRow?: (item: T, index: number) => HTMLElement | null;
}

/**
 * 페이지네이션 관리자 클래스 (테이블용)
 * pagination.js에서 정의된 IIFE 래핑 버전
 */
class TablePaginationManager<T = unknown> {
    private storageKey: string;
    private defaultItemsPerPage: number;
    private onPageChange: (page: number, pageData: T[]) => void;
    private renderRow?: (item: T, index: number) => HTMLElement | null;

    private currentPage: number;
    private itemsPerPage: number;
    private totalPages: number;
    private data: T[];

    private elements: TablePaginationElements;

    /**
     * @param options - 설정 옵션
     */
    constructor(options: TablePaginationOptions<T>) {
        this.storageKey = options.storageKey;
        this.defaultItemsPerPage = options.defaultItemsPerPage || 100;
        this.onPageChange = options.onPageChange || (() => {});
        this.renderRow = options.renderRow;

        this.currentPage = 1;
        this.itemsPerPage = parseInt(localStorage.getItem(this.storageKey) || '', 10) || this.defaultItemsPerPage;
        this.totalPages = 1;
        this.data = [];

        // DOM 요소
        this.elements = {
            paginationInfo: document.getElementById('paginationInfo'),
            itemsPerPageSelect: document.getElementById('itemsPerPage') as HTMLSelectElement | null,
            pageNumbersContainer: document.getElementById('pageNumbers'),
            firstPageBtn: document.getElementById('firstPage') as HTMLButtonElement | null,
            prevPageBtn: document.getElementById('prevPage') as HTMLButtonElement | null,
            nextPageBtn: document.getElementById('nextPage') as HTMLButtonElement | null,
            lastPageBtn: document.getElementById('lastPage') as HTMLButtonElement | null,
            paginationContainer: document.getElementById('pagination'),
            tableBody: null,
            emptyState: null
        };

        this.init();
    }

    /**
     * 테이블 바디와 빈 상태 요소 설정
     */
    setTableElements(tableBody: HTMLElement | null, emptyState: HTMLElement | null): void {
        this.elements.tableBody = tableBody;
        this.elements.emptyState = emptyState;
    }

    /**
     * 초기화
     */
    private init(): void {
        const { itemsPerPageSelect, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn } = this.elements;

        // 페이지당 항목 수 선택 이벤트
        if (itemsPerPageSelect) {
            itemsPerPageSelect.value = String(this.itemsPerPage);
            itemsPerPageSelect.addEventListener('change', (e: Event) => {
                const target = e.target as HTMLSelectElement;
                this.itemsPerPage = parseInt(target.value, 10);
                localStorage.setItem(this.storageKey, String(this.itemsPerPage));
                this.currentPage = 1;
                this.renderCurrentPage();
            });
        }

        // 네비게이션 버튼 이벤트
        if (firstPageBtn) firstPageBtn.addEventListener('click', () => this.goToPage(1));
        if (prevPageBtn) prevPageBtn.addEventListener('click', () => this.goToPage(this.currentPage - 1));
        if (nextPageBtn) nextPageBtn.addEventListener('click', () => this.goToPage(this.currentPage + 1));
        if (lastPageBtn) lastPageBtn.addEventListener('click', () => this.goToPage(this.totalPages));
    }

    /**
     * 페이지 이동
     */
    goToPage(page: number): void {
        if (page < 1 || page > this.totalPages) return;
        this.currentPage = page;
        this.renderCurrentPage();

        // 테이블 상단으로 스크롤
        const tableWrapper = document.querySelector('.table-wrapper');
        if (tableWrapper) tableWrapper.scrollTop = 0;
    }

    /**
     * 데이터 설정 및 렌더링
     */
    setData(data: T[]): void {
        this.data = data;
        this.totalPages = Math.ceil(this.data.length / this.itemsPerPage) || 1;

        if (this.currentPage > this.totalPages) {
            this.currentPage = this.totalPages;
        }

        this.render();
    }

    /**
     * 전체 렌더링
     */
    private render(): void {
        const { paginationContainer, emptyState } = this.elements;

        if (this.data.length === 0) {
            if (emptyState) emptyState.style.display = 'flex';
            if (paginationContainer) paginationContainer.style.display = 'none';
            this.updatePaginationUI();
            return;
        }

        if (emptyState) emptyState.style.display = 'none';
        if (paginationContainer) paginationContainer.style.display = 'flex';

        this.renderCurrentPage();
    }

    /**
     * 현재 페이지 렌더링
     */
    private renderCurrentPage(): void {
        const { tableBody } = this.elements;
        if (!tableBody) return;

        const startIndex = (this.currentPage - 1) * this.itemsPerPage;
        const endIndex = startIndex + this.itemsPerPage;
        const pageData = this.data.slice(startIndex, endIndex);

        tableBody.innerHTML = '';

        if (this.renderRow) {
            pageData.forEach((item, index) => {
                const row = this.renderRow!(item, startIndex + index);
                if (row) tableBody.appendChild(row);
            });
        }

        this.updatePaginationUI();
        this.onPageChange(this.currentPage, pageData);
    }

    /**
     * 페이지네이션 UI 업데이트
     */
    private updatePaginationUI(): void {
        const { paginationInfo, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn } = this.elements;

        const totalItems = this.data.length;
        this.totalPages = Math.ceil(totalItems / this.itemsPerPage) || 1;

        if (this.currentPage > this.totalPages) this.currentPage = this.totalPages;

        const startItem = totalItems === 0 ? 0 : (this.currentPage - 1) * this.itemsPerPage + 1;
        const endItem = Math.min(this.currentPage * this.itemsPerPage, totalItems);

        if (paginationInfo) {
            paginationInfo.textContent = `${totalItems}건 중 ${startItem}-${endItem}`;
        }

        if (firstPageBtn) firstPageBtn.disabled = this.currentPage === 1;
        if (prevPageBtn) prevPageBtn.disabled = this.currentPage === 1;
        if (nextPageBtn) nextPageBtn.disabled = this.currentPage === this.totalPages;
        if (lastPageBtn) lastPageBtn.disabled = this.currentPage === this.totalPages;

        this.renderPageNumbers();
    }

    /**
     * 페이지 번호 렌더링
     */
    private renderPageNumbers(): void {
        const { pageNumbersContainer } = this.elements;
        if (!pageNumbersContainer) return;

        pageNumbersContainer.innerHTML = '';

        const maxVisiblePages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
        const endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

        if (endPage - startPage + 1 < maxVisiblePages) {
            startPage = Math.max(1, endPage - maxVisiblePages + 1);
        }

        // 첫 페이지 표시
        if (startPage > 1) {
            pageNumbersContainer.appendChild(this.createPageButton(1));
            if (startPage > 2) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
        }

        // 중간 페이지들
        for (let i = startPage; i <= endPage; i++) {
            pageNumbersContainer.appendChild(this.createPageButton(i));
        }

        // 마지막 페이지 표시
        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                const ellipsis = document.createElement('span');
                ellipsis.className = 'page-ellipsis';
                ellipsis.textContent = '...';
                pageNumbersContainer.appendChild(ellipsis);
            }
            pageNumbersContainer.appendChild(this.createPageButton(this.totalPages));
        }
    }

    /**
     * 페이지 버튼 생성
     */
    private createPageButton(pageNum: number): HTMLButtonElement {
        const btn = document.createElement('button');
        btn.className = `page-btn ${pageNum === this.currentPage ? 'active' : ''}`;
        btn.textContent = String(pageNum);
        btn.addEventListener('click', () => this.goToPage(pageNum));
        return btn;
    }

    /**
     * 현재 페이지 반환
     */
    getCurrentPage(): number {
        return this.currentPage;
    }

    /**
     * 현재 데이터 반환
     */
    getData(): T[] {
        return this.data;
    }

    /**
     * 페이지 리셋
     */
    resetPage(): void {
        this.currentPage = 1;
    }
}

// IIFE 래핑으로 전역 내보내기 (원본 JS 패턴 유지)
(function() {
    'use strict';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).PaginationManager = TablePaginationManager;
})();

export { TablePaginationManager, TablePaginationOptions, TablePaginationElements };
