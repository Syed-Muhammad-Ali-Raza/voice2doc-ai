import type { DocumentType, Length, Tone } from './types'

const snippets: Record<DocumentType, string> = {
  'Meeting Notes': `<h2>Meeting Notes</h2><p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p><h3>Attendees</h3><ul><li>Alex Rivera</li><li>Jordan Lee</li><li>Sam Patel</li></ul><h3>Discussion</h3><p>The team reviewed Q3 priorities, focusing on faster transcription turnaround and clearer export workflows. Stakeholders agreed that voice capture should feel as simple as sending a message.</p><h3>Decisions</h3><ul><li>Ship Studio Glass demo this sprint</li><li>Defer live meeting integrations to v2</li></ul><h3>Action Items</h3><ul><li>Alex — finalize pricing copy</li><li>Jordan — polish recording UX</li></ul>`,
  Email: `<h2>Draft Email</h2><p><strong>Subject:</strong> Follow-up from today's conversation</p><p>Hi team,</p><p>Thank you for the thoughtful discussion earlier. Below is a concise summary of what we aligned on and the next steps I recommend.</p><p>Please reply with any corrections before end of day so we can move forward confidently.</p><p>Best regards</p>`,
  Report: `<h2>Status Report</h2><h3>Executive Summary</h3><p>Progress remains on track. Voice capture and document generation flows are stable in the demo environment, with strong feedback on clarity and speed.</p><h3>Key Metrics</h3><ul><li>Transcription pipeline stages: 5/5 complete</li><li>Export formats ready: TXT, Markdown</li><li>User completion time: under 2 minutes</li></ul><h3>Risks</h3><p>Real API wiring remains future work; current outputs are simulated for product validation.</p>`,
  'Blog Article': `<h2>From Voice Memo to Finished Draft</h2><p>Most ideas die in your notes app because typing breaks the flow. Voice2Doc flips that: speak naturally, and watch structure appear—headings, bullets, and a tone that matches your audience.</p><p>In this piece, we explore why audio-first drafting is becoming the default for busy professionals, and how a calm studio interface keeps you focused on thinking instead of formatting.</p>`,
  Checklist: `<h2>Checklist</h2><ul><li>Confirm recording quality</li><li>Select document type and tone</li><li>Review AI formatting stages</li><li>Edit and polish in the document editor</li><li>Export or share with collaborators</li></ul>`,
  'Lecture Notes': `<h2>Lecture Notes</h2><h3>Topic</h3><p>Introduction to structured note-taking from spoken lectures.</p><h3>Key Concepts</h3><ul><li>Signal vs noise in spoken delivery</li><li>Chunking ideas into reusable sections</li><li>Linking action items to learning outcomes</li></ul><h3>Summary</h3><p>Recording lectures and converting them into organized notes reduces cognitive load and improves retention.</p>`,
  'Daily Journal': `<h2>Daily Journal</h2><p><em>${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</em></p><p>Today felt productive. I captured thoughts out loud instead of forcing them into neat paragraphs first—and somehow the structure showed up on its own.</p><p>Grateful for quiet focus time and a clearer sense of what matters next.</p>`,
  'Project Documentation': `<h2>Project Documentation</h2><h3>Overview</h3><p>Voice2Doc converts spoken input into editable professional documents with configurable tone, length, and language.</p><h3>Architecture Notes</h3><ul><li>Client-side demo store for documents and usage</li><li>Staged processing UI for transparency</li><li>Rich text editor with AI assist actions</li></ul>`,
  Proposal: `<h2>Proposal</h2><h3>Opportunity</h3><p>Teams lose hours rewriting voice notes into shareable documents. Voice2Doc closes that gap with guided AI formatting.</p><h3>Recommended Approach</h3><p>Pilot with a cross-functional team for two weeks, measuring time-to-document and edit quality.</p><h3>Investment</h3><p>Pro plan unlocks unlimited transcription and premium AI formatting for individual power users.</p>`,
  'Brainstorm Notes': `<h2>Brainstorm</h2><ul><li>Ambient recording for walking meetings</li><li>Template packs by industry</li><li>Shared workspace comments on timestamps</li><li>“One-tap” email from a voice memo</li><li>Offline draft queue for flights</li></ul>`,
  'Action Items': `<h2>Action Items</h2><ol><li><strong>Owner:</strong> Product — ship pricing page updates by Friday</li><li><strong>Owner:</strong> Design — refine waveform motion timing</li><li><strong>Owner:</strong> Eng — stub export toasts for PDF/DOCX honesty</li></ol>`,
  'Interview Transcript': `<h2>Interview Transcript</h2><p><strong>Interviewer:</strong> What problem are you solving?</p><p><strong>Guest:</strong> People capture great ideas verbally, then lose them in messy notes. We turn that raw audio into documents they can actually send.</p><p><strong>Interviewer:</strong> Who benefits most?</p><p><strong>Guest:</strong> Consultants, journalists, PMs—anyone who thinks out loud for a living.</p>`,
  'Research Summary': `<h2>Research Summary</h2><h3>Question</h3><p>Does audio-first drafting improve document completion rates?</p><h3>Findings</h3><p>Early qualitative feedback suggests users prefer speaking for first drafts and editing visually afterward. Structured stages increase trust in the AI output.</p><h3>Next Steps</h3><p>Validate with longer recordings and multilingual tone tests.</p>`,
}

function lengthAdjust(html: string, length: Length): string {
  if (length === 'Short') {
    return html.replace(/<h3>[\s\S]*?<\/ul>/, '').slice(0, Math.min(html.length, 900))
  }
  if (length === 'Detailed') {
    return `${html}<h3>Additional Context</h3><p>This expanded section adds nuance captured from the original audio—clarifying intent, constraints, and suggested follow-ups so the document stands alone without replaying the recording.</p>`
  }
  return html
}

function toneAdjust(html: string, tone: Tone): string {
  const prefix: Record<Tone, string> = {
    Professional: '',
    Friendly: '<p><em>Tone: warm and approachable.</em></p>',
    Formal: '<p><em>Prepared in a formal register for official circulation.</em></p>',
    Casual: '<p><em>Kept light and conversational.</em></p>',
    Academic: '<p><em>Structured for academic review with clear claims and evidence cues.</em></p>',
  }
  return `${prefix[tone]}${html}`
}

export function generateMockDocument(
  type: DocumentType,
  tone: Tone,
  length: Length,
  titleHint?: string,
): { title: string; content: string } {
  const base = snippets[type]
  const content = toneAdjust(lengthAdjust(base, length), tone)
  const title = titleHint?.trim() || `${type} — ${new Date().toLocaleDateString()}`
  return { title, content }
}

export function transformWithAi(
  html: string,
  action: 'rewrite' | 'expand' | 'shorten' | 'grammar' | 'translate',
  language?: string,
): string {
  switch (action) {
    case 'rewrite':
      return `<p><em>Rewritten for clarity.</em></p>${html}`
    case 'expand':
      return `${html}<p>Expanded insight: the original points now include supporting context so readers unfamiliar with the recording can still act on the document.</p>`
    case 'shorten':
      return html
        .replace(/<h3>Additional Context<\/h3><p>.*?<\/p>/, '')
        .replace(/<p><em>.*?<\/em><\/p>/, '')
    case 'grammar':
      return `<p><em>Grammar polished.</em></p>${html}`
    case 'translate':
      return `<p><em>Translated preview (${language ?? 'English'}).</em></p>${html}`
    default:
      return html
  }
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
