# Page Testing Guide - Blank Page Fixes

Quick reference for testing all fixed pages to ensure they render correctly.

## Testing Checklist

### 1. Performance Dashboard/Analytics Page
**Route:** `/advanced-analytics`  
**Access:** Admin users  
**What to Check:**
- [ ] Page loads without blank screen
- [ ] Overview cards display (Active Units, Data Points, etc.)
- [ ] Trends & Performance tab shows charts
- [ ] Anomaly Detection tab displays recent anomalies
- [ ] Alert Analysis tab shows pie chart
- [ ] Unit Comparison tab lists all units

**Key Component:** CardDescription should show chart subtitles

---

### 2. Detailed View Page
**Route:** `/unit-details/:id`  
**Access:** Admin and User  
**What to Check:**
- [ ] Unit header shows status and details
- [ ] Tab navigation displays (Overview, History, Alerts, Client, Remote Control)
- [ ] Overview tab shows unit vitals
- [ ] History tab displays event timeline
- [ ] Alerts tab shows alert history
- [ ] Client tab displays client information
- [ ] Remote Control tab loads (if unit supports it)

**Key Components:** All 6 tab components should render

---

### 3. Remote Control Page
**Route:** Accessed via Unit Details → Remote Control tab  
**Access:** Admin and User (with remote control permissions)  
**What to Check:**
- [ ] Connection status indicator shows
- [ ] Machine Power switch displays
- [ ] Water Production control shows (if unit has water generation)
- [ ] Automatic Control settings visible
- [ ] Live Video Feed section renders
- [ ] Recent Control Actions list displays

**Key Component:** RemoteControl component in UnitDetails

---

### 4. Individual Unit Performance Page
**Route:** `/unit-performance/:id`  
**Access:** Admin and User  
**What to Check:**
- [ ] Back navigation button shows
- [ ] Performance summary cards display
- [ ] Current Power Generation metrics show
- [ ] Financial Impact section renders
- [ ] Financial Assumptions modal opens
- [ ] ROI and Payback Period section displays
- [ ] ROI Assumptions modal works
- [ ] Environmental Impact section shows
- [ ] Environmental Assumptions modal opens
- [ ] Unit Performance metrics display

**Key Components:** All 3 assumption modals should open

---

### 5. Reports Page
**Route:** `/reports`  
**Access:** Admin and User (different views)  
**What to Check:**
- [ ] Page loads without errors
- [ ] Admin users see ReportsView component
- [ ] Regular users see UserReportsView component
- [ ] Report generation options display
- [ ] Report filters work (if implemented)

**Key Components:** Role-based view rendering

---

### 6. SCADA Analytics/Sales Page
**Route:** `/analytics`  
**Access:** Admin  
**What to Check:**
- [ ] Page header displays
- [ ] Summary cards show (Total Sales, Revenue, Active Units, Avg Growth)
- [ ] Zap icon displays in "Avg Growth" card
- [ ] Product Sales Analytics line chart renders
- [ ] Product Categories bar chart shows
- [ ] Product Category Distribution pie chart displays

**Key Component:** Zap icon in metrics cards

---

### 7. Protocol Manager Page
**Route:** `/protocol-manager`  
**Access:** Admin  
**What to Check:**
- [ ] Page loads successfully
- [ ] Protocol status cards display
- [ ] Connection indicators show
- [ ] Refresh button works
- [ ] Protocol metrics display

**Status:** No changes made - already working ✅

---

### 8. Settings Page
**Route:** `/settings`  
**Access:** Admin and User  
**What to Check:**
- [ ] Page header displays
- [ ] Profile Settings section shows
- [ ] Notification Settings renders
- [ ] Display Settings section displays
- [ ] Data Refresh Settings shows
- [ ] Alert Settings section renders
- [ ] Audio Settings displays
- [ ] Save Changes button shows
- [ ] Reset to Default button displays

**Key Components:** All settings sections and buttons should render

---

## Testing Order

Recommended order for efficient testing:

1. **Settings Page** - Simple, quick to verify
2. **Reports Page** - Test both admin and user roles
3. **Scada Analytics Page** - Check all charts render
4. **Protocol Manager** - Verify it still works
5. **Performance Dashboard** - Test all tabs
6. **Unit Performance Page** - Test with a unit ID
7. **Unit Details Page** - Test all tabs
8. **Remote Control** - Test via Unit Details

---

## Testing Commands

### Start Development Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

---

## User Roles for Testing

### Admin User
- Can access all pages
- Test with admin credentials

### Regular User
- Limited access to some pages
- Different view in Reports
- Test with user credentials

---

## Common Issues to Look For

### Visual Issues
- [ ] Components not rendering at all
- [ ] Missing icons or images
- [ ] Layout broken or misaligned
- [ ] Charts not displaying

### Functional Issues
- [ ] Buttons not clickable
- [ ] Modals not opening
- [ ] Data not loading
- [ ] Navigation not working

### Console Errors
- [ ] Import errors
- [ ] Component errors
- [ ] API errors (expected in mock mode)
- [ ] React warnings

---

## Success Criteria

Each page should:
✅ Load without blank screen  
✅ Display header and navigation  
✅ Show all expected sections/components  
✅ Render without console errors  
✅ Be functional (clickable, navigable)  

---

## Reporting Issues

If you find any issues during testing:

1. Note the page/route
2. Describe what's wrong
3. Check browser console for errors
4. Take a screenshot if visual issue
5. Note user role being tested

---

**Last Updated:** 2025-10-19  
**Related:** BLANK_PAGE_FIX_COMPLETE.md
