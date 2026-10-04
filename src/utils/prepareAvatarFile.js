// Resize phone photos before uploading; the server still validates/re-encodes them.
export async function prepareAvatarFile(file) {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Choose a PNG, JPEG or WebP image.");
  }
  if (file.size > 20 * 1024 * 1024) {
    throw new Error("Choose a profile image up to 20 MB.");
  }
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () =>
        reject(
          new Error("This image could not be opened. Choose another picture."),
        );
      image.src = url;
    });
    const scale = Math.min(
      1,
      256 / Math.max(image.naturalWidth, image.naturalHeight),
    );
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    const context = canvas.getContext("2d");
    if (!context)
      throw new Error(
        "Your browser could not prepare this picture. Please try again.",
      );
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/png"),
    );
    if (!blob)
      throw new Error(
        "Your browser could not prepare this picture. Please try again.",
      );
    return new File([blob], "profile.png", { type: "image/png" });
  } finally {
    URL.revokeObjectURL(url);
  }
}
