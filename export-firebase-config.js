const fs = require('fs');

// firebase-auth.json 읽기
const authFile = fs.readFileSync('firebase-auth.json', 'utf8');
const config = JSON.parse(authFile);

// Base64 인코딩 (firebase-config.ts의 obfuscate 로직과 동일)
const encoded = Buffer.from(encodeURIComponent(JSON.stringify(config))).toString('base64');

console.log('=== Firebase 설정 (웹용) ===\n');
console.log('브라우저 콘솔(F12)에서 다음 명령어를 실행하세요:\n');
console.log(`localStorage.setItem('firebase_config', '${encoded}');`);
console.log('\n실행 후 페이지를 새로고침하면 Firebase가 자동으로 초기화됩니다.');
console.log('\n=== 또는 설정 페이지에서 입력할 JSON ===\n');
console.log(JSON.stringify(config, null, 2));
