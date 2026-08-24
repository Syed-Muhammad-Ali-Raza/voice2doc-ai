export type VoiceCommandId =
  | 'start-recording'
  | 'stop-recording'
  | 'export-notion'
  | 'open-dashboard'
  | 'open-documents'
  | 'open-record'
  | 'open-upload'
  | 'open-templates'
  | 'open-integrations'
  | 'open-memory'
  | 'open-atelier'
  | 'open-voice-twin'
  | 'open-pulse'
  | 'open-recipes'
  | 'open-compliance'
  | 'open-settings'
  | 'open-billing'

export interface MatchedCommand {
  commandId: VoiceCommandId
  action: 'navigate' | 'voice-action'
  path?: string
  actionType?: string
  pathHint?: string
  label: string
  labelKey: string
  confirm?: boolean
}

type PhraseSet = { includes?: string[]; exact?: string[] }

interface CommandDef {
  id: VoiceCommandId
  action: 'navigate' | 'voice-action'
  path?: string
  actionType?: string
  pathHint?: string
  label: string
  labelKey: string
  confirm?: boolean
  phrases: Partial<Record<'en' | 'es' | 'fr' | 'de' | 'ur' | 'ar', PhraseSet>>
}

const SUPPORTED_LOCALES = ['en', 'es', 'fr', 'de', 'ur', 'ar'] as const

