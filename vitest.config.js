import { defineConfig } from 'vitest/config';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        coverage: {
            provider: 'v8',
            reporter: ['text', 'html'],
            include: ['src/shared/**/*.js'],
            exclude: ['src/shared/tailwind-output.css']
        },
        include: ['tests/unit/**/*.test.js']
    }
});
