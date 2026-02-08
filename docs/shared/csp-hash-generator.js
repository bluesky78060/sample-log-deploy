/**
 * CSP 해시 생성 유틸리티
 * 인라인 스크립트와 스타일의 SHA-256 해시를 생성하여
 * Content-Security-Policy에서 unsafe-inline 대신 사용할 수 있도록 함
 */

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * 인라인 스크립트/스타일의 SHA-256 해시 생성
 * @param {string} content - 스크립트 또는 스타일 내용
 * @returns {string} - 'sha256-' 접두어가 붙은 base64 해시
 */
function generateCSPHash(content) {
    const hash = crypto.createHash('sha256');
    hash.update(content, 'utf8');
    return `'sha256-${hash.digest('base64')}'`;
}

/**
 * HTML 파일에서 인라인 스크립트와 스타일 추출 및 해시 생성
 * @param {string} htmlPath - HTML 파일 경로
 * @returns {Object} - { scripts: [], styles: [] } 형태의 해시 목록
 */
function extractInlineContentHashes(htmlPath) {
    const html = fs.readFileSync(htmlPath, 'utf8');
    const hashes = {
        scripts: [],
        styles: []
    };

    // 인라인 스크립트 추출 (태그 내부 스크립트)
    const scriptRegex = /<script[^>]*>([^<]+)<\/script>/g;
    let scriptMatch;
    while ((scriptMatch = scriptRegex.exec(html)) !== null) {
        const content = scriptMatch[1].trim();
        if (content && !scriptMatch[0].includes('src=')) {
            hashes.scripts.push({
                content: content.substring(0, 50) + '...', // 미리보기용
                hash: generateCSPHash(content)
            });
        }
    }

    // 인라인 스타일 추출 (태그 내부 스타일)
    const styleRegex = /<style[^>]*>([^<]+)<\/style>/g;
    let styleMatch;
    while ((styleMatch = styleRegex.exec(html)) !== null) {
        const content = styleMatch[1].trim();
        if (content) {
            hashes.styles.push({
                content: content.substring(0, 50) + '...', // 미리보기용
                hash: generateCSPHash(content)
            });
        }
    }

    // onclick, onload 등 이벤트 핸들러 속성도 검사
    const eventHandlerRegex = /on\w+\s*=\s*["']([^"']+)["']/g;
    let eventMatch;
    while ((eventMatch = eventHandlerRegex.exec(html)) !== null) {
        console.warn(`경고: 인라인 이벤트 핸들러 발견 - ${eventMatch[0]}`);
        console.warn('보안을 위해 addEventListener로 대체하는 것을 권장합니다.');
    }

    return hashes;
}

/**
 * 프로젝트의 모든 HTML 파일에서 인라인 콘텐츠 해시 생성
 * @param {string} projectRoot - 프로젝트 루트 경로
 * @returns {Object} - 파일별 해시 목록
 */
function generateProjectCSPHashes(projectRoot) {
    const results = {};
    const htmlFiles = [];

    // HTML 파일 찾기
    function findHtmlFiles(dir) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const filePath = path.join(dir, file);
            const stat = fs.statSync(filePath);

            if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
                findHtmlFiles(filePath);
            } else if (file.endsWith('.html')) {
                htmlFiles.push(filePath);
            }
        }
    }

    findHtmlFiles(projectRoot);

    // 각 HTML 파일 처리
    for (const htmlFile of htmlFiles) {
        const relativePath = path.relative(projectRoot, htmlFile);
        const hashes = extractInlineContentHashes(htmlFile);

        if (hashes.scripts.length > 0 || hashes.styles.length > 0) {
            results[relativePath] = hashes;
        }
    }

    return results;
}

/**
 * CSP 해시를 포함한 정책 문자열 생성
 * @param {Object} hashResults - generateProjectCSPHashes의 결과
 * @returns {Object} - { scriptSrc: string, styleSrc: string }
 */
function buildCSPWithHashes(hashResults) {
    const scriptHashes = new Set();
    const styleHashes = new Set();

    // 모든 파일의 해시 수집
    for (const file in hashResults) {
        hashResults[file].scripts.forEach(s => scriptHashes.add(s.hash));
        hashResults[file].styles.forEach(s => styleHashes.add(s.hash));
    }

    const baseScriptSrc = "'self' file: https://cdn.tailwindcss.com https://www.gstatic.com https://cdn.sheetjs.com https://t1.daumcdn.net https://cdnjs.cloudflare.com";
    const baseStyleSrc = "'self' file: https://fonts.googleapis.com";

    return {
        scriptSrc: `${baseScriptSrc} ${Array.from(scriptHashes).join(' ')}`,
        styleSrc: `${baseStyleSrc} ${Array.from(styleHashes).join(' ')}`
    };
}

// CLI 사용을 위한 메인 함수
if (require.main === module) {
    const projectRoot = process.argv[2] || path.join(__dirname, '..');
    console.log('CSP 해시 생성 중...\n');

    const results = generateProjectCSPHashes(projectRoot);

    console.log('=== 인라인 콘텐츠 발견 ===\n');
    for (const file in results) {
        console.log(`파일: ${file}`);
        if (results[file].scripts.length > 0) {
            console.log('  스크립트:');
            results[file].scripts.forEach(s => {
                console.log(`    - ${s.content}`);
                console.log(`      해시: ${s.hash}`);
            });
        }
        if (results[file].styles.length > 0) {
            console.log('  스타일:');
            results[file].styles.forEach(s => {
                console.log(`    - ${s.content}`);
                console.log(`      해시: ${s.hash}`);
            });
        }
        console.log('');
    }

    const cspConfig = buildCSPWithHashes(results);
    console.log('=== 권장 CSP 설정 ===\n');
    console.log(`script-src: ${cspConfig.scriptSrc}\n`);
    console.log(`style-src: ${cspConfig.styleSrc}\n`);

    // 파일로 저장
    const outputPath = path.join(projectRoot, 'csp-hashes.json');
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\n해시 목록이 ${outputPath}에 저장되었습니다.`);
}

module.exports = {
    generateCSPHash,
    extractInlineContentHashes,
    generateProjectCSPHashes,
    buildCSPWithHashes
};