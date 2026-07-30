import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { GlassCard } from '../components/GlassCard'
import { StageProgress } from '../components/StageProgress'
import { env } from '../config/env'
import { ApiError } from '../lib/apiClient'
import { canUseAiDocument } from '../lib/trials'
import type { PlanId } from '../lib/types'
import { aiService } from '../services/aiService'
import { useSettingsStore } from '../store/auth'
import { useDocsStore } from '../store/docs'

export function ProcessingPage() {
  const pendingConfig = useDocsStore((s) => s.pendingConfig)
  const pendingAudio = useDocsStore((s) => s.pendingAudio)
  const setPendingConfig = useDocsStore((s) => s.setPendingConfig)
  const setPendingAudio = useDocsStore((s) => s.setPendingAudio)
  const addDocument = useDocsStore((s) => s.addDocument)
  const upsertDocument = useDocsStore((s) => s.upsertDocument)
  const bumpUsage = useDocsStore((s) => s.bumpUsage)
  const consumeTrial = useDocsStore((s) => s.consumeTrial)
  const setTrials = useDocsStore((s) => s.setTrials)
  const trialsUsed = useDocsStore((s) => s.usage.trialsUsed)
  const showToast = useDocsStore((s) => s.showToast)
  const plan = useSettingsStore((s) => s.plan)
  const setPlan = useSettingsStore((s) => s.setPlan)
  const navigate = useNavigate()
  const [stage, setStage] = useState(0)
  const [provider, setProvider] = useState<string | null>(null)

  useEffect(() => {
    if (!pendingConfig) return

    if (!canUseAiDocument(plan, trialsUsed)) {
      setPendingConfig(null)
      setPendingAudio(null)
      showToast('Free limit reached — upgrade for unlimited documents.')
      navigate('/app/billing', { replace: true })
      return
    }

    let cancelled = false

    ;(async () => {
      try {
        const result = await aiService.runProcessPipeline(
          pendingConfig,
          (_label, index) => {
            if (!cancelled) setStage(index)
          },
          pendingAudio,
        )
        if (cancelled) return

        if (result.provider) setProvider(result.provider)

        const doc =
          result.id && !env.useMockApi
            ? upsertDocument({
                id: result.id,
                title: result.title,
                type: result.type,
                content: result.content,
                language: result.language,
                tone: result.tone,
                favorite: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              })
            : addDocument({
                title: result.title,
                type: result.type,
                content: result.content,
                language: result.language,
                tone: result.tone,
              })

        bumpUsage(pendingConfig.source === 'upload' ? 5 : 3)

        if (result.entitlements) {
          setPlan(result.entitlements.plan as PlanId)
          setTrials(result.entitlements.trialsUsed, result.entitlements.trialsLimit)
        } else if (plan === 'free' && env.useMockApi) {
          consumeTrial()
        }

        setPendingConfig(null)
        setPendingAudio(null)
        navigate(`/app/editor/${doc.id}`, { replace: true })
      } catch (err) {
        if (cancelled) return
        setPendingConfig(null)
        setPendingAudio(null)
        if (err instanceof ApiError && err.status === 402) {
          showToast(err.message)
          navigate('/app/billing', { replace: true })
        } else {
          showToast(err instanceof Error ? err.message : 'Processing failed')
          navigate('/app', { replace: true })
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [
    pendingConfig,
    pendingAudio,
    plan,
    trialsUsed,
    addDocument,
    upsertDocument,
    bumpUsage,
    consumeTrial,
    setTrials,
    setPlan,
    navigate,
    setPendingConfig,
    setPendingAudio,
    showToast,
  ])

  if (!pendingConfig) {
    return <Navigate to="/app" replace />
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col items-center py-10">
      <GlassCard strong className="w-full p-8">
        <p className="text-xs font-semibold tracking-[0.18em] text-accent uppercase">AI Processing</p>
        <h1 className="mt-2 font-display text-3xl font-semibold text-ink dark:text-dark-ink">Shaping your document</h1>
        <p className="mt-2 text-sm text-muted">
          Source: {pendingConfig.sourceLabel ?? pendingConfig.source} · {pendingConfig.type} · {pendingConfig.tone}
        </p>
        {pendingAudio && (
          <p className="mt-1 text-xs text-signal">Audio attached · Phase 2 pipeline</p>
        )}
        {provider && <p className="mt-1 text-xs text-muted">Provider: {provider}</p>}
        <div className="mt-8">
          <StageProgress current={stage} />
        </div>
      </GlassCard>
    </div>
  )
}
