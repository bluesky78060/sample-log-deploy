// ========================================
// 공통 페이지네이션 모듈
// ========================================
(function() {
    'use strict';

    /**
     * 페이지네이션 관리자 클래스
     */
    class PaginationManager {
        /**
         * @param {object} options - 설정 옵션
         * @param {string} options.storageKey - localStorage 키 (예: 'soilItemsPerPage')
         * @param {number} options.defaultItemsPerPage - 기본 페이지당 항목 수 (기본값: 100)
         * @param {function} options.onPageChange - 페이지 변경 시 콜백
         * @param {function} options.renderRow - 행 렌더링 함수
         */
        constructor(options) {
            this.storageKey = options.storageKey;
            this.defaultItemsPerPage = options.defaultItemsPerPage || 100;
            this.onPageChange = options.onPageChange || (() => {});
            this.renderRow = options.renderRow;

            this.currentPage = 1;
            this.itemsPerPage = parseInt(localStorage.getItem(this.storageKey, 10)) || this.defaultItemsPerPage;
            this.totalPages = 1;
            this.data = [];

            // DOM 요소
            this.elements = {
                paginationInfo: document.getElementById('paginationInfo'),
                itemsPerPageSelect: document.getElementById('itemsPerPage'),
                pageNumbersContainer: document.getElementById('pageNumbers'),
                firstPageBtn: document.getElementById('firstPage'),
                prevPageBtn: document.getElementById('prevPage'),
                nextPageBtn: document.getElementById('nextPage'),
                lastPageBtn: document.getElementById('lastPage'),
                paginationContainer: document.getElementById('pagination'),
                tableBody: null,
                emptyState: null
            };

            this.init();
        }

        /**
         * 테이블 바디와 빈 상태 요소 설정
         */
        setTableElements(tableBody, emptyState) {
            this.elements.tableBody = tableBody;
            this.elements.emptyState = emptyState;
        }

        /**
         * 초기화
         */
        init() {
            const { itemsPerPageSelect, firstPageBtn, prevPageBtn, nextPageBtn, lastPageBtn } = this.elements;

            // 페이지당 항목 수 선택 이벤트
            if (itemsPerPageSelect) {
                itemsPerPageSelect.value = this.itemsPerPage;
                itemsPerPageSelect.addEventListener('change', (e) => {
                    this.itemsPerPage = parseInt(e.target.value, 10);
                    localStorage.setItem(this.storageKey, this.itemsPerPage);
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
        goToPage(page) {
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
        setData(data) {
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
        render() {
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
        renderCurrentPage() {
            const { tableBody } = this.elements;
            if (!tableBody) return;

            const startIndex = (this.currentPage - 1) * this.itemsPerPage;
            const endIndex = startIndex + this.itemsPerPage;
            const pageData = this.data.slice(startIndex, endIndex);

            tableBody.innerHTML = '';

            if (this.renderRow) {
                pageData.forEach((item, index) => {
                    const row = this.renderRow(item, startIndex + index);
                    if (row) tableBody.appendChild(row);
                });
            }

            this.updatePaginationUI();
            this.onPageChange(this.currentPage, pageData);
        }

        /**
         * 페이지네이션 UI 업데이트
         */
        updatePaginationUI() {
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
        renderPageNumbers() {
            const { pageNumbersContainer } = this.elements;
            if (!pageNumbersContainer) return;

            pageNumbersContainer.innerHTML = '';

            const maxVisiblePages = 5;
            let startPage = Math.max(1, this.currentPage - Math.floor(maxVisiblePages / 2));
            let endPage = Math.min(this.totalPages, startPage + maxVisiblePages - 1);

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
        createPageButton(pageNum) {
            const btn = document.createElement('button');
            btn.className = `page-btn ${pageNum === this.currentPage ? 'active' : ''}`;
            btn.textContent = pageNum;
            btn.addEventListener('click', () => this.goToPage(pageNum));
            return btn;
        }

        /**
         * 현재 페이지 반환
         */
        getCurrentPage() {
            return this.currentPage;
        }

        /**
         * 현재 데이터 반환
         */
        getData() {
            return this.data;
        }

        /**
         * 페이지 리셋
         */
        resetPage() {
            this.currentPage = 1;
        }
    }

    // 전역으로 내보내기
    window.PaginationManager = PaginationManager;
})();
