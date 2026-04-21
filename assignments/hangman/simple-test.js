import { describe, it, expect } from 'vitest';

describe('simple test', () => {
  it('should have access to document', () => {
    console.log('document exists:', typeof document !== 'undefined');
    console.log('document.body:', document?.body);
    expect(typeof document).toBe('object');
  });
  
  it('should have access to localStorage', () => {
    console.log('localStorage exists:', typeof localStorage !== 'undefined');
    expect(typeof localStorage).toBe('object');
  });
});