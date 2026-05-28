import type { Config } from 'jest';
const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/src'],
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    // Route service/route imports of '../../db' and '../db' to the in-memory mock.
    // DB-level tests import from '../index' directly (not '../db' or '../../db'),
    // so they continue to use the real IcosDb and are unaffected by this mapping.
    '^../db$': '<rootDir>/src/db/__mocks__/index.ts',
    '^../../db$': '<rootDir>/src/db/__mocks__/index.ts',
  },
};
export default config;
