const { execSync } = require('child_process');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const checklist = [
    '모든 테스트가 통과했나요?',
    'CHANGELOG.md가 업데이트되었나요?',
    'package.json의 버전이 올바르게 설정되었나요?',
    '커밋되지 않은 변경사항이 없나요?',
    '태그를 생성하고 릴리스할 준비가 되었나요?'
];

function question(rl, query) {
    return new Promise(resolve => rl.question(query, resolve));
}

async function main() {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });

    console.log('\n🚀 릴리스 체크리스트\n');

    for (const item of checklist) {
        const answer = await question(rl, `${item} (y/n): `);
        if (answer.toLowerCase() !== 'y') {
            console.log('\n❌ 릴리스가 취소되었습니다.');
            rl.close();
            process.exit(1);
        }
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'package.json'), 'utf8'));
    const version = packageJson.version;

    console.log(`\n📦 버전 v${version} 릴리스를 준비합니다...\n`);

    try {
        execSync(`git tag -a v${version} -m "Release v${version}"`, { stdio: 'inherit' });
        execSync('git push origin --tags', { stdio: 'inherit' });
        console.log(`\n✅ v${version} 릴리스 완료!`);
    } catch (error) {
        console.error('\n❌ 릴리스 실패:', error.message);
        process.exit(1);
    }

    rl.close();
}

main();
