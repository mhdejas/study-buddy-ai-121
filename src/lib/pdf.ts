// Client-only PDF text extraction using pdfjs-dist (lazy-loaded to avoid SSR)
export async function extractPdfText(file: File): Promise<string> {
  if (typeof window === "undefined") {
    throw new Error("PDF extraction is only available in the browser");
  }
  const pdfjs = await import("pdfjs-dist");
  const workerSrc = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  pdfjs.GlobalWorkerOptions.workerSrc = workerSrc;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const out: string[] = [];
  const maxPages = Math.min(pdf.numPages, 80);
  for (let i = 1; i <= maxPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const text = content.items
      .map((it: unknown) => {
        if (it && typeof it === "object" && "str" in it) {
          return (it as { str: string }).str;
        }
        return "";
      })
      .join(" ");
    out.push(text);
  }
  return out.join("\n\n");
}
