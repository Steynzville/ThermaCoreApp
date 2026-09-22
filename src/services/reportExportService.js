import { reportTables } from "../utils/reportModel";

const MIME = {
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pdf: "application/pdf",
};
const intro = (r) => [
  r.scopeLabel,
  `${r.from} to ${r.to} (UTC)`,
  r.source,
  `Generated ${r.generatedAt}`,
];

async function excel(report) {
  const { default: ExcelJS } = await import("exceljs");
  const book = new ExcelJS.Workbook();
  book.creator = "ThermaCore";
  book.created = new Date(report.generatedAt);
  const overview = book.addWorksheet("Report");
  overview.columns = [{ width: 110 }];
  [report.title, ...intro(report), "", ...report.notes].forEach((text) =>
    overview.addRow([text]),
  );
  overview.getRow(1).font = {
    size: 20,
    bold: true,
    color: { argb: "FF126C76" },
  };
  overview.eachRow((row) => {
    row.alignment = { wrapText: true, vertical: "top" };
    row.height = Math.max(
      34,
      Math.ceil(String(row.getCell(1).value || "").length / 105) * 16 + 10,
    );
  });
  for (const table of reportTables(report)) {
    const sheet = book.addWorksheet(table.title.slice(0, 31));
    sheet.addRow(table.headers);
    sheet.addRows(table.rows);
    if (!table.rows.length) sheet.addRow(["No records available"]);
    sheet.columns.forEach((col, i) => {
      col.width = Math.min(52, Math.max(20, table.headers[i].length + 3));
    });
    sheet.getRow(1).eachCell((cell) => {
      cell.font = { bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF126C76" },
      };
    });
    sheet.eachRow((row, n) => {
      row.alignment = { wrapText: true, vertical: "top" };
      row.height = Math.min(
        400,
        Math.max(
          30,
          ...row.values
            .slice(1)
            .map(
              (value, i) =>
                Math.ceil(
                  String(value ?? "").length /
                    Math.max(10, sheet.columns[i].width - 3),
                ) *
                  15 +
                10,
            ),
        ),
      );
      if (n > 1)
        row.eachCell((cell) => {
          if (typeof cell.value === "number")
            cell.numFmt = "#,##0.000;[Red]-#,##0.000";
        });
    });
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: {
        row: Math.max(1, table.rows.length + 1),
        column: table.headers.length,
      },
    };
    sheet.pageSetup = {
      orientation: "landscape",
      paperSize: 9,
      fitToPage: true,
      fitToWidth: 1,
      fitToHeight: 0,
    };
    sheet.headerFooter.oddFooter = "ThermaCore | Page &P of &N";
  }
  return book.xlsx.writeBuffer();
}

async function word(report) {
  const {
    Document,
    Packer,
    Paragraph,
    TextRun,
    Table,
    TableRow,
    TableCell,
    WidthType,
    HeadingLevel,
    Footer,
    PageNumber,
    AlignmentType,
  } = await import("docx");
  const p = (text, options = {}) =>
    new Paragraph({
      children: [new TextRun(String(text))],
      spacing: { after: 120 },
      ...options,
    });
  const children = [
    p(report.title, { heading: HeadingLevel.TITLE }),
    ...intro(report).map((text) => p(text)),
  ];
  for (const data of reportTables(report)) {
    children.push(
      p(data.title, { heading: HeadingLevel.HEADING_1, keepNext: true }),
    );
    if (!data.rows.length) {
      children.push(p("No records available."));
      continue;
    }
    const widths = data.headers.map(() =>
      Math.floor(9360 / data.headers.length),
    );
    const row = (values, header = false) =>
      new TableRow({
        tableHeader: header,
        cantSplit: true,
        children: values.map(
          (value, i) =>
            new TableCell({
              width: { size: widths[i], type: WidthType.DXA },
              shading: header ? { fill: "126C76" } : undefined,
              margins: { top: 80, bottom: 80, left: 80, right: 80 },
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(value),
                      bold: header,
                      color: header ? "FFFFFF" : "1F2937",
                      size: 18,
                    }),
                  ],
                }),
              ],
            }),
        ),
      });
    children.push(
      new Table({
        width: { size: 9360, type: WidthType.DXA },
        columnWidths: widths,
        rows: [row(data.headers, true), ...data.rows.map((r) => row(r))],
      }),
    );
    children.push(p(""));
  }
  children.push(
    p("Method and coverage", { heading: HeadingLevel.HEADING_1 }),
    ...report.notes.map((text) => p(text)),
  );
  const doc = new Document({
    creator: "ThermaCore",
    title: report.title,
    styles: { default: { document: { run: { font: "Calibri", size: 22 } } } },
    sections: [
      {
        properties: {
          page: { margin: { top: 900, bottom: 900, left: 900, right: 900 } },
        },
        footers: {
          default: new Footer({
            children: [
              new Paragraph({
                alignment: AlignmentType.RIGHT,
                children: [
                  new TextRun("ThermaCore · "),
                  new TextRun({ children: [PageNumber.CURRENT] }),
                ],
              }),
            ],
          }),
        },
        children,
      },
    ],
  });
  return Packer.toArrayBuffer(doc);
}

