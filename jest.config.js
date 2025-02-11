/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.test.json',
      useESM: true
    }]
  },
  transformIgnorePatterns: [
    '/node_modules/(?!@anthropic-ai)'
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/app/$1'
  },
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  testPathIgnorePatterns: ['<rootDir>/.next/', '<rootDir>/node_modules/'],
  extensionsToTreatAsEsm: ['.ts', '.tsx']
};
