jest.mock('aws-sdk', () => ({
  config: { update: jest.fn() },
  S3: jest.fn()
}));
jest.mock('../fetchers/ncaa_2021', () => jest.fn());

const { getFirstFourDates, isFirstFourGameTime, shouldCheckNow } = require('../update-live-bracket');

describe('update-live-bracket', () => {
  describe('getFirstFourDates', () => {
    test('should return the Tuesday and Wednesday after Selection Sunday', () => {
      // Selection Sunday 2024 is March 17; First Four should be March 19 (Tue) and March 20 (Wed)
      const dates = getFirstFourDates(2024);
      expect(dates).toHaveLength(2);
      expect(dates[0].getUTCMonth()).toBe(2);  // March (0-indexed)
      expect(dates[0].getUTCDate()).toBe(19);  // March 19
      expect(dates[0].getUTCDay()).toBe(2);    // Tuesday
      expect(dates[1].getUTCMonth()).toBe(2);  // March
      expect(dates[1].getUTCDate()).toBe(20);  // March 20
      expect(dates[1].getUTCDay()).toBe(3);    // Wednesday
    });

    test('should always return a Tuesday and a Wednesday', () => {
      for (let year = 2020; year <= 2030; year++) {
        const dates = getFirstFourDates(year);
        expect(dates[0].getUTCDay()).toBe(2);  // Tuesday
        expect(dates[1].getUTCDay()).toBe(3);  // Wednesday
      }
    });
  });

  describe('isFirstFourGameTime', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true on First Four Tuesday at 9pm Eastern (1am UTC Wednesday)', () => {
      // March 19, 2024 (Tue) at 9pm ET = March 20, 2024 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-20T01:00:00Z'));
      expect(isFirstFourGameTime()).toBe(true);
    });

    test('should return true on First Four Wednesday at 9pm Eastern (1am UTC Thursday)', () => {
      // March 20, 2024 (Wed) at 9pm ET = March 21, 2024 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-21T01:00:00Z'));
      expect(isFirstFourGameTime()).toBe(true);
    });

    test('should return true on First Four Wednesday at 1am Eastern (5am UTC Thursday)', () => {
      // March 20, 2024 (Wed) at 1am ET = March 21, 2024 at 05:00 UTC
      jest.setSystemTime(new Date('2024-03-21T05:00:00Z'));
      expect(isFirstFourGameTime()).toBe(true);
    });

    test('should return false at 3am Eastern after a First Four game (past 2am cutoff)', () => {
      // March 20, 2024 (Wed) at 3am ET = March 21, 2024 at 07:00 UTC
      jest.setSystemTime(new Date('2024-03-21T07:00:00Z'));
      expect(isFirstFourGameTime()).toBe(false);
    });

    test('should return false at 3pm Eastern on a First Four Tuesday (games not started yet)', () => {
      // March 19, 2024 (Tue) at 3pm ET = March 19, 2024 at 19:00 UTC
      jest.setSystemTime(new Date('2024-03-19T19:00:00Z'));
      expect(isFirstFourGameTime()).toBe(false);
    });

    test('should return false on a regular Tuesday in March (not a First Four date)', () => {
      // March 12, 2024 (Tue, one week before First Four) at 9pm ET = March 13 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-13T01:00:00Z'));
      expect(isFirstFourGameTime()).toBe(false);
    });

    test('should return false on a Thursday evening during the main tournament', () => {
      // March 21, 2024 (Thu) at 9pm ET = March 22, 2024 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-22T01:00:00Z'));
      expect(isFirstFourGameTime()).toBe(false);
    });
  });

  describe('shouldCheckNow', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should return true on First Four Tuesday evening (previously blocked)', () => {
      // March 19, 2024 (Tue) at 9pm ET = March 20 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-20T01:00:00Z'));
      expect(shouldCheckNow()).toBe(true);
    });

    test('should return true on First Four Wednesday evening (previously blocked)', () => {
      // March 20, 2024 (Wed) at 9pm ET = March 21 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-21T01:00:00Z'));
      expect(shouldCheckNow()).toBe(true);
    });

    test('should return false on First Four Tuesday afternoon (games not started)', () => {
      // March 19, 2024 (Tue) at 3pm ET = March 19 at 19:00 UTC
      jest.setSystemTime(new Date('2024-03-19T19:00:00Z'));
      expect(shouldCheckNow()).toBe(false);
    });

    test('should return false in January (outside tournament season)', () => {
      jest.setSystemTime(new Date('2024-01-15T01:00:00Z'));
      expect(shouldCheckNow()).toBe(false);
    });

    test('should return true on a normal tournament Thursday evening', () => {
      // March 21, 2024 (Thu) at 9pm ET = March 22 at 01:00 UTC
      jest.setSystemTime(new Date('2024-03-22T01:00:00Z'));
      expect(shouldCheckNow()).toBe(true);
    });
  });
});
