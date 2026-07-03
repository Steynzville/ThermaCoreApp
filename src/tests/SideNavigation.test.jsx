Skip to content
ThermaCoreApp
Repository navigation
Code
Issues
Pull requests
Frontend Coverage Report
Update SideNavigation.test.jsx #218
frontend-coverage
Started 1m 10s ago
2s
2s
5s
1s
1s
3s
2s
53s
 ✓ src/tests/UnitPerformance.test.jsx (33 tests) 5542ms 181 MB heap used
   ✓ UnitPerformance > Component Rendering > should show back button  498ms
   ✓ UnitPerformance > ROI and Financial Metrics > should display financial assumptions  411ms
   ✓ UnitPerformance > Navigation > should navigate back when back button clicked  1491ms
   ✓ UnitPerformance > Accessibility > should have clickable back button  1801ms
 ✓ src/tests/IndustrialGauge.test.jsx (47 tests | 1 skipped) 1380ms 206 MB heap used
   ✓ IndustrialGauge > Component Props > should handle different precision values  371ms
 ✓ src/tests/Settings.test.jsx (28 tests) 480ms 215 MB heap used
   ✓ DataRefreshSettings > should render data refresh settings  308ms
 ✓ src/tests/EnhancedStatusDial.test.jsx (40 tests) 269ms 222 MB heap used
 ✓ src/tests/alertService.test.js (30 tests) 61ms 231 MB heap used
 ✓ src/tests/AlarmsView.test.jsx (36 tests | 1 skipped) 595ms 244 MB heap used
 ✓ src/tests/protocolWebSocketService.test.js (37 tests) 428ms 250 MB heap used
 ✓ src/hooks/useUserManagement.test.js (20 tests) 1147ms 242 MB heap used
 ✓ src/tests/ReportsView.test.jsx (28 tests) 449ms 262 MB heap used
 ✓ src/tests/VitalSignGraph.test.jsx (29 tests) 276ms 265 MB heap used
 ✓ src/hooks/usePasswordManagement.test.js (24 tests) 89ms 269 MB heap used
 ✓ src/utils/apiFetch.test.js (25 tests) 180ms 277 MB heap used
 ✓ src/tests/analyticsService.test.js (28 tests) 81ms 266 MB heap used
 ✓ src/tests/chartConfigurations.test.js (44 tests) 95ms 273 MB heap used
 ✓ src/services/unitService.test.js (41 tests) 93ms 278 MB heap used
 ✓ src/tests/QuickActionCard.test.jsx (27 tests) 463ms 279 MB heap used
 ✓ src/tests/AlertsView.test.jsx (25 tests | 4 skipped) 965ms 306 MB heap used
 ✓ src/hooks/useRemoteControl.test.js (15 tests) 63ms 312 MB heap used
 ❯ src/tests/SideNavigation.test.jsx (20 tests | 4 failed) 1529ms 348 MB heap used
   ✓ SideNavigation > Rendering > should render navigation component 58ms
   ✓ SideNavigation > Rendering > should render all navigation items for admin user  313ms
   × SideNavigation > Rendering > should show 'My Units' label for regular users 101ms
     → expected 2 to be +0 // Object.is equality
   × SideNavigation > Rendering > should hide admin-only items for regular users 61ms
     → expected 2 to be +0 // Object.is equality
   ✓ SideNavigation > Rendering > should show badges for alerts and alarms 102ms
   ✓ SideNavigation > Role-Based Rendering > should show analytics menu for users with permission 65ms
   × SideNavigation > Role-Based Rendering > should hide analytics menu for users without permission 59ms
     → expected 4 to be +0 // Object.is equality
   ✓ SideNavigation > Role-Based Rendering > should show protocol manager for users with permission 63ms
   ✓ SideNavigation > Collapsed State > should hide labels when collapsed 20ms
   ✓ SideNavigation > Collapsed State > should show labels when expanded 128ms
   ✓ SideNavigation > Navigation > should render navigation buttons 21ms
   ✓ SideNavigation > Navigation > should navigate on item click 75ms
   × SideNavigation > Logout > should call logout when logout button is clicked 73ms
     → expected "spy" to be called at least once
   ✓ SideNavigation > Logout > should play logout sound when logging out 71ms
   ✓ SideNavigation > Mobile Navigation > should render mobile toggle button 40ms
   ✓ SideNavigation > Mobile Navigation > should toggle mobile menu 23ms
   ✓ SideNavigation > Unit Counts > should show correct unit count for admin 82ms
   ✓ SideNavigation > Unit Counts > should show limited unit count for regular user 71ms
   ✓ SideNavigation > Accessibility > should have proper button types 22ms
   ✓ SideNavigation > Accessibility > should render navigation items as buttons for keyboard accessibility 78ms
 ✓ src/tests/chartDataTransforms.test.js (35 tests) 87ms 340 MB heap used
