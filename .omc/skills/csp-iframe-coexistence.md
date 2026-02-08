---
id: csp-iframe-coexistence-001
name: CSP와 iframe 공존
description: Electron CSP 설정 시 외부 iframe(Daum 우편번호 등)이 차단되는 문제 해결
source: conversation
triggers: ["CSP", "iframe 안됨", "우편번호 검색", "frame-ancestors", "Content-Security-Policy"]
quality: high
---

# CSP와 iframe 공존

## The Insight

Electron에서 CSP를 모든 요청에 적용하면 **외부 iframe 내부 리소스까지 차단**된다. CSP는 **mainFrame에만** 적용해야 iframe이 정상 작동한다.

## Why This Matters

2번 수정이 필요했던 문제:
1. `frame-src` 추가 → 여전히 안됨
2. `mainFrame` 조건 추가 → 해결

Daum 우편번호 API, Google Maps 등 외부 iframe 서비스가 모두 영향받음.

## Recognition Pattern

이 스킬이 필요한 상황:
- "주소 검색이 안 됩니다"
- "iframe이 빈 화면입니다"
- CSP 적용 후 외부 서비스 장애
- 콘솔에 `frame-ancestors` 관련 에러

## The Approach

### 1. mainFrame에만 CSP 적용

```javascript
// src/index.js
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    // ✅ 메인 프레임에만 CSP 적용 (iframe은 원본 헤더 유지)
    if (details.resourceType === 'mainFrame') {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                'Content-Security-Policy': [
                    "default-src 'self'",
                    "script-src 'self' https://cdn.tailwindcss.com https://www.gstatic.com",
                    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
                    "font-src 'self' https://fonts.gstatic.com",
                    "img-src 'self' data: https:",
                    "connect-src 'self' https://*.firebaseio.com https://*.googleapis.com",
                    "frame-src https://postcode.map.daum.net https://*.daum.net"
                ].join('; ')
            }
        });
    } else {
        // iframe/subFrame 요청은 원본 헤더 유지
        callback({ responseHeaders: details.responseHeaders });
    }
});
```

### 2. frame-src 도메인 허용

```javascript
// CSP에 iframe 소스 도메인 추가
"frame-src https://postcode.map.daum.net https://*.daum.net https://maps.google.com"
```

### 3. 디버깅 방법

```javascript
// CSP 위반 로깅
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    console.log(`[CSP] ${details.resourceType}: ${details.url}`);
    // ...
});
```

## Anti-Pattern

```javascript
// ❌ 모든 요청에 CSP 적용
session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
    callback({
        responseHeaders: {
            ...details.responseHeaders,
            'Content-Security-Policy': [...]  // iframe 내부도 차단됨
        }
    });
});

// ❌ frame-src만 추가하고 resourceType 체크 안함
"frame-src https://postcode.map.daum.net"  // 여전히 안됨
```

## 관련 파일

- `src/index.js:25-45` - CSP 헤더 설정
- 커밋 `67e71cb` - mainFrame 조건 추가
- 커밋 `8bd6ec3` - frame-src 추가 (불완전)
