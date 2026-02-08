/**
 * console.log를 logger로 마이그레이션하는 스크립트
 * 사용법: node scripts/migrate-console-logs.js [파일경로]
 */

const fs = require('fs');
const path = require('path');

// 변환 규칙
const replacements = [
    {
        // console.log → logger.debug
        pattern: /console\.log\(/g,
        replacement: 'logger.debug(',
        importNeeded: true
    },
    {
        // console.info → logger.info
        pattern: /console\.info\(/g,
        replacement: 'logger.info(',
        importNeeded: true
    },
    {
        // console.warn → logger.warn
        pattern: /console\.warn\(/g,
        replacement: 'logger.warn(',
        importNeeded: true
    },
    {
        // console.error → logger.error
        pattern: /console\.error\(/g,
        replacement: 'logger.error(',
        importNeeded: true
    }
];

/**
 * 파일에서 console 메서드를 logger로 변환
 * @param {string} filePath - 변환할 파일 경로
 */
function migrateFile(filePath) {
    try {
        let content = fs.readFileSync(filePath, 'utf8');
        let modified = false;
        let needsImport = false;

        // 각 패턴에 대해 치환 수행
        replacements.forEach(({ pattern, replacement, importNeeded }) => {
            if (pattern.test(content)) {
                content = content.replace(pattern, replacement);
                modified = true;
                if (importNeeded) needsImport = true;
            }
        });

        // 수정이 있었다면
        if (modified) {
            // logger import 추가 (아직 없다면)
            if (needsImport && !content.includes('logger')) {
                // 파일 상단에 import 추가
                const importStatement = "import { logger } from '../shared/logger.js';\n";

                // 기존 import 문 뒤에 추가
                const importMatch = content.match(/^(import .+\n)+/m);
                if (importMatch) {
                    const lastImportIndex = importMatch.index + importMatch[0].length;
                    content = content.slice(0, lastImportIndex) + importStatement + content.slice(lastImportIndex);
                } else {
                    // import 문이 없으면 파일 시작 부분에 추가
                    content = importStatement + '\n' + content;
                }
            }

            // 파일 저장
            fs.writeFileSync(filePath, content, 'utf8');
            console.log(`✅ 마이그레이션 완료: ${filePath}`);
            return true;
        } else {
            console.log(`⏭️  변경사항 없음: ${filePath}`);
            return false;
        }
    } catch (error) {
        console.error(`❌ 에러 발생 (${filePath}):`, error.message);
        return false;
    }
}

/**
 * 디렉토리 내 모든 JS 파일 마이그레이션
 * @param {string} dirPath - 디렉토리 경로
 */
function migrateDirectory(dirPath) {
    const files = fs.readdirSync(dirPath);
    let migrated = 0;
    let total = 0;

    files.forEach(file => {
        const fullPath = path.join(dirPath, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory() && !file.startsWith('.') && file !== 'node_modules') {
            const result = migrateDirectory(fullPath);
            migrated += result.migrated;
            total += result.total;
        } else if (file.endsWith('.js') && !file.includes('.min.') && !file.includes('.bundle.')) {
            total++;
            if (migrateFile(fullPath)) {
                migrated++;
            }
        }
    });

    return { migrated, total };
}

/**
 * 사용 통계 출력
 * @param {string} filePath - 파일 경로
 */
function analyzeUsage(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');
    const stats = {
        'console.log': (content.match(/console\.log\(/g) || []).length,
        'console.info': (content.match(/console\.info\(/g) || []).length,
        'console.warn': (content.match(/console\.warn\(/g) || []).length,
        'console.error': (content.match(/console\.error\(/g) || []).length
    };

    return stats;
}

// 메인 실행
if (require.main === module) {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('사용법: node migrate-console-logs.js [파일 또는 디렉토리 경로]');
        console.log('예시: node migrate-console-logs.js src/');
        process.exit(1);
    }

    const targetPath = args[0];

    if (!fs.existsSync(targetPath)) {
        console.error(`경로를 찾을 수 없습니다: ${targetPath}`);
        process.exit(1);
    }

    console.log('🔄 Console 로그 마이그레이션 시작...\n');

    // 분석 모드
    if (args[1] === '--analyze') {
        if (fs.statSync(targetPath).isDirectory()) {
            // 디렉토리 분석은 구현 생략
            console.log('디렉토리 분석은 지원하지 않습니다.');
        } else {
            const stats = analyzeUsage(targetPath);
            console.log('📊 Console 사용 통계:');
            Object.entries(stats).forEach(([method, count]) => {
                if (count > 0) {
                    console.log(`  ${method}: ${count}회`);
                }
            });
        }
    } else {
        // 마이그레이션 실행
        if (fs.statSync(targetPath).isDirectory()) {
            const result = migrateDirectory(targetPath);
            console.log(`\n✅ 마이그레이션 완료!`);
            console.log(`  - 처리된 파일: ${result.migrated}/${result.total}`);
        } else {
            migrateFile(targetPath);
        }
    }
}