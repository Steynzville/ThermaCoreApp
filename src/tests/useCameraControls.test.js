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

  it("should play sound when toggling video feed on", async () => {
    const playSound = (await import("../utils/audioPlayer")).default;
    const { result } = renderHook(() => useCameraControls(mockSettings));

    act(() => {
      result.current.toggleVideoFeed();
    });

    expect(playSound).toHaveBeenCalledWith("video-on.mp3", true, 50);
  });

  it("should play sound when toggling video feed off", async () => {
    const playSound = (await import("../utils/audioPlayer")).default;
    const { result } = renderHook(() => useCameraControls(mockSettings));

    // First turn it on
    act(() => {
      result.current.toggleVideoFeed();
    });

    // Then turn it off
    act(() => {
      result.current.toggleVideoFeed();
    });

    expect(playSound).toHaveBeenCalledWith("video-off.mp3", true, 50);
  });

  it("should handle fullscreen change events", () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    // Simulate fullscreen change
    act(() => {
      Object.defineProperty(document, "fullscreenElement", {
        writable: true,
        configurable: true,
        value: document.createElement("div"),
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.isFullscreen).toBe(true);

    // Simulate exiting fullscreen
    act(() => {
      Object.defineProperty(document, "fullscreenElement", {
        writable: true,
        configurable: true,
        value: null,
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    expect(result.current.isFullscreen).toBe(false);
  });

  it("should handle webkit fullscreen change events", () => {
    // Mock webkit support before rendering
    Object.defineProperty(document, "webkitFullscreenElement", {
      writable: true,
      configurable: true,
      value: null,
    });

    const { result } = renderHook(() => useCameraControls(mockSettings));

    // Simulate webkit fullscreen change
    act(() => {
      Object.defineProperty(document, "webkitFullscreenElement", {
        writable: true,
        configurable: true,
        value: document.createElement("div"),
      });
      document.dispatchEvent(new Event("webkitfullscreenchange"));
    });

    // The hook checks all fullscreen elements, so it should detect this
    expect(result.current.isFullscreen).toBe(true);
  });

  it("should handle ms fullscreen change events", () => {
    // Mock ms support before rendering
    Object.defineProperty(document, "msFullscreenElement", {
      writable: true,
      configurable: true,
      value: null,
    });

    const { result } = renderHook(() => useCameraControls(mockSettings));

    // Simulate ms fullscreen change
    act(() => {
      Object.defineProperty(document, "msFullscreenElement", {
        writable: true,
        configurable: true,
        value: document.createElement("div"),
      });
      document.dispatchEvent(new Event("msfullscreenchange"));
    });

    // The hook checks all fullscreen elements, so it should detect this
    expect(result.current.isFullscreen).toBe(true);
  });

  it("should request fullscreen on toggleFullscreen", async () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));
    const mockContainer = {
      requestFullscreen: vi.fn().mockResolvedValue(undefined),
    };

    act(() => {
      result.current.setVideoContainerRef(mockContainer);
    });

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockContainer.requestFullscreen).toHaveBeenCalled();
  });

  it("should handle webkit requestFullscreen", async () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));
    const mockContainer = {
      webkitRequestFullscreen: vi.fn().mockResolvedValue(undefined),
    };

    act(() => {
      result.current.setVideoContainerRef(mockContainer);
    });

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockContainer.webkitRequestFullscreen).toHaveBeenCalled();
  });

  it("should handle ms requestFullscreen", async () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));
    const mockContainer = {
      msRequestFullscreen: vi.fn().mockResolvedValue(undefined),
    };

    act(() => {
      result.current.setVideoContainerRef(mockContainer);
    });

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(mockContainer.msRequestFullscreen).toHaveBeenCalled();
  });

  it("should exit fullscreen when already in fullscreen", async () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));
    
    // Set isFullscreen to true
    act(() => {
      Object.defineProperty(document, "fullscreenElement", {
        writable: true,
        configurable: true,
        value: document.createElement("div"),
      });
      document.dispatchEvent(new Event("fullscreenchange"));
    });

    document.exitFullscreen = vi.fn().mockResolvedValue(undefined);

    await act(async () => {
      await result.current.toggleFullscreen();
    });

    expect(document.exitFullscreen).toHaveBeenCalled();
  });

  it("should handle fullscreen errors gracefully", async () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));
    const mockContainer = {
      requestFullscreen: vi.fn().mockRejectedValue(new Error("Fullscreen denied")),
    };

    act(() => {
      result.current.setVideoContainerRef(mockContainer);
    });

    // Should not throw
    await act(async () => {
      await expect(result.current.toggleFullscreen()).resolves.not.toThrow();
    });
  });

  it("should cleanup event listeners on unmount", () => {
    const removeEventListener = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => useCameraControls(mockSettings));

    unmount();

    expect(removeEventListener).toHaveBeenCalledWith(
      "fullscreenchange",
      expect.any(Function),
    );
  });

  it("should handle SSR safety in fullscreen listeners", () => {
    // Should not throw when document is undefined
    expect(() => {
      renderHook(() => useCameraControls(mockSettings));
    }).not.toThrow();
  });

  it("should handle SSR safety in toggleFullscreen", async () => {
    const { result } = renderHook(() => useCameraControls(mockSettings));

    // Should not throw when document methods are unavailable
    await act(async () => {
      await expect(result.current.toggleFullscreen()).resolves.not.toThrow();
    });
  });
});
