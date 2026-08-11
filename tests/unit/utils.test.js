import { describe, it, expect } from 'vitest';

describe('Utility Functions', () => {
    describe('Date Formatting', () => {
        it('should format date correctly', () => {
            const date = new Date('2026-03-04');
            const formatted = date.toISOString().split('T')[0];
            expect(formatted).toBe('2026-03-04');
        });
    });

    describe('Number Formatting', () => {
        it('should format numbers with commas', () => {
            const num = 1234567;
            const formatted = num.toLocaleString('ko-KR');
            expect(formatted).toBe('1,234,567');
        });
    });

    describe('String Sanitization', () => {
        it('should escape HTML entities', () => {
            const input = '<script>alert("xss")</script>';
            const escaped = input
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;');
            expect(escaped).not.toContain('<script>');
        });
    });
});
