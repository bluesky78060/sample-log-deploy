// Firebase 진단 스크립트
console.log('=== Firebase 진단 시작 ===');

// 1. firebase-auth.json 파일 확인
const fs = require('fs');
const path = require('path');
const authFilePath = path.join(__dirname, 'firebase-auth.json');

console.log('\n1. firebase-auth.json 파일 확인:');
if (fs.existsSync(authFilePath)) {
    console.log('✅ firebase-auth.json 파일 존재');
    try {
        const content = fs.readFileSync(authFilePath, 'utf8');
        const config = JSON.parse(content);
        console.log('   - apiKey:', config.apiKey ? config.apiKey.substring(0, 10) + '...' : '❌ 없음');
        console.log('   - projectId:', config.projectId || '❌ 없음');
        console.log('   - authDomain:', config.authDomain || '❌ 없음');
    } catch (e) {
        console.log('❌ 파일 읽기/파싱 실패:', e.message);
    }
} else {
    console.log('❌ firebase-auth.json 파일이 없습니다');
    console.log('   경로:', authFilePath);
}

// 2. package.json의 firebase 버전 확인
console.log('\n2. Firebase SDK 버전:');
try {
    const packageJson = require('./package.json');
    console.log('   firebase:', packageJson.dependencies.firebase || '❌ 설치되지 않음');
} catch (e) {
    console.log('❌ package.json 읽기 실패');
}

// 3. 기본 정보
console.log('\n3. 기본 정보:');
console.log('   Node 버전:', process.version);
console.log('   플랫폼:', process.platform);
console.log('   현재 디렉토리:', __dirname);

console.log('\n=== 진단 완료 ===');
