/**
 * Tests for useCameraControls Hook
 *
 * Tests camera selection, video feed, and fullscreen functionality.
 */

import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCameraControls } from "../hooks/useCameraControls";

// Mock audioPlayer
vi.mock("../utils/audioPlayer", () => ({
  default: vi.fn(),
}));

describe("useCameraControls Hook", () => {
  const mockSettings = {
    soundEnabled: true,
    volume: 50,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with default camera state", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    expect(result.current.selectedCamera).toBe("cam1");
    expect(result.current.videoFeedActive).toBe(false);
    expect(result.current.isFullscreen).toBe(false);
    expect(result.current.videoContainerRef).toBeNull();
  });

  it("should change selected camera", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    act(() => {
      result.current.handleCameraChange("cam2");
    });

    expect(result.current.selectedCamera).toBe("cam2");
  });

  it("should toggle video feed on and off", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    expect(result.current.videoFeedActive).toBe(false);

    act(() => {
      result.current.toggleVideoFeed();
    });

    expect(result.current.videoFeedActive).toBe(true);

    act(() => {
      result.current.toggleVideoFeed();
    });

    expect(result.current.videoFeedActive).toBe(false);
  });

  it("should set video container ref", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));
    const mockRef = { current: document.createElement("div") };

    act(() => {
      result.current.setVideoContainerRef(mockRef);
    });

    expect(result.current.videoContainerRef).toBe(mockRef);
  });

  it("should handle camera change with different IDs", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    const cameras = ["cam1", "cam2", "cam3", "cam4"];

    cameras.forEach((camId) => {
      act(() => {
        result.current.handleCameraChange(camId);
      });
      expect(result.current.selectedCamera).toBe(camId);
    });
  });

  it("should maintain video feed state across camera changes", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    act(() => {
      result.current.toggleVideoFeed();
    });

    expect(result.current.videoFeedActive).toBe(true);

    act(() => {
      result.current.handleCameraChange("cam2");
    });

    // Video feed should remain active
    expect(result.current.videoFeedActive).toBe(true);
  });
});
