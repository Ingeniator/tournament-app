import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{testFilePath}/{arg}{ext}',
  expect: {
    toHaveScreenshot: {
      maxDiffPixelRatio: 0.01,
      animations: 'disabled',
      caret: 'hide',
    },
  },
  use: {
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'runner',
      testDir: './e2e',
      testIgnore: '**/planner/**',
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:5190/play',
        viewport: { width: 390, height: 844 },
      },
    },
    {
      name: 'runner-mobile',
      testDir: './e2e',
      testIgnore: '**/planner/**',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5190/play',
      },
    },
    {
      name: 'runner-tablet',
      testDir: './e2e',
      testIgnore: '**/planner/**',
      use: {
        ...devices['iPad Mini'],
        baseURL: 'http://localhost:5190/play',
      },
    },
    {
      name: 'planner',
      testDir: './e2e/planner',
      use: {
        browserName: 'chromium',
        baseURL: 'http://localhost:5191/plan',
      },
    },
    {
      name: 'planner-mobile',
      testDir: './e2e/planner',
      use: {
        ...devices['iPhone 14'],
        baseURL: 'http://localhost:5191/plan',
      },
    },
    {
      name: 'planner-staging',
      testDir: './e2e/planner',
      use: {
        browserName: 'chromium',
        baseURL: 'https://staging.padelday.net/plan',
      },
    },
  ],
  webServer: [
    {
      command: 'npm -w @padel/runner run dev',
      url: 'http://localhost:5190/play',
      reuseExistingServer: !process.env.CI,
    },
    {
      command: 'npm -w @padel/planner run dev',
      url: 'http://localhost:5191/plan',
      reuseExistingServer: !process.env.CI,
    },
  ],
});
