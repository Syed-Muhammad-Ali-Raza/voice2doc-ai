import { useEffect, useState } from 'react'
import { Download, Eraser, Shield, Trash2 } from 'lucide-react'
import { GlassCard } from '../components/GlassCard'
import { REGION_LABELS, summarizePolicy, type DataRegion } from '../lib/compliance'
import { useT } from '../i18n/useT'
import {
  complianceService,
  type AuditEntry,
  type CompliancePolicy,
} from '../services/complianceService'
import { useDocsStore } from '../store/docs'
import { useSettingsStore } from '../store/auth'

export function CompliancePage() {
  const t = useT()
  const showToast = useDocsStore((s) => s.showToast)
  const setDocuments = useDocsStore((s) => s.setDocuments)
  const plan = useSettingsStore((s) => s.plan)
  const [policy, setPolicy] = useState<CompliancePolicy | null>(null)
  const [audit, setAudit] = useState<AuditEntry[]>([])
  const [busy, setBusy] = useState(false)
  const [wipeConfirm, setWipeConfirm] = useState('')

  const load = async () => {
    try {
      const [p, a] = await Promise.all([complianceService.getPolicy(), complianceService.listAudit(40)])
      setPolicy(p)
      setAudit(a.entries)
    } catch (err) {
      showToast(err instanceof Error ? err.message : t('compliance.loadFailed'))
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (!policy) {
    return <p className="text-sm text-muted">{t('common.loading')}</p>
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-ink dark:text-dark-ink">{t('compliance.title')}</h1>
        <p className="mt-1 text-muted">{t('compliance.subtitle')}</p>
        <p className="mt-2 text-xs text-muted">
          {t('compliance.planHint')}: <span className="capitalize text-accent">{plan}</span>
        </p>
      </div>

      <GlassCard className="space-y-4 p-5">
        <div className="flex items-center gap-2">
          <Shield className="text-accent" size={18} />
          <h2 className="font-semibold text-ink dark:text-dark-ink">{t('compliance.policyTitle')}</h2>
        </div>
        <p className="text-sm text-muted">{summarizePolicy(policy)}</p>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t('compliance.retentionDays')}
          </span>
          <input
            className="input-field"
            type="number"
            min={0}
            max={3650}
            value={policy.audioRetentionDays}
            onChange={(e) =>
              setPolicy({ ...policy, audioRetentionDays: Number(e.target.value) })
            }
          />
          <span className="text-xs text-muted">{t('compliance.retentionHint')}</span>
        </label>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold tracking-wide text-muted uppercase">
            {t('compliance.region')}
          </span>
          <select
            className="input-field"
            value={policy.region}
            onChange={(e) => setPolicy({ ...policy, region: e.target.value as DataRegion })}
          >
            {(Object.keys(REGION_LABELS) as DataRegion[]).map((r) => (
              <option key={r} value={r}>
                {REGION_LABELS[r]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={policy.keepDocuments}
            onChange={(e) => setPolicy({ ...policy, keepDocuments: e.target.checked })}
          />
          <span className="text-sm text-ink dark:text-dark-ink">{t('compliance.keepDocs')}</span>
        </label>

        <label className="flex items-center gap-3">
          <input
            type="checkbox"
            checked={policy.auditExports}
            onChange={(e) => setPolicy({ ...policy, auditExports: e.target.checked })}
          />
          <span className="text-sm text-ink dark:text-dark-ink">{t('compliance.auditExports')}</span>
        </label>

        <button
          type="button"
          className="btn-primary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const saved = await complianceService.setPolicy({
                audioRetentionDays: policy.audioRetentionDays,
                keepDocuments: policy.keepDocuments,
                region: policy.region,
                auditExports: policy.auditExports,
              })
              setPolicy(saved)
              showToast(t('compliance.saved'))
              const a = await complianceService.listAudit(40)
              setAudit(a.entries)
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('compliance.saveFailed'))
            } finally {
              setBusy(false)
            }
          }}
        >
          {t('compliance.savePolicy')}
        </button>
      </GlassCard>

      <div className="grid gap-3 sm:grid-cols-3">
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const result = await complianceService.purgeAudio()
              showToast(t('compliance.purged', { count: result.deleted }))
              const a = await complianceService.listAudit(40)
              setAudit(a.entries)
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('compliance.purgeFailed'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Trash2 size={16} /> {t('compliance.purgeAudio')}
        </button>
        <button
          type="button"
          className="btn-secondary"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              const data = await complianceService.exportData()
              const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `voice2doc-export-${Date.now()}.json`
              a.click()
              URL.revokeObjectURL(url)
              showToast(t('compliance.exported'))
              const auditRes = await complianceService.listAudit(40)
              setAudit(auditRes.entries)
            } catch (err) {
              showToast(err instanceof Error ? err.message : t('compliance.exportFailed'))
            } finally {
              setBusy(false)
            }
          }}
        >
          <Download size={16} /> {t('compliance.exportData')}
        </button>
        <div className="space-y-2">
          <input
            className="input-field"
            placeholder={t('compliance.wipePlaceholder')}
            value={wipeConfirm}
            onChange={(e) => setWipeConfirm(e.target.value)}
          />
          <button
            type="button"
            className="btn-ghost w-full justify-center text-danger"
            disabled={busy || wipeConfirm !== 'WIPE'}
            onClick={async () => {
              setBusy(true)
              try {
                await complianceService.wipe()
                setDocuments([])
                setWipeConfirm('')
                showToast(t('compliance.wiped'))
                const a = await complianceService.listAudit(40)
                setAudit(a.entries)
              } catch (err) {
                showToast(err instanceof Error ? err.message : t('compliance.wipeFailed'))
              } finally {
                setBusy(false)
              }
            }}
          >
            <Eraser size={16} /> {t('compliance.wipe')}
          </button>
        </div>
      </div>

      <GlassCard className="space-y-3 p-5">
        <h2 className="font-semibold text-ink dark:text-dark-ink">{t('compliance.auditTitle')}</h2>
        {audit.length === 0 ? (
          <p className="text-sm text-muted">{t('compliance.auditEmpty')}</p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {audit.map((e) => (
              <li
                key={e.id}
                className="rounded-xl border border-border/80 px-3 py-2 text-sm dark:border-dark-border"
              >
                <p className="font-medium text-ink dark:text-dark-ink">{e.action}</p>
                <p className="text-xs text-muted">
                  {new Date(e.createdAt).toLocaleString()}
                  {e.resourceType ? ` · ${e.resourceType}` : ''}
                  {e.resourceId ? ` · ${e.resourceId.slice(0, 8)}` : ''}
                </p>
              </li>
            ))}
          </ul>
        )}
      </GlassCard>
    </div>
  )
}
