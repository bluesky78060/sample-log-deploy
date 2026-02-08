/**
 * DOM 조작 유틸리티
 * 안전한 DOM 조작을 위한 헬퍼 함수 모음
 */

import { sanitizeHTML } from './sanitize.js';

/**
 * innerHTML을 안전하게 설정하는 헬퍼 함수
 * XSS 공격을 방지하기 위해 모든 HTML을 sanitize합니다
 * @param {HTMLElement} element - HTML을 설정할 엘리먼트
 * @param {string} html - 설정할 HTML 문자열
 * @returns {void}
 */
export function setInnerHTML(element, html) {
    if (!element) {
        console.warn('[DOM Utils] setInnerHTML: element가 null입니다.');
        return;
    }

    if (typeof html !== 'string') {
        console.warn('[DOM Utils] setInnerHTML: html이 문자열이 아닙니다:', typeof html);
        html = String(html);
    }

    element.innerHTML = sanitizeHTML(html);
}

/**
 * textContent를 안전하게 설정하는 헬퍼 함수
 * HTML이 아닌 순수 텍스트를 설정할 때 사용
 * @param {HTMLElement} element - 텍스트를 설정할 엘리먼트
 * @param {string} text - 설정할 텍스트
 * @returns {void}
 */
export function setTextContent(element, text) {
    if (!element) {
        console.warn('[DOM Utils] setTextContent: element가 null입니다.');
        return;
    }

    element.textContent = String(text);
}

/**
 * HTML 문자열을 DOM 엘리먼트로 파싱
 * @param {string} html - 파싱할 HTML 문자열
 * @returns {DocumentFragment}
 */
export function parseHTML(html) {
    const template = document.createElement('template');
    template.innerHTML = sanitizeHTML(html);
    return template.content;
}

/**
 * 엘리먼트의 HTML을 안전하게 추가
 * @param {HTMLElement} element - HTML을 추가할 엘리먼트
 * @param {string} position - insertAdjacentHTML의 position 파라미터
 * @param {string} html - 추가할 HTML
 */
export function insertHTML(element, position, html) {
    if (!element) {
        console.warn('[DOM Utils] insertHTML: element가 null입니다.');
        return;
    }

    element.insertAdjacentHTML(position, sanitizeHTML(html));
}

/**
 * 자식 엘리먼트를 모두 제거하고 새로운 HTML로 교체
 * @param {HTMLElement} element - 대상 엘리먼트
 * @param {string} html - 설정할 HTML
 */
export function replaceHTML(element, html) {
    if (!element) {
        console.warn('[DOM Utils] replaceHTML: element가 null입니다.');
        return;
    }

    // 기존 이벤트 리스너 정리를 위해 자식 노드 제거
    while (element.firstChild) {
        element.removeChild(element.firstChild);
    }

    // 새로운 HTML 설정
    element.innerHTML = sanitizeHTML(html);
}

/**
 * 조건부로 HTML 또는 텍스트 설정
 * @param {HTMLElement} element - 대상 엘리먼트
 * @param {string} content - 설정할 내용
 * @param {boolean} isHTML - HTML 여부
 */
export function setContent(element, content, isHTML = false) {
    if (!element) return;

    if (isHTML) {
        setInnerHTML(element, content);
    } else {
        setTextContent(element, content);
    }
}

/**
 * 배열의 각 항목에 대해 HTML 생성하고 엘리먼트에 설정
 * @param {HTMLElement} element - 대상 엘리먼트
 * @param {Array} items - 렌더링할 항목 배열
 * @param {Function} renderFn - 각 항목을 HTML로 변환하는 함수
 */
export function renderList(element, items, renderFn) {
    if (!element || !Array.isArray(items)) return;

    const html = items.map(renderFn).join('');
    setInnerHTML(element, html);
}

/**
 * innerHTML 직접 사용을 감지하고 경고하는 함수 (개발용)
 * @param {boolean} enable - 감지 활성화 여부
 */
export function enableInnerHTMLWarning(enable = true) {
    if (!enable || typeof window === 'undefined') return;

    // 개발 환경에서만 작동
    if (process.env.NODE_ENV === 'production') return;

    // Element.prototype.innerHTML setter를 감싸기
    const originalInnerHTMLSetter = Object.getOwnPropertyDescriptor(
        Element.prototype,
        'innerHTML'
    ).set;

    Object.defineProperty(Element.prototype, 'innerHTML', {
        set: function(value) {
            // dom-utils.js 내부 호출은 무시
            const stack = new Error().stack;
            if (!stack.includes('dom-utils.js') && !stack.includes('sanitize.js')) {
                console.warn(
                    '[DOM Utils] innerHTML 직접 사용 감지! setInnerHTML()을 사용하세요.',
                    '\n위치:', stack.split('\n')[2],
                    '\n값:', value.substring(0, 100) + '...'
                );
            }

            originalInnerHTMLSetter.call(this, value);
        },
        get: Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML').get,
        configurable: true
    });
}

// 개발 환경에서 자동으로 innerHTML 직접 사용 경고 활성화
if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    window.addEventListener('DOMContentLoaded', () => {
        enableInnerHTMLWarning(true);
    });
}

// 전역 객체에 노출 (디버깅용)
if (typeof window !== 'undefined') {
    window.DOMUtils = {
        setInnerHTML,
        setTextContent,
        parseHTML,
        insertHTML,
        replaceHTML,
        setContent,
        renderList,
        enableInnerHTMLWarning
    };
}