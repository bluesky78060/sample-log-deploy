/**
 * @fileoverview Virtual Scrolling 구현
 * @description 대량 데이터를 효율적으로 렌더링하기 위한 가상 스크롤
 */

/**
 * 가시 범위 인터페이스
 */
interface VisibleRange {
    startIndex: number;
    endIndex: number;
}

/**
 * 렌더링된 아이템 정보 인터페이스
 */
interface RenderedItemInfo {
    element: HTMLElement;
    index: number;
}

/**
 * 성능 통계 인터페이스
 */
interface VirtualListStats {
    totalItems: number;
    renderedItems: number;
    memoryEfficiency: string;
}

/**
 * VirtualListManager 옵션 인터페이스
 */
interface VirtualListManagerOptions<T = unknown> {
    /** 스크롤 컨테이너 */
    container: HTMLElement;
    /** 아이템을 렌더링할 뷰포트 */
    viewport: HTMLElement;
    /** 각 아이템의 고정 높이 (px) */
    itemHeight?: number;
    /** 화면 밖에 미리 렌더링할 아이템 수 */
    buffer?: number;
    /** (item, index) => HTMLElement 렌더링 함수 */
    renderItem: (item: T, index: number) => HTMLElement;
    /** (item) => unique key */
    getItemKey?: (item: T) => string | number;
}

class VirtualListManager<T = unknown> {
    private container: HTMLElement;
    private viewport: HTMLElement;
    private itemHeight: number;
    private buffer: number;
    private renderItem: (item: T, index: number) => HTMLElement;
    private getItemKey: (item: T) => string | number;

    private data: T[];
    private renderedItems: Map<string | number, RenderedItemInfo>;
    private scrollTop: number;
    private viewportHeight: number;
    private renderTimeout: number | null;

    /**
     * @param options - 옵션
     */
    constructor(options: VirtualListManagerOptions<T>) {
        this.container = options.container;
        this.viewport = options.viewport;
        this.itemHeight = options.itemHeight || 48;  // 기본 48px
        this.buffer = options.buffer || 5;
        this.renderItem = options.renderItem;
        this.getItemKey = options.getItemKey || ((item: T) => (item as { id: string | number }).id);

        this.data = [];
        this.renderedItems = new Map();  // key -> {element, index}
        this.scrollTop = 0;
        this.viewportHeight = 0;
        this.renderTimeout = null;

        this.init();
    }

    /**
     * 초기화
     */
    private init(): void {
        // 컨테이너 스타일 설정
        this.container.style.overflow = 'auto';
        this.container.style.position = 'relative';

        // 뷰포트 스타일
        this.viewport.style.position = 'relative';

        // 스크롤 이벤트
        this.container.addEventListener('scroll', () => {
            this.scrollTop = this.container.scrollTop;
            this.render();
        });

        // 리사이즈 감지
        const resizeObserver = new ResizeObserver(() => {
            this.viewportHeight = this.container.clientHeight;
            this.render();
        });
        resizeObserver.observe(this.container);

        this.viewportHeight = this.container.clientHeight;
    }

    /**
     * 데이터 설정
     * @param data - 렌더링할 데이터 배열
     */
    setData(data: T[]): void {
        this.data = data || [];
        this.renderedItems.clear();

        // 전체 높이 설정 (가상 스크롤바용)
        const totalHeight = this.data.length * this.itemHeight;
        this.viewport.style.height = `${totalHeight}px`;

        this.render();
    }

    /**
     * 화면에 보이는 아이템 범위 계산
     * @returns 시작 인덱스와 끝 인덱스
     */
    getVisibleRange(): VisibleRange {
        const startIndex = Math.max(0, Math.floor(this.scrollTop / this.itemHeight) - this.buffer);
        const visibleCount = Math.ceil(this.viewportHeight / this.itemHeight);
        const endIndex = Math.min(
            this.data.length,
            startIndex + visibleCount + this.buffer * 2
        );

        return { startIndex, endIndex };
    }

    /**
     * 렌더링 (디바운스 적용)
     */
    render(): void {
        if (this.renderTimeout) {
            return;  // 이미 렌더링 예약됨
        }

        this.renderTimeout = requestAnimationFrame(() => {
            this.renderTimeout = null;
            this.doRender();
        });
    }

    /**
     * 실제 렌더링 로직
     */
    private doRender(): void {
        const { startIndex, endIndex } = this.getVisibleRange();

        // 현재 렌더링된 아이템의 키 추적
        const currentKeys = new Set<string | number>();

        // 보이는 범위의 아이템 렌더링
        for (let i = startIndex; i < endIndex; i++) {
            const item = this.data[i];
            const key = this.getItemKey(item);
            currentKeys.add(key);

            const rendered = this.renderedItems.get(key);

            if (!rendered) {
                // 새 아이템 렌더링
                const element = this.renderItem(item, i);
                element.style.position = 'absolute';
                element.style.top = `${i * this.itemHeight}px`;
                element.style.left = '0';
                element.style.right = '0';
                element.style.height = `${this.itemHeight}px`;
                element.dataset.key = String(key);

                this.viewport.appendChild(element);
                this.renderedItems.set(key, { element, index: i });
            } else if (rendered.index !== i) {
                // 인덱스가 변경된 경우 위치 업데이트
                rendered.element.style.top = `${i * this.itemHeight}px`;
                rendered.index = i;
            }
        }

        // 보이지 않는 아이템 제거
        const keysToDelete: (string | number)[] = [];
        this.renderedItems.forEach((rendered, key) => {
            if (!currentKeys.has(key)) {
                rendered.element.remove();
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.renderedItems.delete(key));
    }

    /**
     * 특정 인덱스로 스크롤
     * @param index - 스크롤할 인덱스
     */
    scrollToIndex(index: number): void {
        const targetScrollTop = index * this.itemHeight;
        this.container.scrollTop = targetScrollTop;
    }

    /**
     * 데이터 업데이트 (부분)
     * @param index - 업데이트할 인덱스
     * @param newItem - 새 아이템 데이터
     */
    updateItem(index: number, newItem: T): void {
        if (index >= 0 && index < this.data.length) {
            this.data[index] = newItem;

            const key = this.getItemKey(newItem);
            const rendered = this.renderedItems.get(key);

            if (rendered) {
                // 이미 렌더링된 경우 재렌더링
                const newElement = this.renderItem(newItem, index);
                newElement.style.position = 'absolute';
                newElement.style.top = `${index * this.itemHeight}px`;
                newElement.style.left = '0';
                newElement.style.right = '0';
                newElement.style.height = `${this.itemHeight}px`;
                newElement.dataset.key = String(key);

                rendered.element.replaceWith(newElement);
                this.renderedItems.set(key, { element: newElement, index });
            }
        }
    }

    /**
     * 성능 통계 조회
     */
    getStats(): VirtualListStats {
        return {
            totalItems: this.data.length,
            renderedItems: this.renderedItems.size,
            memoryEfficiency: ((1 - this.renderedItems.size / (this.data.length || 1)) * 100).toFixed(1) + '%'
        };
    }

    /**
     * 정리
     */
    destroy(): void {
        this.renderedItems.forEach(({ element }) => element.remove());
        this.renderedItems.clear();
        if (this.renderTimeout) {
            cancelAnimationFrame(this.renderTimeout);
        }
    }
}

// 전역으로 내보내기 (타입 충돌 방지를 위해 as any 사용)
(window as any).VirtualListManager = VirtualListManager;

// CommonJS export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = VirtualListManager;
}

export { VirtualListManager, VirtualListManagerOptions, VisibleRange, RenderedItemInfo, VirtualListStats };
