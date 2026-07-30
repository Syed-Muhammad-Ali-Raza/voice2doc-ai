export function generateDocumentHtml(
  type: string,
  tone: string,
  length: string,
  titleHint?: string,
): { title: string; content: string } {
  const date = new Date().toLocaleDateString()
  const toneLine =
    tone === 'Friendly'
      ? '<p><em>Tone: warm and approachable.</em></p>'
      : tone === 'Formal'
        ? '<p><em>Prepared in a formal register.</em></p>'
        : tone === 'Casual'
          ? '<p><em>Kept light and conversational.</em></p>'
          : tone === 'Academic'
            ? '<p><em>Structured for academic review.</em></p>'
            : ''

  const body = `<h2>${type}</h2>${toneLine}<p>Generated on ${date} from your voice note. Key points were transcribed, cleaned, and formatted into a ${length.toLowerCase()} ${type.toLowerCase()}.</p><h3>Highlights</h3><ul><li>Main ideas captured from the recording</li><li>Actionable next steps identified</li><li>Ready for edit and export</li></ul>${
    length === 'Detailed'
      ? '<h3>Additional Context</h3><p>Expanded section with supporting detail so readers unfamiliar with the recording can still act on this document.</p>'
      : ''
  }`

  return {
    title: titleHint?.trim() || `${type} — ${date}`,
    content: body,
  }
}
