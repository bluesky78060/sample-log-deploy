# 엑셀 내보내기 버그 수정

## 문제 설명

엑셀로 내보내기 할 때 완료된 시료가 미완료로 표시되는 버그가 있었습니다.

## 원인

필드명 불일치:
- 완료 상태 저장 시: `completed` 필드 사용
- 엑셀 내보내기 시: `isCompleted` 필드 확인
- 결과: `isCompleted`가 undefined이므로 항상 '미완료'로 표시

## 해결 방법

엑셀 내보내기 코드에서 두 필드를 모두 확인하도록 수정:

```javascript
// 수정 전
'완료여부': log.isCompleted ? '완료' : '미완료',

// 수정 후
'완료여부': (log.isCompleted || log.completed) ? '완료' : '미완료',
```

## 수정된 파일

1. `src/soil/soil-script.js` - 토양 시료 (3개 위치)
2. `src/heavy-metal/heavy-metal-script.js` - 중금속 시료 (1개 위치)

참고: `src/pesticide/pesticide-script.js`는 이미 올바르게 구현되어 있었음

## 테스트 방법

### 1. 완료 처리 테스트
1. 토양 또는 중금속 시료 페이지 접속
2. 기존 시료를 완료 처리 (✔ 버튼 클릭)
3. 완료된 시료가 회색으로 표시되는지 확인

### 2. 엑셀 내보내기 테스트
1. 완료된 시료가 있는 상태에서 '엑셀 내보내기' 버튼 클릭
2. 다운로드된 엑셀 파일 열기
3. '완료여부' 열에서 완료된 시료가 '완료'로 표시되는지 확인

### 3. 호환성 테스트
- 기존 데이터(`completed` 필드)와 새 데이터(`isCompleted` 필드) 모두 정상 작동
- 두 필드 중 하나라도 true이면 '완료'로 표시

## 향후 개선사항

### 1. 필드 통일
장기적으로는 모든 시료 타입에서 동일한 필드명 사용 권장:
- 권장: `isCompleted` (더 명확한 boolean 필드명)
- 마이그레이션 스크립트 작성 필요

### 2. 데이터 모델 표준화
```javascript
// 표준 시료 모델
{
  id: string,
  receptionNumber: string,
  date: string,
  name: string,
  isCompleted: boolean,  // 통일된 완료 상태 필드
  createdAt: string,
  updatedAt: string,
  // ... 기타 필드
}
```

### 3. 타입 체크
TypeScript 도입 시 이런 불일치 방지 가능:
```typescript
interface SampleLog {
  isCompleted: boolean;
  // completed?: boolean; // deprecated
}
```

---

**수정일**: 2026-01-26
**작성자**: Claude Opus 4