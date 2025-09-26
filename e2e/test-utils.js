/**
 * Utility functions for Playwright E2E tests
 */

/**
 * Login as admin user
 * @param {import('@playwright/test').Page} page 
 * @param {string} username - Default: 'admin'
 * @param {string} password - Default: 'admin123'
 */
export async function loginAsAdmin(page, username = 'admin', password = 'admin123') {
  await page.goto('/');
  
  // Wait for login form
  await page.waitForSelector('form', { timeout: 10000 });
  
  // Fill credentials
  await page.fill('input[type="text"], input[name="username"]', username);
  await page.fill('input[type="password"], input[name="password"]', password);
  
  // Submit login
  await page.click('button[type="submit"]');
  
  // Wait for redirect to dashboard
  await page.waitForURL('**/dashboard', { timeout: 10000 });
  
  return true;
}

/**
 * Take screenshot with consistent naming
 * @param {import('@playwright/test').Page} page 
 * @param {string} name - Screenshot name
 * @param {boolean} fullPage - Whether to take full page screenshot
 */
export async function takeScreenshot(page, name, fullPage = true) {
  const screenshotPath = `e2e/screenshots/${name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
  await page.screenshot({ 
    path: screenshotPath, 
    fullPage 
  });
  console.log(`📸 Screenshot saved: ${screenshotPath}`);
  return screenshotPath;
}

/**
 * Check for common error indicators on page
 * @param {import('@playwright/test').Page} page 
 */
export async function checkForErrors(page) {
  const errors = [];
  
  // Check for error text
  const errorSelectors = [
    'text=Error',
    'text=404',
    'text=Not Found', 
    'text=Something went wrong',
    'text=Internal Server Error',
    'text=500',
    '.error',
    '[data-testid="error"]',
    '.error-message',
    '.alert-error'
  ];
  
  for (const selector of errorSelectors) {
    try {
      const element = await page.$(selector);
      if (element) {
        const text = await element.textContent();
        if (text && text.trim()) {
          errors.push(`Error element found: ${text.trim()}`);
        }
      }
    } catch (e) {
      // Ignore selector errors
    }
  }
  
  // Check if page is blank
  const bodyText = await page.textContent('body');
  if (!bodyText || bodyText.trim().length < 10) {
    errors.push('Page appears to be blank or has minimal content');
  }
  
  return errors;
}

/**
 * Wait for page to be ready (no loading states)
 * @param {import('@playwright/test').Page} page 
 * @param {number} timeout - Timeout in ms
 */
export async function waitForPageReady(page, timeout = 10000) {
  await page.waitForLoadState('domcontentloaded', { timeout });
  
  // Wait for common loading indicators to disappear
  const loadingSelectors = [
    '.loading',
    '.spinner',
    '[data-testid="loading"]',
    'text=Loading...',
    '.animate-spin'
  ];
  
  for (const selector of loadingSelectors) {
    try {
      await page.waitForSelector(selector, { state: 'hidden', timeout: 3000 });
    } catch (e) {
      // Loading indicator might not be present, continue
    }
  }
  
  // Wait for network to be idle
  try {
    await page.waitForLoadState('networkidle', { timeout: 5000 });
  } catch (e) {
    console.warn('Network did not become idle within timeout');
  }
}

/**
 * Monitor page for JavaScript errors and console errors
 * @param {import('@playwright/test').Page} page 
 */
export function setupErrorMonitoring(page) {
  const errors = [];
  const consoleErrors = [];
  
  // Monitor JavaScript errors
  page.on('pageerror', (error) => {
    errors.push({
      type: 'javascript',
      message: error.message,
      stack: error.stack
    });
  });
  
  // Monitor console errors
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push({
        type: 'console',
        message: msg.text(),
        location: msg.location()
      });
    }
  });
  
  // Monitor network errors
  page.on('response', (response) => {
    if (response.status() >= 400) {
      errors.push({
        type: 'network',
        message: `${response.url()} - ${response.status()} ${response.statusText()}`,
        status: response.status()
      });
    }
  });
  
  return {
    getErrors: () => errors,
    getConsoleErrors: () => consoleErrors,
    getAllErrors: () => [...errors, ...consoleErrors]
  };
}

/**
 * Admin dashboard routes configuration
 */
export const ADMIN_ROUTES = [
  { path: '/dashboard', name: 'Main Dashboard', critical: true },
  { path: '/history', name: 'History View' },
  { path: '/settings', name: 'Settings View' },
  { path: '/alerts', name: 'Alerts View' },
  { path: '/remote-control', name: 'Remote Control' },
  { path: '/grid-view', name: 'Grid View' },
  { path: '/alarms', name: 'Alarms View' },
  { path: '/reports', name: 'Reports Page' },
  { path: '/documents', name: 'Documents Page' },
  { path: '/units', name: 'Units' },
  { path: '/admin', name: 'Admin Panel', critical: true },
  { path: '/analytics', name: 'View Analytics' },
  { path: '/advanced-analytics', name: 'Advanced Analytics Dashboard' },
  { path: '/protocol-manager', name: 'Multi Protocol Manager' },
  { path: '/system-health', name: 'System Health' },
  { path: '/synchronize-units', name: 'Synchronize Units Overview' }
];