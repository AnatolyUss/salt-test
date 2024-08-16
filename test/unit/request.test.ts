import { describe, it, expect } from '@jest/globals';

import { RequestService } from '../../src/service/request.service';

describe('request service unit tests', (): void => {
  describe('isAuthToken tests', (): void => {
    it('should determine, that "Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca" is valid Auth-Token', (): void => {
      const token = 'Bearer ebb3cbbe938c4776bd22a4ec2ea8b2ca';
      const result = new RequestService().isAuthToken(token);
      expect(result).toBe(true);
    });

    it('should determine, that "Bearerebb3cbbe938c4776bd22a4ec2ea8b2ca" is not valid Auth-Token', (): void => {
      const token = 'Bearerebb3cbbe938c4776bd22a4ec2ea8b2ca';
      const result = new RequestService().isAuthToken(token);
      expect(result).toBe(false);
    });
  });

  describe('UUID tests', (): void => {
    it('should determine, that "6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b" is valid UUID', (): void => {
      const uuid = '6ec0bd7f-11c0-43da-975e-2a8ad9ebae0b';
      const result = new RequestService().isUUID(uuid);
      expect(result).toBe(true);
    });

    it('should determine, that "6ec0bd7f11c0_43da!975e@2a8ad9ebae0b" is not valid UUID', (): void => {
      const uuid = '6ec0bd7f11c0_43da!975e@2a8ad9ebae0b';
      const result = new RequestService().isUUID(uuid);
      expect(result).toBe(false);
    });
  });

  describe('isEmail tests', (): void => {
    it('should determine, that "foo@bar.com" is valid email', (): void => {
      const email = 'foo@bar.com';
      const result = new RequestService().isEmail(email);
      expect(result).toBe(true);
    });

    it('should determine, that "foo@@bar.com" is not valid email', (): void => {
      const email = 'foo@@bar.com';
      const result = new RequestService().isEmail(email);
      expect(result).toBe(false);
    });

    it('should determine, that "@bar.com" is not valid email', (): void => {
      const email = '@bar.com';
      const result = new RequestService().isEmail(email);
      expect(result).toBe(false);
    });
  });

  describe('isDate tests', (): void => {
    it('should determine, that "31-07-2023" is valid date string', (): void => {
      const date = '31-07-2023';
      const result = new RequestService().isDate(date);
      expect(result).toBe(true);
    });

    it('should determine, that "31_07-2023" is not valid date string', (): void => {
      const date = '31_07-2023';
      const result = new RequestService().isDate(date);
      expect(result).toBe(false);
    });

    it('should determine, that "31_07_2023" is not valid date string', (): void => {
      const date = '31_07_2023';
      const result = new RequestService().isDate(date);
      expect(result).toBe(false);
    });

    it('should determine, that "3i_o7_20Q3" is not valid date string', (): void => {
      const date = '3i_o7_20Q3';
      const result = new RequestService().isDate(date);
      expect(result).toBe(false);
    });
  });
});
