// @ts-check
const { defineConfig, devices } = require('@playwright/test');

/**
 * Playwright E2E 테스트 설정
 * @see https://playwright.dev/docs/test-configuration
 */
module.exports = defineConfig({
    testDir: './tests/e2e',

    // 테스트 실행 설정
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,

    // 리포터 설정
    reporter: 'html',

    // 공통 설정
    use: {
        // 웹 버전 테스트용 기본 URL (docs 폴더 기준)
        baseURL: 'http://localhost:8888',

        // 스크린샷 및 트레이스
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },

    // 프로젝트별 설정
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // 웹 서버 자동 실행 (docs 폴더 서빙)
    webServer: {
        command: 'npx http-server docs -p 8888 -c-1',
        url: 'http://localhost:8888',
        reuseExistingServer: !process.env.CI,
        timeout: 30000,
    },
});
