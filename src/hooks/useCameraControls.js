/**
 * useCameraControls Hook
 *
 * Manages camera selection, video feed, and fullscreen functionality for remote control.
 * Extracted from RemoteControl to improve testability.
 */

import React, { useState } from "react";

import playSound from "../utils/audioPlayer";

export const useCameraControls = (settings) => {
  const [selectedCamera, setSelectedCamera] = useState("cam1");
  const [videoFeedActive, setVideoFeedActive] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [videoContainerRef, setVideoContainerRef] = useState(null);

  // Listen for fullscreen changes
  React.useEffect(() => {
    // Guard for SSR safety
    if (typeof document === "undefined") {
      return;
    }

    const handleFullscreenChange = () => {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFullscreen);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    // Guard webkit and ms prefixed events only when necessary
    if ("webkitFullscreenElement" in document) {
      document.addEventListener(
        "webkitfullscreenchange",
        handleFullscreenChange,
      );
    }
    if ("msFullscreenElement" in document) {
      document.addEventListener("msfullscreenchange", handleFullscreenChange);
    }

    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
      if ("webkitFullscreenElement" in document) {
        document.removeEventListener(
          "webkitfullscreenchange",
          handleFullscreenChange,
        );
      }
      if ("msFullscreenElement" in document) {
        document.removeEventListener(
          "msfullscreenchange",
          handleFullscreenChange,
        );
      }
    };
  }, []);

  const handleCameraChange = (cameraId) => {
    setSelectedCamera(cameraId);
  };

  const toggleVideoFeed = () => {
    const newVideoFeedState = !videoFeedActive;
    setVideoFeedActive(newVideoFeedState);

    // Play appropriate audio based on video feed state
    if (newVideoFeedState) {
      // Starting video feed - play video-on.mp3
      playSound("video-on.mp3", settings?.soundEnabled, settings?.volume);
    } else {
      // Stopping video feed - play video-off.mp3
      playSound("video-off.mp3", settings?.soundEnabled, settings?.volume);
    }
  };

  const toggleFullscreen = async () => {
    // Guard for SSR safety
    if (typeof document === "undefined") {
      return;
    }

    try {
      if (!isFullscreen) {
        // Enter fullscreen
        if (videoContainerRef) {
          if (videoContainerRef.requestFullscreen) {
            await videoContainerRef.requestFullscreen();
          } else if (videoContainerRef.webkitRequestFullscreen) {
            await videoContainerRef.webkitRequestFullscreen();
          } else if (videoContainerRef.msRequestFullscreen) {
            await videoContainerRef.msRequestFullscreen();
          }
        }
      } else {
        // Exit fullscreen
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (_error) {
      // Silently handle fullscreen errors
    }
  };

  return {
    // Camera state
    selectedCamera,
    videoFeedActive,
    isFullscreen,
    videoContainerRef,

    // Camera actions
    handleCameraChange,
    toggleVideoFeed,
    toggleFullscreen,
    setVideoContainerRef,
  };
};
