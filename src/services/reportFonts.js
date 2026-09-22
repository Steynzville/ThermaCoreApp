// Subsetted DejaVu Sans, licensed in assets/report-fonts/LICENSE.txt.
// Fonts load only when the user requests a PDF.
let fonts;
export function loadReportFonts() {
  if (!fonts)
    fonts = Promise.all([
      import("../assets/report-fonts/ReportSans.ttf?url"),
      import("../assets/report-fonts/ReportSans-Bold.ttf?url"),
    ])
      .then((modules) =>
        Promise.all(
          modules.map(async ({ default: url }) => {
            const response = await fetch(url);
            if (!response.ok)
              throw new Error("Could not load PDF fonts. Please retry.");
            const bytes = new Uint8Array(await response.arrayBuffer());
            let binary = "";
            for (let i = 0; i < bytes.length; i += 8192)
              binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
            return btoa(binary);
          }),
        ),
      )
      .catch((error) => {
        fonts = null;
        throw error;
      });
  return fonts;
}
