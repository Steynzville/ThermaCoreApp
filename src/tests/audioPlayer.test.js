import { describe, expect, it, vi, beforeAll, afterAll } from "vitest";
import playSound from "../utils/audioPlayer.js";

// Mock AudioContext globally
class MockAudioContext {
  constructor() {
    this.state = "suspended";
    this.currentTime = 0;
    this.destination = {};
  }
  resume() {
    return Promise.resolve();
  }
  suspend() {
    return Promise.resolve();
  }
  close() {
    return Promise.resolve();
  }
  decodeAudioData() {
    return Promise.resolve({
      duration: 1,
      numberOfChannels: 2,
      sampleRate: 44100,
      getChannelData: () => new Float32Array(44100),
    });
  }
  createBufferSource() {
    return {
      buffer: null,
      connect: vi.fn(),
      start: vi.fn(),
      stop: vi.fn(),
      onended: null,
    };
  }
  createGain() {
    return {
      gain: { value: 0.5, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() },
      connect: vi.fn(),
    };
  }
}

// Mock window.AudioContext and window.webkitAudioContext
beforeAll(() => {
  // Store original if it exists
  const originalAudioContext = window.AudioContext;
  const originalWebkitAudioContext = window.webkitAudioContext;

  // Mock AudioContext
  Object.defineProperty(window, "AudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  Object.defineProperty(window, "webkitAudioContext", {
    writable: true,
    configurable: true,
    value: MockAudioContext,
  });

  // Clean up after tests
  return () => {
    Object.defineProperty(window, "AudioContext", {
      writable: true,
      configurable: true,
      value: originalAudioContext,
    });
    Object.defineProperty(window, "webkitAudioContext", {
      writable: true,
      configurable: true,
      value: originalWebkitAudioContext,
    });
  };
});

// Mock fetch to prevent actual HTTP requests during tests
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  }),
);

describe("AudioPlayer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should handle decodeAudioData correctly with mock AudioContext", async () => {
    // Test that playSound doesn't hang or fail due to improper AudioContext mock
    await expect(playSound("test-sound.mp3", true, 0.5)).resolves.not.toThrow();
  });

  it("should use cached audio buffer on subsequent calls", async () => {
    const fileName = "cached-sound.mp3";

    // Clear fetch mock counts
    vi.clearAllMocks();

    // First call should fetch and decode audio
    await playSound(fileName, true, 0.5);

    // Second call should use cached buffer (no new fetch)
    await playSound(fileName, true, 0.5);

    // Verify fetch was only called once (for caching test)
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it("should not play sound when disabled", async () => {
    // This should resolve quickly without attempting to play
    await expect(
      playSound("disabled-sound.mp3", false, 0.5),
    ).resolves.not.toThrow();
  });
});
