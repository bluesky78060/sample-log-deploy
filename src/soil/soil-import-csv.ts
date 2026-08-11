/**
 * @fileoverview 가져오기 오류 행 CSV 직렬화 (순수 로직)
 *
 * 메인 `soil-result-importer.js`의 `_downloadErrorCsv` 안에 있던 지역 함수를
 * 별 모듈로 분리했다 (SAMPL-1-124 리뷰 M-3). CSV 인젝션 방어는 보안 방어이므로
 * 단위 테스트로 고정돼야 하고, 모달 메서드 안의 지역 함수는 테스트할 수 없었다.
 */

/** 오류 행 CSV의 컬럼 순서 (메인과 동일) */
export const ERROR_CSV_HEADER = [
    '성명', '연락처', '지번주소', '작물', '면적', '구분', '목적', '오류사유',
] as const;

/**
 * CSV 셀 이스케이프 (RFC 4180 + CSV 인젝션 방지).
 *
 * 인젝션 방지: 엑셀·구글시트는 `=`/`+`/`-`/`@`/`|`로 시작하는 셀을 수식으로 해석한다.
 * `=cmd|'/c calc'!A1` 같은 값이 그대로 들어가면 파일을 연 사람의 기기에서 실행될 수 있어
 * 앞에 작은따옴표를 넣어 문자열로 고정한다.
 *
 * **선행 공백·제어문자를 벗긴 뒤 판정한다.** 엑셀은 셀 앞의 탭(0x09)·CR(0x0d)을
 * 버리고 그 뒤를 수식으로 읽으므로, 첫 글자만 보면 `\t=cmd|...`가 방어를 그대로 통과한다
 * (탭은 인용 트리거 목록에도 없어 무가공으로 나간다 — SAMPL-1-124 적대적 검증).
 */
export function csvCell(val: unknown): string {
    let s = String(val ?? '');
    const head = s.replace(/^[\s\u0000-\u001f\u00a0]+/, '')[0];
    if (head && '=+-@|'.includes(head)) s = "'" + s;
    if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
        s = '"' + s.replace(/"/g, '""') + '"';
    }
    return s;
}

/** CSV 한 행 — 셀마다 이스케이프한 뒤 콤마로 잇는다 */
export function csvRow(values: readonly unknown[]): string {
    return values.map(csvCell).join(',');
}

/**
 * 표 → CSV 본문. 엑셀이 UTF-8로 인식하도록 BOM을 붙이고 CRLF로 잇는다
 * (BOM이 없으면 한글이 깨진 채 열린다).
 */
export function buildCsv(header: readonly unknown[], rows: readonly (readonly unknown[])[]): string {
    return '﻿' + [csvRow(header), ...rows.map(csvRow)].join('\r\n');
}
