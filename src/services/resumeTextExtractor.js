import * as pdfjsLib from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';
import mammoth from 'mammoth';

// Configure PDF worker for Vite
pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

/**
 * Extracts raw text from uploaded PDF, DOCX, or TXT file using pdfjs-dist / mammoth.
 * @param {File} fileObj 
 * @returns {Promise<string>}
 */
export const extractTextFromFile = async (fileObj) => {
  if (!fileObj) return '';
  const fileName = (fileObj.name || '').toLowerCase();
  const arrayBuffer = await fileObj.arrayBuffer();

  if (fileName.endsWith('.docx') || fileObj.type?.includes('word')) {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value || '';
  } else if (fileName.endsWith('.txt') || fileObj.type === 'text/plain') {
    return await fileObj.text();
  } else {
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer, useSystemFonts: true }).promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item) => item.str).join(' ');
      fullText += pageText + '\n';
    }
    if (!fullText.trim()) {
      throw new Error('No readable text found in PDF. Please use a text-based PDF or DOCX file.');
    }
    return fullText;
  }
};
