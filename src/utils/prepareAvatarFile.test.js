import { afterEach, expect, it, vi } from "vitest";
import { prepareAvatarFile } from "./prepareAvatarFile";

afterEach(() => vi.restoreAllMocks());

it("rejects unsupported files and oversized photos before decoding", async () => {
  await expect(
    prepareAvatarFile(new File(["text"], "x.svg", { type: "image/svg+xml" })),
  ).rejects.toThrow("PNG, JPEG or WebP");
  await expect(
    prepareAvatarFile({ type: "image/jpeg", size: 21 * 1024 * 1024 }),
  ).rejects.toThrow("20 MB");
});

it("resizes a high-resolution phone photo with its aspect ratio intact and releases the object URL", async () => {
  const create = vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:photo");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const image = {
    naturalWidth: 4000,
    naturalHeight: 3000,
    set src(_value) {
      this.onload();
    },
  };
  vi.spyOn(window, "Image").mockImplementation(function MockImage() {
    return image;
  });
  const draw = vi.fn();
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
    drawImage: draw,
  });
  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(
    (callback) => callback(new Blob(["PNG"], { type: "image/png" })),
  );
  const file = new File(["photo"], "phone.jpg", { type: "image/jpeg" });
  const result = await prepareAvatarFile(file);
  expect(draw).toHaveBeenCalledWith(image, 0, 0, 256, 192);
  expect(result.type).toBe("image/png");
  expect(result.name).toBe("profile.png");
  expect(create).toHaveBeenCalledWith(file);
  expect(revoke).toHaveBeenCalledWith("blob:photo");
});

it("reports a corrupt image and releases its object URL", async () => {
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:bad");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  vi.spyOn(window, "Image").mockImplementation(function BrokenImage() {
    return {
      set src(_value) {
        this.onerror();
      },
    };
  });
  await expect(
    prepareAvatarFile(new File(["bad"], "bad.png", { type: "image/png" })),
  ).rejects.toThrow("could not be opened");
  expect(revoke).toHaveBeenCalledWith("blob:bad");
});
