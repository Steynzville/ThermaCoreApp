// Create a single, reusable AudioContext.
// It will start in a "suspended" state until the user interacts with the page.
const audioContext = new (window.AudioContext || window.webkitAudioContext)();

// Keep track of loaded audio buffers to avoid re-fetching and re-decoding them.
const audioBuffers = new Map();

/**
 * Asynchronously loads, decodes, and plays a sound file.
 * This function is designed to work around browser autoplay policies by resuming
 * the AudioContext upon user interaction.
 *
 * @param {string} fileName The name of the audio file (e.g., "login-sound.mp3").
 *                          The file is expected to be in the `/audio/` directory.
 * @param {boolean} soundEnabled Whether sound is enabled (defaults to true for backward compatibility).
 */
const playSound = async (fileName, soundEnabled = true, volume = 0.35) => {
  // Don't play sound if it's disabled
  if (!soundEnabled) {
    return;
  }

  // First, check if the AudioContext is suspended. If so, it needs to be resumed.
  // This call will succeed if it's triggered by a user gesture (like a click).
  if (audioContext.state === "suspended") {
    try {
      await audioContext.resume();
    } catch (resumeError) {
      console.error(
        "AudioContext could not be resumed. User interaction might be required.",
        resumeError,
      );
      // If it fails to resume, we can't play audio, so we exit.
      return;
    }
  }

  try {
    let buffer;

    // Check if we have already decoded this audio file and cached it.
    if (audioBuffers.has(fileName)) {
      // Use the cached audio buffer.
      buffer = audioBuffers.get(fileName);
    } else {
      // If not cached, fetch the audio file from the public/audio directory.
      const response = await fetch(`/audio/${fileName}`);
      if (!response.ok) {
        throw new Error(`Audio file not found or failed to load: ${fileName}`);
      }

      // Convert the response into an ArrayBuffer.
      const arrayBuffer = await response.arrayBuffer();

      // Decode the audio data from the ArrayBuffer into a usable format.
      buffer = await audioContext.decodeAudioData(arrayBuffer);

      // Cache the decoded buffer for future use.
      audioBuffers.set(fileName, buffer);
    }

    // Create an AudioBufferSourceNode. This is the node that will play the sound.
    const source = audioContext.createBufferSource();
    source.buffer = buffer;

    // Connect the source to the destination (the user's speakers).
    const gainNode = audioContext.createGain();
    gainNode.gain.value = volume;
    source.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Start playback immediately.
    source.start(0);
  } catch (error) {
    // Log any errors that occur during fetching, decoding, or playback.
    console.error(`Error playing sound "${fileName}":`, error);
  }
};

export default playSound;
