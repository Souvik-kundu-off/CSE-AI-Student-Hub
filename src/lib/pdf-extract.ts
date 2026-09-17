/**
 * Client-side file text extraction utility.
 * Supports: PDF (via pdfjs-dist), .txt, .md, and other plain text files.
 */

/**
 * Reads a plain text file (TXT, MD, CSV, etc.) and returns its content as a string.
 */
function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => resolve((e.target?.result as string) || "");
    reader.onerror = () => reject(new Error("Failed to read text file"));
    reader.readAsText(file, "UTF-8");
  });
}

/**
 * Extracts full text from a PDF file using pdfjs-dist.
 * Iterates all pages and concatenates text content.
 */
async function extractTextFromPDF(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();

  // Dynamic import to avoid bloating the initial bundle
  const pdfjsLib = await import("pdfjs-dist");

  // Configure worker – use CDN to avoid Vite worker bundling complexity
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items
      .map((item: any) => ("str" in item ? item.str : ""))
      .join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n\n").trim();
}

/**
 * Main entry point: extracts all text from a given file.
 * Supports PDF, TXT, MD, and other readable text formats.
 *
 * @param file - The file to extract text from
 * @returns The full extracted text content
 */
export async function extractFileText(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf" || file.type === "application/pdf") {
    try {
      return await extractTextFromPDF(file);
    } catch (err) {
      console.warn("PDF extraction failed, falling back to filename hint:", err);
      return `[PDF: ${file.name}] — Unable to extract text. Please paste the content manually.`;
    }
  }

  // Plain text formats
  if (
    ["txt", "md", "csv", "text"].includes(ext) ||
    file.type.startsWith("text/")
  ) {
    return readTextFile(file);
  }

  // Unknown type — try reading as text, may produce garbage for binaries
  try {
    return await readTextFile(file);
  } catch {
    return `[File: ${file.name}] — Could not read file contents.`;
  }
}
