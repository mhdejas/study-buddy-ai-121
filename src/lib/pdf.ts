// Client-only PDF text extraction using pdfjs-dist
import * as pdfjs from "pdfjs-dist";
// @ts-expect-error - worker URL import
import workerSrc from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

export async function extractPdfText(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  const maxPages = Math.min(pdf.numPages, 80);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      // @ts-expect-error - item.str exists on TextItem
      .map((it) => ("str" in it ? it.str : ""))
      .join(" ");
    out.push(text);
  }
  return out.join("\n\n");
}
