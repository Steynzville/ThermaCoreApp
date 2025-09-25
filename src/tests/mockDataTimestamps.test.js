import { describe, it, expect } from 'vitest';
import { mockEventHistory, mockRecentActions } from '../mockData.js';

describe('Mock Data Timestamp Generation', () => {
  it('should generate chronologically ordered timestamps for event history', () => {
    // Verify that events are ordered chronologically (oldest to newest)
    for (let i = 1; i < mockEventHistory.length; i++) {
      const previousTime = new Date(mockEventHistory[i - 1].timestamp).getTime();
      const currentTime = new Date(mockEventHistory[i].timestamp).getTime();
      
      expect(currentTime).toBeGreaterThanOrEqual(previousTime);
    }
  });

  it('should generate chronologically ordered timestamps for recent actions', () => {
    // Verify that actions are ordered chronologically (oldest to newest)
    for (let i = 1; i < mockRecentActions.length; i++) {
      const previousTime = new Date(mockRecentActions[i - 1].timestamp).getTime();
      const currentTime = new Date(mockRecentActions[i].timestamp).getTime();
      
      expect(currentTime).toBeGreaterThanOrEqual(previousTime);
    }
  });

  it('should generate valid ISO timestamp strings', () => {
    // Test first and last events
    expect(mockEventHistory[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(mockEventHistory[mockEventHistory.length - 1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    
    // Test first and last actions
    expect(mockRecentActions[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(mockRecentActions[mockRecentActions.length - 1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
  });

  it('should have reasonable time spans between events', () => {
    // Event history should span multiple days
    const firstEvent = new Date(mockEventHistory[0].timestamp);
    const lastEvent = new Date(mockEventHistory[mockEventHistory.length - 1].timestamp);
    const daysDifference = (lastEvent - firstEvent) / (1000 * 60 * 60 * 24);
    
    expect(daysDifference).toBeGreaterThan(40); // Should span ~49 days
    
    // Recent actions should span hours
    const firstAction = new Date(mockRecentActions[0].timestamp);
    const lastAction = new Date(mockRecentActions[mockRecentActions.length - 1].timestamp);
    const hoursDifference = (lastAction - firstAction) / (1000 * 60 * 60);
    
    expect(hoursDifference).toBeGreaterThan(10); // Should span ~12 hours
  });
});