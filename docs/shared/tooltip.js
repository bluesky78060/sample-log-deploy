/**
 * @fileoverview 커스텀 툴팁 모듈
 * @description text-truncate 셀에 마우스 호버 시 전체 텍스트를 플로팅 툴팁으로 표시
 */

(function () {
    let tooltipEl = null;

    function getTooltip() {
        if (!tooltipEl) {
            tooltipEl = document.createElement('div');
            tooltipEl.className = 'custom-tooltip';
            document.body.appendChild(tooltipEl);
        }
        return tooltipEl;
    }

    function showTooltip(target) {
        const text = target.getAttribute('data-tooltip');
        if (!text || text === '-') return;

        const tip = getTooltip();
        tip.textContent = text;
        tip.classList.add('visible');

        const rect = target.getBoundingClientRect();
        tip.style.left = rect.left + 'px';
        tip.style.top = (rect.top - tip.offsetHeight - 6) + 'px';

        // 화면 위로 넘치면 아래에 표시
        if (rect.top - tip.offsetHeight - 6 < 0) {
            tip.style.top = (rect.bottom + 6) + 'px';
        }

        // 화면 오른쪽으로 넘치면 조정
        const tipRect = tip.getBoundingClientRect();
        if (tipRect.right > window.innerWidth) {
            tip.style.left = (window.innerWidth - tipRect.width - 8) + 'px';
        }
    }

    function hideTooltip() {
        if (tooltipEl) {
            tooltipEl.classList.remove('visible');
        }
    }

    document.addEventListener('mouseenter', function (e) {
        // e.target이 Element인지 확인
        if (e.target && e.target.nodeType === 1) {
            const target = e.target.closest('.text-truncate[data-tooltip]');
            if (target) showTooltip(target);
        }
    }, true);

    document.addEventListener('mouseleave', function (e) {
        // e.target이 Element인지 확인
        if (e.target && e.target.nodeType === 1) {
            const target = e.target.closest('.text-truncate[data-tooltip]');
            if (target) hideTooltip();
        }
    }, true);

    // 스크롤 시 툴팁 숨김
    document.addEventListener('scroll', hideTooltip, true);
    window.addEventListener('resize', hideTooltip);
})();
