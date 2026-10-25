import { describe, it, expect } from 'vitest';
import { CLASS_OPTIONS } from '@/lib/india-data';
import { mergeSubjects } from '@/lib/profile-subjects';

describe('Profile choices', () => {
  it('includes senior secondary class', () => { expect(CLASS_OPTIONS).toContain('11th or 12th'); });
  it('saves written subjects alongside selected subjects', () => { expect(mergeSubjects(['Physics'], ' Robotics, Design\nAstronomy ')).toBe('Physics, Robotics, Design, Astronomy'); });
  it('allows custom subjects without predefined selections', () => { expect(mergeSubjects([], 'Robotics')).toBe('Robotics'); });
});