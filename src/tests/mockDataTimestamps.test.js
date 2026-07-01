import { describe, expect, it } from "vitest";
import { mockEventHistory, mockRecentActions } from "../mockData.js";

describe("Mock Data Timestamp Generation", () => {
  it("should generate chronologically ordered timestamps for event history", () => {
    const history = mockEventHistory;
    // Verify that events are ordered chronologically (oldest to newest)
    for (let i = 1; i < history.length; i++) {
      const previousTime = new Date(history[i - 1].timestamp).getTime();
      const currentTime = new Date(history[i].timestamp).getTime();

      expect(currentTime).toBeGreaterThanOrEqual(previousTime);
    }
  });

  it("should generate chronologically ordered timestamps for recent actions", () => {
    const actions = mockRecentActions;
    // Verify that actions are ordered chronologically (oldest to newest)
    for (let i = 1; i < actions.length; i++) {
      const previousTime = new Date(actions[i - 1].timestamp).getTime();
      const currentTime = new Date(actions[i].timestamp).getTime();

      expect(currentTime).toBeGreaterThanOrEqual(previousTime);
    }
  });

  it("should generate valid ISO timestamp strings", () => {
    const history = mockEventHistory;
    const actions = mockRecentActions;

    // Test first and last events using robust matchers
    if (history.length > 0) {
      expect(history[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(history[history.length - 1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }

    // Test first and last actions
    if (actions.length > 0) {
      expect(actions[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
      expect(actions[actions.length - 1].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    }
  });

  it("should have reasonable time spans between events", () => {
    const history = mockEventHistory;
    const actions = mockRecentActions;

    if (history.length > 0) {
      const firstEvent = new Date(history[0].timestamp);
      const lastEvent = new Date(history[history.length - 1].timestamp);
      const daysDifference = (lastEvent - firstEvent) / (1000 * 60 * 60 * 24);
      expect(daysDifference).toBeGreaterThan(40);
    }

    if (actions.length > 0) {
      const firstAction = new Date(actions[0].timestamp);
      const lastAction = new Date(actions[actions.length - 1].timestamp);
      const hoursDifference = (lastAction - firstAction) / (1000 * 60 * 60);
      expect(hoursDifference).toBeGreaterThan(10);
    }
  });
});
