/**
 * path-security.ts 단위 테스트
 *
 * 테스트 범위:
 * - Path Traversal 공격 패턴 탐지
 * - Null 바이트 인젝션 방지
 * - URL 인코딩된 위험 문자 탐지
 * - 파일명 유효성 검사 (Windows 예약어, 특수문자)
 * - 경로 정규화
 * - 안전한 경로 조합
 */

import { describe, it, expect } from 'vitest';

// Import the module
const {
    PathSecurity
} = await import('../../src/shared/path-security');

describe('path-security.ts', () => {
    describe('Path Traversal Detection', () => {
        it('should detect "../" pattern', () => {
            const result = PathSecurity.checkDangerousPatterns('../etc/passwd');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('상대 경로');
        });

        it('should detect "..\\" pattern (Windows)', () => {
            const result = PathSecurity.checkDangerousPatterns('..\\windows\\system32');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('상대 경로');
        });

        it('should detect URL-encoded "../" (%2e%2e%2f)', () => {
            const result = PathSecurity.checkDangerousPatterns('%2e%2e%2fconfig');
            expect(result.safe).toBe(false);
            expect(result.reason).toBeDefined();
        });

        it('should detect double URL-encoded "../" (%252e)', () => {
            const result = PathSecurity.checkDangerousPatterns('..%252fdata');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('상대 경로');
        });

        it('should detect mixed case URL encoding (%2E%2E)', () => {
            const result = PathSecurity.checkDangerousPatterns('%2E%2E%2Froot');
            expect(result.safe).toBe(false);
            expect(result.reason).toBeDefined();
        });

        it('should allow safe relative paths without ".."', () => {
            const result = PathSecurity.checkDangerousPatterns('data/files/document.txt');
            expect(result.safe).toBe(true);
        });

        it('should allow absolute paths without traversal', () => {
            const result = PathSecurity.checkDangerousPatterns('/home/user/documents/file.txt');
            expect(result.safe).toBe(true);
        });

        it('should allow Windows absolute paths', () => {
            const result = PathSecurity.checkDangerousPatterns('C:\\Users\\Documents\\file.txt');
            expect(result.safe).toBe(true);
        });
    });

    describe('Null Byte Injection Prevention', () => {
        it('should detect null byte in path', () => {
            const result = PathSecurity.checkDangerousPatterns('file.txt\0.png');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('Null 바이트');
        });

        it('should detect null byte in middle of path', () => {
            const result = PathSecurity.checkDangerousPatterns('path/to\0/file');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('Null 바이트');
        });

        it('should allow paths without null bytes', () => {
            const result = PathSecurity.checkDangerousPatterns('safe/path/file.txt');
            expect(result.safe).toBe(true);
        });
    });

    describe('Network Path Prevention', () => {
        it('should block UNC network paths (\\\\server)', () => {
            const result = PathSecurity.checkDangerousPatterns('\\\\malicious-server\\share');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('네트워크 경로');
        });

        it('should allow regular Windows paths', () => {
            const result = PathSecurity.checkDangerousPatterns('C:\\folder\\file.txt');
            expect(result.safe).toBe(true);
        });
    });

    describe('Invalid Input Handling', () => {
        it('should reject empty string', () => {
            const result = PathSecurity.checkDangerousPatterns('');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('유효하지 않은');
        });

        it('should reject null input', () => {
            const result = PathSecurity.checkDangerousPatterns(null as any);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('유효하지 않은');
        });

        it('should reject non-string input', () => {
            const result = PathSecurity.checkDangerousPatterns(123 as any);
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('유효하지 않은');
        });
    });

    describe('Filename Validation', () => {
        it('should accept valid filename', () => {
            const result = PathSecurity.validateFilename('document.txt');
            expect(result.valid).toBe(true);
        });

        it('should accept filename with Korean characters', () => {
            const result = PathSecurity.validateFilename('문서파일.pdf');
            expect(result.valid).toBe(true);
        });

        it('should reject empty filename', () => {
            const result = PathSecurity.validateFilename('');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('비어있습니다');
        });

        it('should reject Windows reserved names (CON)', () => {
            const result = PathSecurity.validateFilename('CON');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('시스템 예약');
        });

        it('should reject Windows reserved names (PRN.txt)', () => {
            const result = PathSecurity.validateFilename('PRN.txt');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('시스템 예약');
        });

        it('should reject Windows reserved names (COM1)', () => {
            const result = PathSecurity.validateFilename('COM1.log');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('시스템 예약');
        });

        it('should reject Windows reserved names (LPT5)', () => {
            const result = PathSecurity.validateFilename('LPT5.dat');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('시스템 예약');
        });

        it('should reject filenames with invalid characters (<>:|?*)', () => {
            const invalidChars = ['<', '>', ':', '"', '|', '?', '*'];
            invalidChars.forEach(char => {
                const result = PathSecurity.validateFilename(`file${char}name.txt`);
                expect(result.valid).toBe(false);
                expect(result.reason).toContain('허용되지 않은 문자');
            });
        });

        it('should reject filenames with control characters', () => {
            const result = PathSecurity.validateFilename('file\x00name.txt');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('허용되지 않은 문자');
        });

        it('should reject filenames longer than 255 characters', () => {
            const longName = 'a'.repeat(256) + '.txt';
            const result = PathSecurity.validateFilename(longName);
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('너무 깁니다');
        });

        it('should accept filename with exactly 255 characters', () => {
            const maxName = 'a'.repeat(251) + '.txt'; // 255 total
            const result = PathSecurity.validateFilename(maxName);
            expect(result.valid).toBe(true);
        });

        it('should reject filename with only dots', () => {
            const result = PathSecurity.validateFilename('...');
            expect(result.valid).toBe(false);
            expect(result.reason).toContain('유효하지 않은');
        });

        it('should accept filename with single dot', () => {
            const result = PathSecurity.validateFilename('.gitignore');
            expect(result.valid).toBe(true);
        });

        it('should accept filename with hyphen and underscore', () => {
            const result = PathSecurity.validateFilename('my-file_name.txt');
            expect(result.valid).toBe(true);
        });

        it('should accept filename with spaces', () => {
            const result = PathSecurity.validateFilename('my file name.txt');
            expect(result.valid).toBe(true);
        });

        it('should accept filename with numbers', () => {
            const result = PathSecurity.validateFilename('file123.txt');
            expect(result.valid).toBe(true);
        });
    });

    describe('Path Normalization', () => {
        it('should convert backslashes to forward slashes', () => {
            const normalized = PathSecurity.normalizePath('path\\to\\file.txt');
            expect(normalized).toBe('path/to/file.txt');
        });

        it('should remove consecutive slashes', () => {
            const normalized = PathSecurity.normalizePath('path//to///file.txt');
            expect(normalized).toBe('path/to/file.txt');
        });

        it('should remove trailing slash (non-root)', () => {
            const normalized = PathSecurity.normalizePath('path/to/folder/');
            expect(normalized).toBe('path/to/folder');
        });

        it('should preserve root slash', () => {
            const normalized = PathSecurity.normalizePath('/');
            expect(normalized).toBe('/');
        });

        it('should handle mixed slashes', () => {
            const normalized = PathSecurity.normalizePath('C:\\Users/Documents\\file.txt');
            expect(normalized).toBe('C:/Users/Documents/file.txt');
        });

        it('should handle empty string', () => {
            const normalized = PathSecurity.normalizePath('');
            expect(normalized).toBe('');
        });

        it('should normalize complex paths', () => {
            const normalized = PathSecurity.normalizePath('//path\\\\to///file//');
            expect(normalized).toBe('/path/to/file');
        });
    });

    describe('Allowed Extension Check', () => {
        it('should allow file with permitted extension', () => {
            const allowed = PathSecurity.checkAllowedExtension('document.pdf', ['pdf', 'txt', 'docx']);
            expect(allowed).toBe(true);
        });

        it('should reject file with forbidden extension', () => {
            const allowed = PathSecurity.checkAllowedExtension('malware.exe', ['pdf', 'txt', 'docx']);
            expect(allowed).toBe(false);
        });

        it('should be case-insensitive', () => {
            const allowed = PathSecurity.checkAllowedExtension('Document.PDF', ['pdf', 'txt']);
            expect(allowed).toBe(true);
        });

        it('should handle files without extension', () => {
            const allowed = PathSecurity.checkAllowedExtension('README', ['pdf', 'txt']);
            expect(allowed).toBe(false);
        });

        it('should allow all extensions when list is empty', () => {
            const allowed = PathSecurity.checkAllowedExtension('any-file.xyz', []);
            expect(allowed).toBe(true);
        });

        it('should handle multiple dots in filename', () => {
            const allowed = PathSecurity.checkAllowedExtension('archive.tar.gz', ['gz']);
            expect(allowed).toBe(true);
        });

        it('should handle filename ending with dot', () => {
            const allowed = PathSecurity.checkAllowedExtension('file.', ['txt']);
            expect(allowed).toBe(false);
        });
    });

    describe('Safe Path Join', () => {
        it('should join safe path components', () => {
            const joined = PathSecurity.safejoin('path', 'to', 'file.txt');
            expect(joined).toBe('path/to/file.txt');
        });

        it('should filter out dangerous components', () => {
            const joined = PathSecurity.safejoin('path', '../etc', 'file.txt');
            expect(joined).toBe('path/file.txt');
        });

        it('should normalize resulting path', () => {
            const joined = PathSecurity.safejoin('path\\', 'to/', 'file.txt');
            expect(joined).toBe('path/to/file.txt');
        });

        it('should filter null bytes', () => {
            const joined = PathSecurity.safejoin('path', 'file\0.txt', 'safe');
            expect(joined).toBe('path/safe');
        });

        it('should handle empty parts', () => {
            const joined = PathSecurity.safejoin('path', '', 'file.txt');
            expect(joined).toBe('path/file.txt');
        });

        it('should handle null parts', () => {
            const joined = PathSecurity.safejoin('path', null as any, 'file.txt');
            expect(joined).toBe('path/file.txt');
        });

        it('should handle single component', () => {
            const joined = PathSecurity.safejoin('file.txt');
            expect(joined).toBe('file.txt');
        });

        it('should handle no components', () => {
            const joined = PathSecurity.safejoin();
            expect(joined).toBe('');
        });

        it('should allow absolute path as first component', () => {
            const joined = PathSecurity.safejoin('/home/user', 'documents', 'file.txt');
            expect(joined).toBe('/home/user/documents/file.txt');
        });

        it('should filter network paths', () => {
            const joined = PathSecurity.safejoin('\\\\server\\share', 'file.txt');
            expect(joined).toBe('file.txt');
        });
    });

    describe('URL Encoding Detection and Decoding', () => {
        it('should detect and decode simple URL encoding', () => {
            const result = PathSecurity.checkDangerousPatterns('%2e%2e%2fconfig');
            expect(result.safe).toBe(false);
        });

        it('should detect recursive URL encoding', () => {
            const result = PathSecurity.checkDangerousPatterns('%252e%252e%252f');
            expect(result.safe).toBe(false);
        });

        it('should handle invalid URL encoding gracefully', () => {
            const result = PathSecurity.checkDangerousPatterns('%ZZ%YY');
            expect(result.safe).toBe(false);
            expect(result.reason).toContain('잘못된 URL 인코딩');
        });

        it('should allow properly encoded safe paths', () => {
            const result = PathSecurity.checkDangerousPatterns('file%20name.txt');
            expect(result.safe).toBe(true);
        });
    });

    describe('Real-World Attack Patterns', () => {
        it('should block classic path traversal', () => {
            const attacks = [
                '../../../etc/passwd',
                '..\\..\\..\\windows\\system32\\config\\sam',
                'file.txt/../../../etc/shadow',
                'uploads/../../../../var/www/html/shell.php'
            ];

            attacks.forEach(attack => {
                const result = PathSecurity.checkDangerousPatterns(attack);
                expect(result.safe).toBe(false);
            });
        });

        it('should block encoded path traversal', () => {
            const attacks = [
                '%2e%2e/%2e%2e/%2e%2e/etc/passwd',
                '..%2F..%2F..%2Fwindows',
                '%2e%2e%5c%2e%2e%5cconfig'
            ];

            attacks.forEach(attack => {
                const result = PathSecurity.checkDangerousPatterns(attack);
                expect(result.safe).toBe(false);
            });
        });

        it('should block double-encoded attacks', () => {
            const result = PathSecurity.checkDangerousPatterns('%252e%252e%252f');
            expect(result.safe).toBe(false);
        });

        it('should allow legitimate file paths', () => {
            const legitimate = [
                'uploads/2026/03/document.pdf',
                'C:/Users/Documents/report.xlsx',
                '/home/user/projects/code.js',
                'data/files/측정결과.json',
                'files/Sample Report (2026-03-09).txt'
            ];

            legitimate.forEach(path => {
                const result = PathSecurity.checkDangerousPatterns(path);
                expect(result.safe).toBe(true);
            });
        });
    });

    describe('Edge Cases', () => {
        it('should handle very long paths', () => {
            const longPath = 'a/'.repeat(1000) + 'file.txt';
            const result = PathSecurity.checkDangerousPatterns(longPath);
            expect(result.safe).toBe(true);
        });

        it('should handle Unicode characters in paths', () => {
            const unicodePath = '경로/파일명/文档/ファイル.txt';
            const result = PathSecurity.checkDangerousPatterns(unicodePath);
            expect(result.safe).toBe(true);
        });

        it('should handle emoji in filenames', () => {
            const result = PathSecurity.validateFilename('file_📄_document_🔒.txt');
            expect(result.valid).toBe(true);
        });

        it('should handle paths with only slashes', () => {
            const result = PathSecurity.checkDangerousPatterns('///');
            expect(result.safe).toBe(true);
        });

        it('should normalize path with only slashes', () => {
            const normalized = PathSecurity.normalizePath('///');
            expect(normalized).toBe('/');
        });
    });

    describe('Module Exports', () => {
        it('should export PathSecurity object', () => {
            expect(PathSecurity).toBeDefined();
            expect(typeof PathSecurity).toBe('object');
        });

        it('should have all required methods', () => {
            expect(typeof PathSecurity.checkDangerousPatterns).toBe('function');
            expect(typeof PathSecurity.validateFilename).toBe('function');
            expect(typeof PathSecurity.normalizePath).toBe('function');
            expect(typeof PathSecurity.checkAllowedExtension).toBe('function');
            expect(typeof PathSecurity.safejoin).toBe('function');
        });
    });
});
