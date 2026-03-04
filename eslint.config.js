import js from '@eslint/js';

export default [
    js.configs.recommended,
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                // Browser
                window: 'readonly',
                document: 'readonly',
                localStorage: 'readonly',
                console: 'readonly',
                alert: 'readonly',
                confirm: 'readonly',
                fetch: 'readonly',
                FormData: 'readonly',
                Blob: 'readonly',
                File: 'readonly',
                FileReader: 'readonly',
                URL: 'readonly',
                HTMLElement: 'readonly',
                Event: 'readonly',
                XMLHttpRequest: 'readonly',
                setTimeout: 'readonly',
                setInterval: 'readonly',
                clearTimeout: 'readonly',
                clearInterval: 'readonly',

                // Node.js (for Electron main/preload)
                process: 'readonly',
                __dirname: 'readonly',
                __filename: 'readonly',
                module: 'readonly',
                require: 'readonly',
                global: 'readonly',
                Buffer: 'readonly',

                // Custom globals
                firebase: 'readonly',
                showToast: 'readonly',
                logger: 'readonly',

                // Browser APIs
                sessionStorage: 'readonly',
                crypto: 'readonly',
                requestAnimationFrame: 'readonly',
                cancelAnimationFrame: 'readonly',
                navigator: 'readonly',
                TextEncoder: 'readonly',
                TextDecoder: 'readonly',
                btoa: 'readonly',
                atob: 'readonly',
                Element: 'readonly',
                DOMException: 'readonly',
                CustomEvent: 'readonly',
                ResizeObserver: 'readonly',
                AbortController: 'readonly',

                // Third-party libraries
                XLSX: 'readonly',
                DOMPurify: 'readonly',

                // App globals (exported by shared modules)
                SampleUtils: 'readonly',
                sanitizeHTML: 'readonly',
                escapeHTML: 'readonly',
                SIDO_PATTERN: 'readonly',
                REGION_NAMES: 'readonly',
                CROP_DATA: 'readonly',
                CROP_CATEGORIES: 'readonly',
                suggestRegionVillages: 'readonly',
                parseParcelAddress: 'readonly',
                parseAddressParts: 'readonly',
                ExcelImportManager: 'readonly',
                BaseSampleManager: 'readonly',
                CryptoUtils: 'readonly',
                loadingManager: 'readonly',
                NetworkAccess: 'readonly',
                ErrorHandler: 'readonly',
                CacheManager: 'readonly',
                bonghwaData: 'readonly',
                kakao: 'readonly'
            }
        },
        rules: {
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
            'no-console': 'off',
            'prefer-const': 'error',
            'no-var': 'error'
        }
    },
    {
        ignores: [
            'node_modules/',
            'dist/',
            'out/',
            'docs/',
            '**/*.min.js'
        ]
    }
];
