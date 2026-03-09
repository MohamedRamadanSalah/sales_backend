module.exports = {
    testEnvironment: 'node',
    verbose: true,
    clearMocks: true,
    setupFiles: ['dotenv/config'],
    testMatch: ['**/tests/**/*.test.js'],
    setupFilesAfterEnv: ['./tests/setup.js'],
    // Force test database usage
    globals: {
        NODE_ENV: 'test',
    },
};

