import { describe, it, expect } from 'vitest';
import { generateUniqueEmail } from './authUtils.js';

describe('authUtils', () => {
    describe('generateUniqueEmail', () => {
        it('should generate a basic email when no existing emails match', () => {
            const email = generateUniqueEmail('John', 'Doe', []);
            expect(email).toBe('john.doe@xcompany.com');
        });

        it('should add a suffix when the base email already exists', () => {
            const existing = ['john.doe@xcompany.com'];
            const email = generateUniqueEmail('John', 'Doe', existing);
            expect(email).toBe('john.doe2@xcompany.com');
        });

        it('should increment the suffix correctly', () => {
            const existing = ['john.doe@xcompany.com', 'john.doe2@xcompany.com'];
            const email = generateUniqueEmail('John', 'Doe', existing);
            expect(email).toBe('john.doe3@xcompany.com');
        });

        it('should handle non-sequential suffixes by taking the max + 1', () => {
            const existing = ['john.doe@xcompany.com', 'john.doe5@xcompany.com'];
            const email = generateUniqueEmail('John', 'Doe', existing);
            expect(email).toBe('john.doe6@xcompany.com');
        });

        it('should handle mixed suffixes correctly', () => {
            const existing = ['john.doe@xcompany.com', 'john.doe2@xcompany.com', 'john.doe10@xcompany.com'];
            const email = generateUniqueEmail('John', 'Doe', existing);
            expect(email).toBe('john.doe11@xcompany.com');
        });

        it('should be case insensitive for names', () => {
            const email = generateUniqueEmail('JOHN', 'doe', []);
            expect(email).toBe('john.doe@xcompany.com');
        });
    });
});
