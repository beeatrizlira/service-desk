import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  expect: {
    timeout: 10_000,
  },
  fullyParallel: false,
  retries: process.env['CI'] ? 1 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4200',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: [
    {
      command: 'npm run start:dev',
      cwd: '../backend',
      url: 'http://localhost:3001/api/auth/health',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        JWT_SECRET: 'test-jwt-secret',
        DATABASE_PATH: ':memory:',
      },
    },
    {
      command: 'npm start',
      cwd: '.',
      url: 'http://localhost:4200/login',
      reuseExistingServer: !process.env['CI'],
      timeout: 120_000,
    },
  ],
});
