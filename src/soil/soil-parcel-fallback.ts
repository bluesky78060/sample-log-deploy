/**
 * 폼 복원 폴백 헬퍼 (메인 SAMPL-1-119/120 이식, SAMPL-1-122 code-review 반영).
 * parcels[0]가 비어있는 레코드(레거시/Firestore 동기화/부분저장)는
 * 수정 폼·목록 복원 시 레코드 최상위 권위 필드로 보완한다.
 * 정상 데이터(필지별 값 존재)는 truthy 단락으로 발동하지 않아 동작 보존.
 */

export interface ParcelFallbackLog {
    subCategory?: string;
    purpose?: string;
    cropsDisplay?: string;
    area?: string;
}

/** 필지 구분: 필지별 값 우선, 없으면 최상위 subCategory('-' 센티넬 제외) */
export function resolveParcelCategory(parcelCategory: string, log: ParcelFallbackLog | null | undefined): string {
    if (parcelCategory) return parcelCategory;
    const sub = log && log.subCategory;
    return (sub && sub !== '-') ? sub : '';
}

/** 필지 용도: 필지별 값 우선, 없으면 최상위 purpose */
export function resolveParcelPurpose(parcelPurpose: string, log: ParcelFallbackLog | null | undefined): string {
    return parcelPurpose || (log && log.purpose) || '';
}

/** cropsDisplay(콤마 결합 가능) + area → crops 배열 재구성 (콤마 결합형은 첫 작물에만 area 부여) */
export function cropsFromDisplay(log: ParcelFallbackLog | null | undefined): Array<{ name: string; area: string }> {
    const disp = ((log && log.cropsDisplay) || '').trim();
    if (!disp || disp === '-') return [];
    const names = disp.split(',').map((s: string) => s.trim()).filter(Boolean);
    return names.map((name: string, i: number) => ({ name, area: i === 0 ? ((log && log.area) || '') : '' }));
}
