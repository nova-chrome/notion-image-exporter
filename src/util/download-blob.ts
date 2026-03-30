export function downloadBlob(input: { blob: Blob; filename: string }) {
  const url = URL.createObjectURL(input.blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = input.filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
