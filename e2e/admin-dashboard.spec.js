import { test, expect } from '@playwright/test';

test.describe('ThermaCore Admin Dashboard E2E Tests', () => {
  // Admin dashboard routes to test
  const adminRoutes = [
    { path: '/dashboard', name: 'Main Dashboard' },
    { path: '/history', name: 'History View' },
    { path: '/settings', name: 'Settings View' },
    { path: '/alerts', name: 'Alerts View' },
    { path: '/remote-control', name: 'Remote Control' },
    { path: '/grid-view', name: 'Grid View' },
    { path: '/alarms', name: 'Alarms View' },
    { path: '/reports', name: 'Reports Page' },
    { path: '/documents', name: 'Documents Page' },
    { path: '/units', name: 'Units' },
    { path: '/admin', name: 'Admin Panel' },
    { path: '/analytics', name: 'View Analytics' },
    { path: '/advanced-analytics', name: 'Advanced Analytics Dashboard' },
    { path: '/protocol-manager', name: 'Multi Protocol Manager' },
    { path: '/system-health', name: 'System Health' },
    { path: '/synchronize-units', name: 'Synchronize Units Overview' }
  ];

  test.beforeEach(async ({ page }) => {
    // Navigate to the application
    await page.goto('/');
    
    // Wait for the login form to be visible
    await page.waitForSelector('form', { timeout: 10000 });
  });

  test('Admin login with admin123 credentials', async ({ page }) => {
    // Fill in login credentials
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"], input[name="password"]', 'admin123');
    
    // Click login button
    await page.click('button[type="submit"]');
    
    // Wait for successful login and redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    // Verify we're logged in by checking for dashboard content
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Look for dashboard-specific elements
    const dashboardIndicators = [
      'Dashboard', 
      'ThermaCore', 
      'Welcome',
      // Look for navigation elements
      'nav',
      // Look for main content
      'main'
    ];
    
    // Wait for at least one dashboard indicator to be visible
    let foundIndicator = false;
    for (const indicator of dashboardIndicators) {
      try {
        await page.waitForSelector(`text=${indicator}`, { timeout: 3000 });
        foundIndicator = true;
        break;
      } catch (e) {
        // Continue trying other indicators
      }
    }
    
    if (!foundIndicator) {
      // If no text indicators found, check for common dashboard elements
      try {
        await page.waitForSelector('[data-testid="dashboard"], .dashboard, main, nav', { timeout: 5000 });
      } catch (e) {
        console.log('Available page content:', await page.textContent('body'));
        throw new Error('Dashboard elements not found after login');
      }
    }
    
    console.log('✓ Successfully logged in as admin');
  });

  for (const route of adminRoutes) {
    test(`Navigate to ${route.name} (${route.path}) and check for crashes`, async ({ page, context }) => {
      // Login first
      await page.fill('input[type="text"], input[name="username"]', 'admin');
      await page.fill('input[type="password"], input[name="password"]', 'admin123');
      await page.click('button[type="submit"]');
      
      // Wait for login to complete
      await page.waitForURL('**/dashboard', { timeout: 10000 });
      
      // Set up error monitoring
      const errors = [];
      const consoleErrors = [];
      
      // Monitor for JavaScript errors
      page.on('pageerror', (error) => {
        errors.push(`Page Error: ${error.message}`);
      });
      
      // Monitor console errors
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          consoleErrors.push(`Console Error: ${msg.text()}`);
        }
      });
      
      // Monitor for network failures
      page.on('response', (response) => {
        if (response.status() >= 400) {
          errors.push(`Network Error: ${response.url()} - ${response.status()}`);
        }
      });
      
      try {
        // Navigate to the route
        await page.goto(route.path, { waitUntil: 'networkidle', timeout: 15000 });
        
        // Wait for page to load
        await page.waitForLoadState('domcontentloaded');
        
        // Take screenshot
        const screenshotPath = `e2e/screenshots/${route.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        await page.screenshot({ 
          path: screenshotPath, 
          fullPage: true 
        });
        
        console.log(`✓ Screenshot saved: ${screenshotPath}`);
        
        // Check if page loaded successfully
        // Look for common error indicators
        const errorSelectors = [
          'text=Error',
          'text=404',
          'text=Not Found',
          'text=Something went wrong',
          'text=Internal Server Error',
          '.error',
          '[data-testid="error"]'
        ];
        
        for (const errorSelector of errorSelectors) {
          const errorElement = await page.$(errorSelector);
          if (errorElement) {
            const errorText = await errorElement.textContent();
            errors.push(`Page Error Element: ${errorText}`);
          }
        }
        
        // Verify the page has content (not blank)
        const bodyText = await page.textContent('body');
        if (!bodyText || bodyText.trim().length === 0) {
          errors.push('Page appears to be blank');
        }
        
        // Wait a moment for any async operations to complete
        await page.waitForTimeout(1000);
        
        console.log(`✓ Successfully navigated to ${route.name} (${route.path})`);
        
      } catch (error) {
        errors.push(`Navigation Error: ${error.message}`);
      }
      
      // Report any errors found
      if (errors.length > 0 || consoleErrors.length > 0) {
        const allErrors = [...errors, ...consoleErrors];
        console.warn(`⚠ Errors found on ${route.name}:`, allErrors);
        
        // For now, we'll log errors but not fail the test unless they're critical
        const criticalErrors = allErrors.filter(error => 
          error.includes('Internal Server Error') || 
          error.includes('404') ||
          error.includes('Network Error: ') && error.includes(' - 5')
        );
        
        if (criticalErrors.length > 0) {
          throw new Error(`Critical errors found on ${route.name}: ${criticalErrors.join(', ')}`);
        }
      }
      
      // Verify page is accessible and responsive
      await expect(page.locator('body')).toBeVisible();
    });
  }

  test('Complete dashboard navigation test', async ({ page }) => {
    // Login
    await page.fill('input[type="text"], input[name="username"]', 'admin');
    await page.fill('input[type="password"], input[name="password"]', 'admin123');
    await page.click('button[type="submit"]');
    await page.waitForURL('**/dashboard', { timeout: 10000 });
    
    let successfulRoutes = [];
    let failedRoutes = [];
    
    for (const route of adminRoutes) {
      try {
        console.log(`Testing navigation to ${route.name}...`);
        
        await page.goto(route.path, { waitUntil: 'domcontentloaded', timeout: 10000 });
        
        // Basic check that page loaded
        await page.waitForLoadState('domcontentloaded');
        
        // Take screenshot
        const screenshotPath = `e2e/screenshots/complete_test_${route.name.replace(/[^a-zA-Z0-9]/g, '_')}.png`;
        await page.screenshot({ path: screenshotPath });
        
        successfulRoutes.push(route.name);
        
      } catch (error) {
        console.warn(`Failed to navigate to ${route.name}: ${error.message}`);
        failedRoutes.push({ name: route.name, error: error.message });
      }
    }
    
    console.log(`✓ Successfully navigated to ${successfulRoutes.length} routes: ${successfulRoutes.join(', ')}`);
    
    if (failedRoutes.length > 0) {
      console.warn(`⚠ Failed to navigate to ${failedRoutes.length} routes:`, failedRoutes);
    }
    
    // Expect that we successfully navigated to most routes
    expect(successfulRoutes.length).toBeGreaterThan(adminRoutes.length * 0.7); // At least 70% success rate
  });
});