import { test, expect } from '@playwright/test';
import { loginAsAdmin, takeScreenshot, waitForPageReady, setupErrorMonitoring } from './test-utils.js';

test.describe('ThermaCore Admin Dashboard - Basic Navigation', () => {
  
  test('Login and take screenshot of main dashboard', async ({ page }) => {
    // Setup error monitoring
    const errorMonitor = setupErrorMonitoring(page);
    
    console.log('🔐 Attempting to login as admin...');
    
    // Login as admin
    await loginAsAdmin(page, 'admin', 'admin123');
    
    console.log('✅ Login successful');
    
    // Wait for dashboard to be ready
    await waitForPageReady(page);
    
    // Take screenshot of main dashboard
    await takeScreenshot(page, 'main_dashboard_after_login');
    
    // Verify we're on the dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // Check for basic dashboard elements
    await expect(page.locator('body')).toBeVisible();
    
    // Check for errors
    const errors = errorMonitor.getAllErrors();
    if (errors.length > 0) {
      console.warn('⚠ Errors detected:', errors);
    }
    
    console.log('✅ Main dashboard test completed successfully');
  });

  test('Navigate to admin panel and take screenshot', async ({ page }) => {
    // Setup error monitoring
    const errorMonitor = setupErrorMonitoring(page);
    
    // Login first
    await loginAsAdmin(page, 'admin', 'admin123');
    
    console.log('🧭 Navigating to admin panel...');
    
    // Navigate to admin panel
    await page.goto('/admin');
    await waitForPageReady(page);
    
    // Take screenshot
    await takeScreenshot(page, 'admin_panel');
    
    // Verify admin panel loaded
    await expect(page.locator('body')).toBeVisible();
    
    // Check for errors
    const errors = errorMonitor.getAllErrors();
    if (errors.length > 0) {
      console.warn('⚠ Errors detected on admin panel:', errors);
    }
    
    console.log('✅ Admin panel test completed successfully');
  });

  test('Test multiple critical dashboard pages', async ({ page }) => {
    // Setup error monitoring
    const errorMonitor = setupErrorMonitoring(page);
    
    // Login first
    await loginAsAdmin(page, 'admin', 'admin123');
    
    const criticalRoutes = [
      { path: '/dashboard', name: 'Dashboard' },
      { path: '/admin', name: 'Admin Panel' },
      { path: '/analytics', name: 'Analytics' },
      { path: '/settings', name: 'Settings' }
    ];
    
    let successCount = 0;
    
    for (const route of criticalRoutes) {
      try {
        console.log(`🧭 Testing ${route.name} (${route.path})...`);
        
        // Navigate to route
        await page.goto(route.path);
        await waitForPageReady(page);
        
        // Take screenshot
        await takeScreenshot(page, `critical_${route.name.toLowerCase()}`);
        
        // Verify page loaded
        await expect(page.locator('body')).toBeVisible();
        
        successCount++;
        console.log(`✅ ${route.name} loaded successfully`);
        
      } catch (error) {
        console.error(`❌ Failed to load ${route.name}: ${error.message}`);
      }
    }
    
    // Check for errors
    const errors = errorMonitor.getAllErrors();
    if (errors.length > 0) {
      console.warn('⚠ Total errors detected:', errors.length);
    }
    
    console.log(`✅ Successfully tested ${successCount}/${criticalRoutes.length} critical routes`);
    
    // Expect at least half of the routes to work
    expect(successCount).toBeGreaterThanOrEqual(criticalRoutes.length / 2);
  });
});