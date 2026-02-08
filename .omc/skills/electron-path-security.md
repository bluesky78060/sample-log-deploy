---
id: electron-path-security-001
name: Electron 경로 보안
description: Electron 앱에서 경로 순회 공격 방어 - 앱 전용 폴더만 허용
source: conversation
triggers: ["경로 순회", "path traversal", "app.getPath", "파일 접근 권한", "보안 리뷰"]
quality: high
---

# Electron 경로 보안

## The Insight

Electron의 `app.getPath('home')`은 **전체 홈 디렉토리 접근 권한**을 부여한다. 이는 경로 순회 공격에 취약하다. 앱이 필요한 **특정 폴더만** 화이트리스트로 허용해야 한다.

## Why This Matters

코드 리뷰에서 HIGH 보안 이슈로 지적됨:
- `../../../etc/passwd` 같은 경로로 시스템 파일 접근 가능
- 악의적 입력으로 앱 외부 데이터 유출 위험

## Recognition Pattern

이 스킬이 필요한 상황:
- Electron IPC로 파일 읽기/쓰기 구현
- `app.getPath()` 사용하는 코드
- 보안 리뷰에서 "경로 순회" 지적

## The Approach

### 1. 허용 폴더 화이트리스트

```javascript
// src/index.js
function getAllowedPaths() {
    const userDataPath = app.getPath('userData');
    const documentsPath = app.getPath('documents');
    const downloadsPath = app.getPath('downloads');

    return [
        userDataPath,
        path.join(documentsPath, 'SampleLog'),  // 앱 전용 폴더
        path.join(downloadsPath, 'SampleLog'),
        // app.getPath('home')  ❌ 너무 광범위
    ];
}
```

### 2. 경로 검증 함수

```javascript
function isPathAllowed(targetPath) {
    const normalizedPath = path.normalize(targetPath);

    // 1. null byte 검사
    if (normalizedPath.includes('\0')) {
        return false;
    }

    // 2. 상대 경로 요소 검사
    if (normalizedPath.includes('..') || normalizedPath.includes('./')) {
        return false;
    }

    // 3. 허용 폴더 내부인지 확인
    const allowedPaths = getAllowedPaths();
    return allowedPaths.some(allowedPath =>
        normalizedPath.startsWith(allowedPath)
    );
}
```

### 3. IPC 핸들러에서 검증

```javascript
ipcMain.handle('write-file', async (event, filePath, content) => {
    if (!isPathAllowed(filePath)) {
        return { success: false, error: '허용되지 않은 경로입니다' };
    }

    try {
        await fs.promises.writeFile(filePath, content, 'utf8');
        return { success: true };
    } catch (error) {
        return { success: false, error: error.message };
    }
});
```

### 4. 파일명 유효성 검사

```javascript
function isValidFilename(filename) {
    // 위험한 문자 필터링
    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/;
    if (invalidChars.test(filename)) {
        return false;
    }

    // 숨김 파일 방지
    if (filename.startsWith('.')) {
        return false;
    }

    return true;
}
```

## Anti-Pattern

```javascript
// ❌ 홈 디렉토리 전체 허용
const allowedPaths = [app.getPath('home')];

// ❌ 경로 검증 없이 직접 사용
ipcMain.handle('write-file', async (event, filePath, content) => {
    await fs.writeFile(filePath, content);  // 위험!
});

// ❌ path.normalize만 믿기
const safePath = path.normalize(userInput);  // ../는 여전히 통과
```

## 관련 파일

- `src/index.js:50-80` - 허용 경로 정의
- `src/index.js:82-120` - 경로 검증 함수
