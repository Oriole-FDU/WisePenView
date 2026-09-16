function createMockPdfDataUrl(): string {
  const content = [
    'BT',
    '/F1 22 Tf',
    '72 720 Td',
    '(WisePen Course Material) Tj',
    '0 -36 Td',
    '/F1 12 Tf',
    '(This PDF is provided by mock fixture.) Tj',
    '0 -22 Td',
    '(The course viewer uses the same PDF renderer as Workspace.) Tj',
    'ET',
  ].join('\n');
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  const offsets: number[] = [];
  let pdf = '%PDF-1.4\n';

  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = pdf.length;
  const xrefEntries = offsets
    .map((offset) => `${String(offset).padStart(10, '0')} 00000 n `)
    .join('\n');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${xrefEntries}\n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF`;

  return `data:application/pdf;base64,${btoa(pdf)}`;
}

export const MOCK_PDF_PREVIEW_URL = createMockPdfDataUrl();