async function pdf(report) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const { loadReportFonts } = await import("./reportFonts");
  const [regular, bold] = await loadReportFonts();
  doc.addFileToVFS("ReportSans.ttf", regular);
  doc.addFont("ReportSans.ttf", "ReportSans", "normal");
  doc.addFileToVFS("ReportSans-Bold.ttf", bold);
  doc.addFont("ReportSans-Bold.ttf", "ReportSans", "bold");
  doc.setFont("ReportSans", "normal");
  doc.setProperties({ title: report.title, author: "ThermaCore" });
  doc.setFontSize(20);
  doc.setTextColor(18, 108, 118);
  doc.text(report.title, 14, 20);
  doc.setFontSize(10);
  doc.setTextColor(35);
  intro(report).forEach((text, i) => doc.text(text, 14, 29 + i * 6));
  let y = 58;
  const clean = (text) =>
    String(text)
      .replaceAll("—", "-")
      .replaceAll("−", "-")
      .replaceAll("CO₂", "CO2");
  for (const table of reportTables(report)) {
    if (y > 169) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(13);
    doc.text(table.title, 14, y);
    autoTable(doc, {
      startY: y + 4,
      head: [table.headers.map(clean)],
      body: table.rows.length
        ? table.rows.map((row) => row.map(clean))
        : [["No records available"]],
      margin: { top: 18, bottom: 18 },
      styles: {
        font: "ReportSans",
        fontSize: 8,
        cellPadding: 2.4,
        overflow: "linebreak",
      },
      headStyles: { fillColor: [18, 108, 118] },
      rowPageBreak: "avoid",
    });
    y = doc.lastAutoTable.finalY + 13;
  }
  if (y > 130) {
    doc.addPage();
    y = 20;
  }
  doc.setFontSize(13);
  doc.text("Method and coverage", 14, y);
  y += 8;
  doc.setFontSize(9);
  for (const note of report.notes) {
    const lines = doc.splitTextToSize(clean(note), 265);
    if (y + lines.length * 4 > 190) {
      doc.addPage();
      y = 20;
    }
    doc.text(lines, 14, y);
    y += lines.length * 4 + 5;
  }
  const pages = doc.getNumberOfPages();
  for (let n = 1; n <= pages; n++) {
    doc.setPage(n);
    doc.setFontSize(8);
    doc.text(`ThermaCore | ${n} / ${pages}`, 280, 201, { align: "right" });
  }
  return doc.output("arraybuffer");
}

export async function generateReportFile(report) {
  const generator = { xlsx: excel, docx: word, pdf }[report.format];
  if (!generator) throw new Error("Unsupported report format.");
  const buffer = await generator(report);
  return {
    blob: new Blob([buffer], { type: MIME[report.format] }),
    filename: `ThermaCore_${report.from}_${report.to}.${report.format}`,
  };
}
export function downloadReportFile({ blob, filename }) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
