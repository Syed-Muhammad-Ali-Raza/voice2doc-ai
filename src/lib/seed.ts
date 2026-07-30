import type { DocItem } from './types'

export const seedDocuments: DocItem[] = [
  {
    id: 'doc-1',
    title: 'Product Sync — July 28',
    type: 'Meeting Notes',
    content:
      '<h2>Meeting Notes</h2><p>Discussed Studio Glass direction, amber accents, and frosted panels. Agreed to ship demo without live APIs.</p><ul><li>Finalize landing hero</li><li>Wire processing stages</li></ul>',
    favorite: true,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 20).toISOString(),
    language: 'English',
    tone: 'Professional',
  },
  {
    id: 'doc-2',
    title: 'Client follow-up email',
    type: 'Email',
    content:
      '<h2>Draft Email</h2><p>Hi Maya,</p><p>Thanks for walking through your workflow yesterday. Attached is a cleaned summary of next steps.</p>',
    favorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 50).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    language: 'English',
    tone: 'Friendly',
  },
  {
    id: 'doc-3',
    title: 'Weekly research digest',
    type: 'Research Summary',
    content:
      '<h2>Research Summary</h2><p>Audio-first drafting improves completion for consultants who capture interviews in the field.</p>',
    favorite: false,
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 60 * 70).toISOString(),
    language: 'English',
    tone: 'Academic',
  },
]

export const templates = [
  {
    id: 'tpl-meeting',
    name: 'Meeting Notes',
    description: 'Agenda, decisions, and action items.',
    type: 'Meeting Notes' as const,
  },
  {
    id: 'tpl-email',
    name: 'Email',
    description: 'Polished outreach from a voice memo.',
    type: 'Email' as const,
  },
  {
    id: 'tpl-weekly',
    name: 'Weekly Report',
    description: 'Status, metrics, and risks.',
    type: 'Report' as const,
  },
  {
    id: 'tpl-blog',
    name: 'Blog',
    description: 'Article draft with narrative structure.',
    type: 'Blog Article' as const,
  },
  {
    id: 'tpl-assignment',
    name: 'Assignment',
    description: 'Structured academic write-up.',
    type: 'Lecture Notes' as const,
  },
  {
    id: 'tpl-lecture',
    name: 'Lecture Summary',
    description: 'Key concepts from class audio.',
    type: 'Lecture Notes' as const,
  },
  {
    id: 'tpl-proposal',
    name: 'Proposal',
    description: 'Opportunity, approach, investment.',
    type: 'Proposal' as const,
  },
  {
    id: 'tpl-invoice',
    name: 'Invoice Notes',
    description: 'Billing notes from client calls.',
    type: 'Action Items' as const,
  },
  {
    id: 'tpl-interview',
    name: 'Interview Summary',
    description: 'Highlights from an interview recording.',
    type: 'Interview Transcript' as const,
  },
]