const COMMANDS: CommandDef[] = [
  {
    id: 'start-recording',
    action: 'voice-action',
    actionType: 'start-recording',
    pathHint: '/app/record',
    label: 'Start recording',
    labelKey: 'voiceGuide.cmdStartRecording',
    phrases: {
      en: {
        includes: ['start recording', 'begin recording', 'start record'],
        exact: ['record'],
      },
      es: {
        includes: ['iniciar grabación', 'iniciar grabacion', 'comenzar grabación', 'comenzar grabacion'],
        exact: ['grabar'],
      },
      fr: {
        includes: ["démarrer l'enregistrement", "demarrer l'enregistrement", "commencer l'enregistrement", 'commencer lenregistrement'],
        exact: ['enregistrer'],
      },
      de: {
        includes: ['aufnahme starten', 'aufnahme beginnen'],
        exact: ['aufnehmen'],
      },
      ur: {
        includes: ['recording shuru', 'ریکارڈنگ شروع'],
        exact: ['ریکارڈ'],
      },
      ar: {
        includes: ['ابدأ التسجيل', 'ابدا التسجيل'],
        exact: ['تسجيل'],
      },
    },
  },
  {
    id: 'stop-recording',
    action: 'voice-action',
    actionType: 'stop-recording',
    label: 'Stop recording',
    labelKey: 'voiceGuide.cmdStopRecording',
    confirm: true,
    phrases: {
      en: {
        includes: ['stop recording', 'end recording', 'stop record', 'recording stop'],
      },
      es: {
        includes: ['detener grabación', 'detener grabacion', 'parar grabación', 'parar grabacion'],
      },
      fr: {
        includes: ["arrêter l'enregistrement", "arreter l'enregistrement", 'arrêter lenregistrement', 'stopper l\'enregistrement'],
      },
      de: {
        includes: ['aufnahme stoppen', 'aufnahme beenden'],
      },
      ur: {
        includes: ['recording roko', 'ریکارڈنگ روکیں'],
      },
      ar: {
        includes: ['أوقف التسجيل', 'اوقف التسجيل', 'وقف التسجيل'],
      },
    },
  },
  {
    id: 'export-notion',
    action: 'voice-action',
    actionType: 'export-notion',
    pathHint: '/app/editor',
    label: 'Export to Notion',
    labelKey: 'voiceGuide.cmdExportNotion',
    confirm: true,
    phrases: {
      en: {
        includes: ['export to notion', 'send to notion', 'notion export'],
      },
      es: {
        includes: ['exportar a notion', 'enviar a notion'],
      },
      fr: {
        includes: ['exporter vers notion', 'exporter a notion', 'envoyer à notion', 'envoyer a notion'],
      },
      de: {
        includes: ['nach notion exportieren', 'an notion senden'],
      },
      ur: {
        includes: ['نویشن میں ایکسپورٹ'],
      },
      ar: {
        includes: ['تصدير إلى نوشن', 'تصدير الى نوشن'],
      },
    },
  },
  {
    id: 'open-dashboard',
    action: 'navigate',
    path: '/app',
    label: 'Go home',
    labelKey: 'nav.dashboard',
    phrases: {
      en: {
        includes: ['go home', 'open dashboard', 'go to dashboard'],
        exact: ['home', 'dashboard'],
      },
      es: {
        includes: ['ir a inicio', 'abrir panel', 'ir al panel'],
        exact: ['inicio', 'panel'],
      },
      fr: {
        includes: ["aller à l'accueil", "aller a l'accueil", 'aller a laccueil', 'ouvrir tableau de bord'],
        exact: ['accueil'],
      },
      de: {
        includes: ['zur übersicht', 'zur ubersicht', 'zum dashboard', 'übersicht öffnen', 'ubersicht öffnen'],
        exact: ['übersicht', 'ubersicht', 'dashboard'],
      },
      ur: {
        includes: ['ڈیش بورڈ کھولیں', 'ہوم پر جائیں'],
        exact: ['ہوم', 'ڈیش بورڈ'],
      },
      ar: {
        includes: ['افتح لوحة التحكم', 'ع إلى الرئيسية', 'اذهب للرئيسية'],
        exact: ['الرئيسية', 'لوحة التحكم'],
      },
    },
  },
  {
    id: 'open-documents',
    action: 'navigate',
    path: '/app/documents',
    label: 'Open Documents',
    labelKey: 'nav.documents',
    phrases: {
      en: {
        includes: ['open documents', 'go to documents'],
        exact: ['documents'],
      },
      es: {
        includes: ['abrir documentos', 'ir a documentos'],
        exact: ['documentos'],
      },
      fr: {
        includes: ['ouvrir documents', 'aller aux documents'],
        exact: ['documents'],
      },
      de: {
        includes: ['dokumente öffnen', 'zu den dokumenten'],
        exact: ['dokumente'],
      },
      ur: {
        includes: ['دستاویزات کھولیں'],
        exact: ['دستاویزات'],
      },
      ar: {
        includes: ['افتح المستندات'],
        exact: ['المستندات'],
      },
    },
  },
  {
    id: 'open-record',
    action: 'navigate',
    path: '/app/record',
    label: 'Open Record',
    labelKey: 'nav.record',
    phrases: {
      en: {
        includes: ['open record page', 'go to record page', 'new recording'],
      },
      es: {
        includes: ['nueva grabación', 'nueva grabacion', 'abrir grabadora'],
      },
      fr: {
        includes: ['nouvel enregistrement', 'ouvrir enregistreur'],
      },
      de: {
        includes: ['neue aufnahme', 'aufnahmeseite öffnen'],
      },
      ur: {
        includes: ['نئی ریکارڈنگ'],
      },
      ar: {
        includes: ['تسجيل جديد'],
      },
    },
  },
  {
    id: 'open-upload',
    action: 'navigate',
    path: '/app/upload',
    label: 'Open Upload',
    labelKey: 'nav.upload',
    phrases: {
      en: {
        includes: ['open upload', 'upload audio'],
        exact: ['upload'],
      },
      es: {
        includes: ['subir audio', 'abrir carga'],
        exact: ['subir'],
      },
      fr: {
        includes: ['importer audio', 'téléverser audio', 'televerser audio'],
        exact: ['téléverser', 'televerser'],
      },
      de: {
        includes: ['audio hochladen'],
        exact: ['hochladen'],
      },
      ur: {
        includes: ['آڈیو اپلوڈ کریں'],
        exact: ['اپلوڈ'],
      },
      ar: {
        includes: ['رفع الصوت', 'تحميل الصوت'],
        exact: ['رفع'],
      },
    },
  },
  {
    id: 'open-templates',
    action: 'navigate',
    path: '/app/templates',
    label: 'Open Templates',
    labelKey: 'nav.templates',
    phrases: {
      en: {
        includes: ['open templates', 'go to templates'],
        exact: ['templates'],
      },
      es: {
        includes: ['abrir plantillas'],
        exact: ['plantillas'],
      },
      fr: {
        includes: ['ouvrir modèles', 'ouvrir modeles'],
        exact: ['modèles', 'modeles'],
      },
      de: {
        includes: ['vorlagen öffnen'],
        exact: ['vorlagen'],
      },
      ur: {
        includes: ['ٹیمپلیٹس کھولیں'],
        exact: ['ٹیمپلیٹس'],
      },
      ar: {
        includes: ['افتح القوالب'],
        exact: ['القوالب'],
      },
    },
  },
  {
    id: 'open-integrations',
    action: 'navigate',
    path: '/app/integrations',
    label: 'Open Integrations',
    labelKey: 'nav.integrations',
    phrases: {
      en: {
        includes: ['open integrations', 'go to integrations'],
        exact: ['integrations'],
      },
      es: {
        includes: ['abrir integraciones'],
        exact: ['integraciones'],
      },
      fr: {
        includes: ['ouvrir intégrations', 'ouvrir integrations'],
        exact: ['intégrations', 'integrations'],
      },
      de: {
        includes: ['integrationen öffnen'],
        exact: ['integrationen'],
      },
      ur: {
        includes: ['انٹیگریشنز کھولیں'],
        exact: ['انٹیگریشنز'],
      },
      ar: {
        includes: ['افتح التكاملات'],
        exact: ['التكاملات'],
      },
    },
  },
  {
    id: 'open-memory',
    action: 'navigate',
    path: '/app/memory',
    label: 'Open Memory',
    labelKey: 'nav.memory',
    phrases: {
      en: {
        includes: ['open memory', 'go to memory', 'view memory'],
        exact: ['memory'],
      },
      es: {
        includes: ['abrir memoria', 'ver memoria', 'ir a memoria'],
        exact: ['memoria'],
      },
      fr: {
        includes: ['ouvrir mémoire', 'ouvrir memoire', 'voir mémoire', 'voir memoire', 'aller à mémoire', 'aller a memoire'],
        exact: ['mémoire', 'memoire'],
      },
      de: {
        includes: ['speicher öffnen', 'speicher anzeigen', 'gehe zu speicher'],
        exact: ['speicher'],
      },
      ur: {
        includes: ['memory kholo', 'میموری کھولیں'],
        exact: ['میموری'],
      },
      ar: {
        includes: ['افتح الذاكرة'],
        exact: ['الذاكرة'],
      },
    },
  },
  {
    id: 'open-atelier',
    action: 'navigate',
    path: '/app/atelier',
    label: 'Open Atelier',
    labelKey: 'nav.atelier',
    phrases: {
      en: {
        includes: ['open atelier'],
        exact: ['atelier'],
      },
      es: {
        includes: ['abrir atelier'],
      },
      fr: {
        includes: ['ouvrir atelier'],
      },
      de: {
        includes: ['atelier öffnen'],
      },
      ur: {
        includes: ['atelier kholo', 'اٹیلیئر کھولیں'],
        exact: ['اٹیلیئر'],
      },
      ar: {
        includes: ['افتح المرسم', 'افتح اتيليه', 'افتح أتيليه'],
        exact: ['المرسم', 'أتيليه', 'اتيليه'],
      },
    },
  },
  {
    id: 'open-voice-twin',
    action: 'navigate',
    path: '/app/voice-twin',
    label: 'Open Voice Twin',
    labelKey: 'nav.voiceTwin',
    phrases: {
      en: {
        includes: ['open voice twin', 'voice twin'],
      },
      es: {
        includes: ['abrir voice twin'],
      },
      fr: {
        includes: ['ouvrir voice twin'],
      },
      de: {
        includes: ['voice twin öffnen'],
      },
      ur: {
        includes: ['voice twin kholo', 'وائس ٹوئن کھولیں', 'وائس ٹوئن'],
      },
      ar: {
        includes: ['افتح توأم الصوت', 'افتح توام الصوت', 'توأم الصوت', 'توام الصوت'],
      },
    },
  },
  {
    id: 'open-pulse',
    action: 'navigate',
    path: '/app/pulse',
    label: 'Open Studio Pulse',
    labelKey: 'nav.pulse',
    phrases: {
      en: {
        includes: ['open studio pulse', 'open pulse', 'studio pulse'],
        exact: ['pulse'],
      },
      es: {
        includes: ['abrir studio pulse', 'abrir pulso'],
      },
      fr: {
        includes: ['ouvrir studio pulse', 'ouvrir le pulse'],
      },
      de: {
        includes: ['studio pulse öffnen', 'pulse öffnen'],
      },
      ur: {
        includes: ['studio pulse kholo', 'pulse kholo', 'اسٹوڈیو پلس کھولیں'],
      },
      ar: {
        includes: ['افتح ستوديو بولس', 'افتح البلس', 'ستوديو بولس'],
      },
    },
  },
  {
    id: 'open-recipes',
    action: 'navigate',
    path: '/app/recipes',
    label: 'Open Recipes',
    labelKey: 'nav.recipes',
    phrases: {
      en: {
        includes: ['open recipes', 'open studio recipes', 'studio recipes'],
        exact: ['recipes'],
      },
      es: {
        includes: ['abrir recetas'],
      },
      fr: {
        includes: ['ouvrir recettes'],
      },
      de: {
        includes: ['rezepte öffnen'],
      },
      ur: {
        includes: ['recipes kholo', 'ریسیپی کھولیں'],
      },
      ar: {
        includes: ['افتح الوصفات', 'الوصفات'],
      },
    },
  },
  {
    id: 'open-compliance',
    action: 'navigate',
    path: '/app/compliance',
    label: 'Open Trust',
    labelKey: 'nav.compliance',
    phrases: {
      en: {
        includes: ['open trust', 'open compliance'],
        exact: ['trust', 'compliance'],
      },
      es: {
        includes: ['abrir confianza', 'abrir cumplimiento'],
        exact: ['confianza', 'cumplimiento'],
      },
      fr: {
        includes: ['ouvrir confiance', 'ouvrir conformité', 'ouvrir conformite'],
        exact: ['confiance', 'conformité', 'conformite'],
      },
      de: {
        includes: ['vertrauen öffnen'],
        exact: ['vertrauen'],
      },
      ur: {
        includes: ['trust kholo', 'ٹرسٹ کھولیں'],
        exact: ['ٹرسٹ'],
      },
      ar: {
        includes: ['افتح الثقة'],
        exact: ['الثقة'],
      },
    },
  },
  {
    id: 'open-settings',
    action: 'navigate',
    path: '/app/settings',
    label: 'Open Settings',
    labelKey: 'nav.settings',
    phrases: {
      en: {
        includes: ['open settings', 'go to settings'],
        exact: ['settings'],
      },
      es: {
        includes: ['abrir configuración', 'abrir configuracion'],
        exact: ['configuración', 'configuracion'],
      },
      fr: {
        includes: ['ouvrir paramètres', 'ouvrir parametres'],
        exact: ['paramètres', 'parametres'],
      },
      de: {
        includes: ['einstellungen öffnen'],
        exact: ['einstellungen'],
      },
      ur: {
        includes: ['settings kholo', 'ترتیبات کھولیں'],
        exact: ['ترتیبات'],
      },
      ar: {
        includes: ['افتح الإعدادات', 'افتح الاعدادات'],
        exact: ['الإعدادات', 'الاعدادات'],
      },
    },
  },
  {
    id: 'open-billing',
    action: 'navigate',
    path: '/app/billing',
    label: 'Open Billing',
    labelKey: 'nav.billing',
    phrases: {
      en: {
        includes: ['open billing', 'manage plan', 'manage subscription'],
        exact: ['billing'],
      },
      es: {
        includes: ['abrir facturación', 'abrir facturacion', 'gestionar plan'],
        exact: ['facturación', 'facturacion'],
      },
      fr: {
        includes: ['ouvrir facturation', 'gérer abonnement', 'gerer abonnement'],
        exact: ['facturation'],
      },
      de: {
        includes: ['abrechnung öffnen', 'abo verwalten'],
        exact: ['abrechnung'],
      },
      ur: {
        includes: ['بلنگ کھولیں'],
        exact: ['بلنگ'],
      },
      ar: {
        includes: ['افتح الفواتير', 'إدارة الخطة'],
        exact: ['الفواتير'],
      },
    },
  },
]

function normalize(text: string): string {
  return text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g, '')
}

function matchesPhraseSet(norm: string, set: PhraseSet): boolean {
  return (set.exact ?? []).some((p) => norm === p) || (set.includes ?? []).some((p) => norm.includes(p))
}

/**
 * Parse a speech-recognition transcript into an app command.
 *
 * Locale-aware: when `locale` is provided, only phrase sets for that locale
 * (plus English as a fallback) are considered. Without a locale every
 * language is matched.
 */
export function parseVoiceCommand(text: string, locale?: string): MatchedCommand | null {
  const norm = normalize(text)
  if (!norm) return null

  const langs =
    locale && (SUPPORTED_LOCALES as readonly string[]).includes(locale)
      ? [locale, 'en']
      : [...SUPPORTED_LOCALES]

  for (const def of COMMANDS) {
    for (const lang of langs) {
      const set = def.phrases[lang as keyof CommandDef['phrases']]
      if (set && matchesPhraseSet(norm, set)) {
        return {
          commandId: def.id,
          action: def.action,
          path: def.path,
          actionType: def.actionType,
          pathHint: def.pathHint,
          label: def.label,
          labelKey: def.labelKey,
          confirm: def.confirm,
        }
      }
    }
  }
  return null
}
