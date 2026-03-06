// ========================================
// 공통 XSS 방지 모듈
// DOMPurify를 사용한 HTML 새니타이징
// ========================================
import DOMPurify from 'dompurify';

/** DOMPurify 설정 타입 */
interface DOMPurifyConfig {
    ALLOWED_TAGS: string[];
    ALLOWED_ATTR: string[];
    ALLOW_DATA_ATTR: boolean;
}

/** 템플릿 데이터 타입 */
export type TemplateData = Record<string, unknown>;

// Window 전역 타입 확장
declare global {
    interface Window {
        sanitizeHTML: (html: string) => string;
        escapeHTML: (text: string | null | undefined) => string;
        setInnerHTML: (element: HTMLElement | null, html: string) => void;
        clearElement: (element: HTMLElement | null) => void;
        safeText: (value: string) => string;
        safeTemplate: (template: string, data: TemplateData) => string;
    }
}

/**
 * HTML 문자열을 새니타이즈하여 XSS 공격 방지
 * @param html - 새니타이즈할 HTML 문자열
 * @returns 새니타이즈된 HTML 문자열
 */
function sanitizeHTML(html: string): string {
    if (DOMPurify) {
        const config: DOMPurifyConfig = {
            ALLOWED_TAGS: [
                'div', 'span', 'p', 'br', 'hr',
                'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                'ul', 'ol', 'li', 'dl', 'dt', 'dd',
                'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
                'a', 'img', 'button', 'input', 'select', 'option', 'textarea', 'label',
                'form', 'fieldset', 'legend',
                'strong', 'em', 'b', 'i', 'u', 's', 'small', 'mark', 'sub', 'sup',
                'pre', 'code', 'blockquote', 'cite', 'abbr',
                'header', 'footer', 'nav', 'main', 'section', 'article', 'aside',
                'figure', 'figcaption', 'details', 'summary'
            ],
            ALLOWED_ATTR: [
                'class', 'id', 'style', 'title', 'alt', 'src', 'href', 'target', 'rel',
                'type', 'name', 'value', 'placeholder', 'disabled', 'readonly', 'checked', 'selected',
                'for', 'data-*', 'aria-*', 'role',
                'colspan', 'rowspan', 'width', 'height',
                'min', 'max', 'step', 'pattern', 'required', 'maxlength', 'minlength',
                'rows', 'cols', 'multiple', 'accept'
            ],
            ALLOW_DATA_ATTR: true
        };
        return DOMPurify.sanitize(html, config);
    }
    // DOMPurify가 없으면 기본 이스케이프 처리
    return escapeHTML(html);
}

/**
 * 텍스트를 HTML 엔티티로 이스케이프
 * @param text - 이스케이프할 텍스트
 * @returns 이스케이프된 텍스트
 */
function escapeHTML(text: string | null | undefined): string {
    if (text === null || text === undefined) return '';
    const div = document.createElement('div');
    div.textContent = String(text);
    return div.innerHTML;
}

/**
 * 안전하게 innerHTML 설정
 * @param element - 대상 요소
 * @param html - 설정할 HTML
 */
function setInnerHTML(element: HTMLElement | null, html: string): void {
    if (element) {
        element.innerHTML = sanitizeHTML(html);
    }
}

/**
 * 빈 콘텐츠로 요소 초기화 (새니타이징 불필요)
 * @param element - 대상 요소
 */
function clearElement(element: HTMLElement | null): void {
    if (element) {
        element.innerHTML = '';
    }
}

/**
 * 사용자 입력값을 안전하게 이스케이프 (텍스트로 사용할 때)
 * @param value - 이스케이프할 값
 * @returns 이스케이프된 값
 */
function safeText(value: string): string {
    return escapeHTML(value);
}

/**
 * 템플릿 리터럴 내 사용자 데이터를 안전하게 처리
 * @param template - 템플릿 문자열
 * @param data - 치환할 데이터
 * @returns 처리된 문자열
 */
function safeTemplate(template: string, data: TemplateData): string {
    let result = template;
    for (const [key, value] of Object.entries(data)) {
        const safeValue = escapeHTML(value as string | null | undefined);
        result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), safeValue);
    }
    return result;
}

// 전역으로 내보내기
window.sanitizeHTML = sanitizeHTML;
window.escapeHTML = escapeHTML;
window.setInnerHTML = setInnerHTML;
window.clearElement = clearElement;
window.safeText = safeText;
window.safeTemplate = safeTemplate;

// ES 모듈 export
export { sanitizeHTML, escapeHTML, setInnerHTML, clearElement, safeText, safeTemplate };
