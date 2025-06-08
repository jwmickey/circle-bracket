import {
  findTeamByCode,
  scaleDims,
  calcImageBox,
  getSelectionSunday
} from '../js/utils';

// Mock the teams data
jest.mock('../data/teams.json', () => ({
  UNC: {
    name: 'North Carolina',
    primaryColor: '#7BAFD4',
    logo: {
      url: 'img/logos/unc.svg',
      background: '#FFFFFF'
    }
  },
  DUKE: {
    name: 'Duke',
    primaryColor: '#003087',
    logo: {
      url: 'img/logos/duke.svg',
      background: '#FFFFFF'
    },
    alternates: ['duke', 'DOOK']
  },
  UK: {
    name: 'Kentucky',
    primaryColor: '#0033A0',
    logo: {
      url: 'img/logos/uk.svg',
      background: '#FFFFFF'
    },
    alternates: 'kentucky'
  }
}), { virtual: true });

describe('Utils', () => {
  describe('findTeamByCode', () => {
    test('should find team by exact code match', () => {
      const team = findTeamByCode('UNC');
      expect(team).toBeDefined();
      expect(team.name).toBe('North Carolina');
    });

    test('should find team by alternate code (array)', () => {
      const team = findTeamByCode('duke');
      expect(team).toBeDefined();
      expect(team.name).toBe('Duke');
    });

    test('should find team by alternate code (string)', () => {
      const team = findTeamByCode('kentucky');
      expect(team).toBeDefined();
      expect(team.name).toBe('Kentucky');
    });

    test('should return undefined for non-existent team', () => {
      const team = findTeamByCode('NONEXISTENT');
      expect(team).toBeUndefined();
    });

    test('should handle case-sensitive alternate matching', () => {
      const team = findTeamByCode('duke'); // Use lowercase which should work with the alternates
      expect(team).toBeDefined();
      expect(team.name).toBe('Duke');
    });
  });

  describe('scaleDims', () => {
    test('should scale down large dimensions to fit within max bounds', () => {
      const [width, height] = scaleDims(1000, 800, 100, 100);
      expect(width).toBe(100);
      expect(height).toBe(80);
    });

    test('should scale up small dimensions to fit max bounds', () => {
      const [width, height] = scaleDims(50, 40, 100, 100);
      expect(width).toBe(100);
      expect(height).toBe(80);
    });

    test('should maintain aspect ratio', () => {
      const originalRatio = 200 / 100; // 2:1
      const [width, height] = scaleDims(200, 100, 50, 50);
      const scaledRatio = width / height;
      expect(scaledRatio).toBeCloseTo(originalRatio, 2);
    });

    test('should handle square dimensions', () => {
      const [width, height] = scaleDims(100, 100, 50, 50);
      expect(width).toBe(50);
      expect(height).toBe(50);
    });

    test('should floor the results', () => {
      const [width, height] = scaleDims(33, 33, 100, 100);
      expect(width).toBe(100);
      expect(height).toBe(100);
      expect(Number.isInteger(width)).toBe(true);
      expect(Number.isInteger(height)).toBe(true);
    });
  });

  describe('calcImageBox', () => {
    test('should calculate image box for given parameters', () => {
      const result = calcImageBox(200, 100, 400, 300, 8, 0);
      
      expect(result).toHaveProperty('x');
      expect(result).toHaveProperty('y');
      expect(result).toHaveProperty('maxWidth');
      expect(result).toHaveProperty('maxHeight');
      
      expect(typeof result.x).toBe('number');
      expect(typeof result.y).toBe('number');
      expect(typeof result.maxWidth).toBe('number');
      expect(typeof result.maxHeight).toBe('number');
    });

    test('should return consistent results for same inputs', () => {
      const result1 = calcImageBox(200, 100, 400, 300, 8, 0);
      const result2 = calcImageBox(200, 100, 400, 300, 8, 0);
      
      expect(result1).toEqual(result2);
    });
  });

  describe('getSelectionSunday', () => {
    test('should calculate Selection Sunday for a given year', () => {
      const selectionSunday2024 = getSelectionSunday(2024);
      expect(selectionSunday2024).toBeInstanceOf(Date);
      expect(selectionSunday2024.getFullYear()).toBe(2024);
      expect(selectionSunday2024.getMonth()).toBe(2); // March (0-indexed)
    });

    test('should return different dates for different years', () => {
      const ss2023 = getSelectionSunday(2023);
      const ss2024 = getSelectionSunday(2024);
      expect(ss2023.getTime()).not.toBe(ss2024.getTime());
    });

    test('should always return a Sunday', () => {
      for (let year = 2020; year <= 2025; year++) {
        const selectionSunday = getSelectionSunday(year);
        expect(selectionSunday.getDay()).toBe(0); // Sunday is 0
      }
    });
  });
});
