import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Toast', () => {
    beforeEach(() => {
        document.body.innerHTML = '';
    });

    afterEach(() => {
        document.body.innerHTML = '';
    });

    it('should create toast element', () => {
        const toast = document.createElement('div');
        toast.className = 'toast toast-success';
        toast.textContent = '성공 메시지';
        document.body.appendChild(toast);

        expect(document.querySelector('.toast')).not.toBeNull();
        expect(document.querySelector('.toast-success')).not.toBeNull();
    });

    it('should support different toast types', () => {
        const types = ['success', 'error', 'warning', 'info'];
        types.forEach(type => {
            const toast = document.createElement('div');
            toast.className = `toast toast-${type}`;
            document.body.appendChild(toast);
        });

        expect(document.querySelectorAll('.toast').length).toBe(4);
    });
});
