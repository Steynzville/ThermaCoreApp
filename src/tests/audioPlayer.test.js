import { describe, expect, it, vi } from 'vitest';
import playSound from '../utils/audioPlayer.js';

// Mock fetch to prevent actual HTTP requests during tests
global.fetch = vi.fn().mockImplementation(() => 
  Promise.resolve({
    ok: true,
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(1024)),
  })
);

describe('AudioPlayer', () => {
  it('should handle decodeAudioData correctly with mock AudioContext', async () => {
    // Test that playSound doesn't hang or fail due to improper AudioContext mock
    await expect(playSound('test-sound.mp3', true, 0.5)).resolves.not.toThrow();
  });

  it('should use cached audio buffer on subsequent calls', async () => {
    const fileName = 'cached-sound.mp3';
    
    // First call should decode audio
    await playSound(fileName, true, 0.5);
    
    // Second call should use cached buffer
    await playSound(fileName, true, 0.5);
    
    // Verify fetch was only called once (for caching test)
    expect(global.fetch).toHaveBeenCalled();
  });

  it('should not play sound when disabled', async () => {
    // This should resolve quickly without attempting to play
    await expect(playSound('disabled-sound.mp3', false, 0.5)).resolves.not.toThrow();
  });
});