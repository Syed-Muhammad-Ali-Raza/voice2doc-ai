import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../middleware/auth.js'
import {
  createBrandKit,
  createToneProfile,
  listBrandKits,
  listToneProfiles,
  previewExport,
} from '../lib/atelier.js'

export const atelierRouter = Router()

atelierRouter.get('/brand-kits', requireAuth, (req: AuthedRequest, res) => {
  res.json({ brandKits: listBrandKits(req.user!.sub) })
})

atelierRouter.post('/brand-kits', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(120),
      accentHex: z.string().min(3).max(16),
      logoText: z.string().min(1).max(80),
      footerLine: z.string().max(200),
      letterheadTitle: z.string().min(1).max(120),
      isDefault: z.boolean().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid brand kit' })
    return
  }
  res.status(201).json(createBrandKit(req.user!.sub, parsed.data))
})

atelierRouter.get('/tone-profiles', requireAuth, (req: AuthedRequest, res) => {
  res.json({ toneProfiles: listToneProfiles(req.user!.sub) })
})

atelierRouter.post('/tone-profiles', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      name: z.string().min(1).max(120),
      voiceSummary: z.string().min(1).max(500),
      doList: z.array(z.string()).max(12),
      dontList: z.array(z.string()).max(12),
      sampleOpening: z.string().max(300),
      isDefault: z.boolean().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid tone profile' })
    return
  }
  res.status(201).json(createToneProfile(req.user!.sub, parsed.data))
})

atelierRouter.post('/preview', requireAuth, (req: AuthedRequest, res) => {
  const parsed = z
    .object({
      contentHtml: z.string().min(1).max(200000),
      brandKitId: z.string().optional(),
      toneProfileId: z.string().optional(),
    })
    .safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: 'Invalid preview payload' })
    return
  }
  res.json(previewExport(req.user!.sub, parsed.data))
})
