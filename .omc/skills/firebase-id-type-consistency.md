---
id: firebase-id-type-001
name: Firebase ID 타입 일관성
description: Firestore 저장/삭제 시 ID 타입 불일치로 문서를 찾지 못하는 버그 해결
source: conversation
triggers: ["Firebase 삭제 안됨", "문서를 찾지 못함", "deleteDocument 실패", "ID 매핑", "숫자 ID"]
quality: high
---

# Firebase ID 타입 일관성

## The Insight

Firestore는 문서 ID를 **항상 문자열**로 처리한다. JavaScript에서 숫자형 ID를 사용하면 저장 시와 조회/삭제 시 타입이 달라져 문서를 찾지 못한다.

**핵심 원칙:** ID를 다루는 모든 함수에서 `String(id)`로 정규화하라.

## Why This Matters

이 버그로 6번 수정이 필요했다:
- 저장은 되는데 삭제가 안 됨
- Electron에서만 실패 (환경별 타입 처리 차이)
- 클라우드→로컬 동기화 실패

## Recognition Pattern

이 스킬이 필요한 상황:
- "Firebase 삭제가 안 됩니다"
- `deleteDocument()` 호출 후 문서가 여전히 존재
- 저장된 ID와 삭제 시 ID가 다름
- `typeof id`가 `number`인 경우

## The Approach

### 1. ID 정규화 헬퍼 함수 사용

```javascript
// src/shared/firestore-db.js
function normalizeId(id) {
    if (id === null || id === undefined) return null;
    return String(id);
}
```

### 2. 저장 시 ID 정규화

```javascript
async function batchSave(sampleType, year, documents) {
    chunk.forEach((docData) => {
        // 숫자형 ID는 문자열로만 변환 (원본 값 유지)
        let docId = docData.id;
        if (typeof docId === 'number') {
            docId = String(docId);  // ✅ 원본 유지
            // docId = `${docId}_${index}`;  // ❌ 이렇게 변환하면 삭제 시 못 찾음
        }

        batch.set(docRef, {
            ...docData,
            id: docId,  // 문자열 ID 저장
        });
    });
}
```

### 3. 삭제 시 동일하게 정규화

```javascript
async function deleteDocument(sampleType, year, docId) {
    // ID를 문자열로 변환 (저장 시와 동일하게)
    const stringDocId = typeof docId === 'number' ? String(docId) : String(docId || '');
    if (!stringDocId) {
        console.error('Firestore 삭제 실패: 유효하지 않은 문서 ID');
        return false;
    }

    await deleteDoc(doc(db, collectionName, stringDocId));
}
```

### 4. COLLECTION_MAP 키 일관성

```javascript
const COLLECTION_MAP = {
    'soil': 'soilSamples',
    'heavyMetal': 'heavyMetalSamples',
    'heavy-metal': 'heavyMetalSamples',  // ✅ 케밥 케이스도 추가
};
```

## Anti-Pattern

```javascript
// ❌ 저장 시 ID 변환
docId = `${docId}_${chunkIndex}_${index}`;

// ❌ 삭제 시 원본 ID 사용
await deleteDoc(doc(db, collectionName, docId));  // 찾지 못함!
```

## 관련 파일

- `src/shared/firestore-db.js:196-210` - deleteDocument
- `src/shared/firestore-db.js:239-262` - batchSave
- `src/shared/BaseSampleManager.js` - normalizeId 헬퍼
