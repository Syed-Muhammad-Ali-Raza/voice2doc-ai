export interface MatchedCommand {
  commandId: string
  action: 'navigate' | 'voice-action'
  path?: string
  actionType?: string
  pathHint?: string
  label: string
}

export function parseVoiceCommand(text: string): MatchedCommand | null {
  const norm = text.toLowerCase().trim().replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?]/g,"");
  
  // 1. Start recording
  if (
    norm.includes('start recording') ||
    norm.includes('begin recording') ||
    norm.includes('start record') ||
    norm.includes('iniciar grabación') ||
    norm.includes('iniciar grabacion') ||
    norm.includes('comenzar grabación') ||
    norm.includes('comenzar grabacion') ||
    norm.includes('démarrer l\'enregistrement') ||
    norm.includes('demarrer l\'enregistrement') ||
    norm.includes('commencer l\'enregistrement') ||
    norm.includes('commencer lenregistrement') ||
    norm.includes('aufnahme starten') ||
    norm.includes('aufnahme beginnen') ||
    norm.includes('recording shuru') ||
    norm.includes('ریکارڈنگ شروع') ||
    norm.includes('ابدأ التسجيل') ||
    norm.includes('ابدا التسجيل') ||
    norm === 'record' ||
    norm === 'grabar' ||
    norm === 'enregistrer' ||
    norm === 'aufnehmen' ||
    norm === 'ریکارڈ' ||
    norm === 'تسجيل'
  ) {
    return {
      commandId: 'start-recording',
      action: 'voice-action',
      actionType: 'start-recording',
      pathHint: '/app/record',
      label: 'Start recording',
    }
  }

  // 2. Stop recording
  if (
    norm.includes('stop recording') ||
    norm.includes('end recording') ||
    norm.includes('stop record') ||
    norm.includes('detener grabación') ||
    norm.includes('detener grabacion') ||
    norm.includes('parar grabación') ||
    norm.includes('parar grabacion') ||
    norm.includes('arrêter l\'enregistrement') ||
    norm.includes('arreter l\'enregistrement') ||
    norm.includes('arrêter lenregistrement') ||
    norm.includes('stopper l\'enregistrement') ||
    norm.includes('aufnahme stoppen') ||
    norm.includes('aufnahme beenden') ||
    norm.includes('recording roko') ||
    norm.includes('recording stop') ||
    norm.includes('ریکارڈنگ روکیں') ||
    norm.includes('أوقف التسجيل') ||
    norm.includes('اوقف التسجيل') ||
    norm.includes('وقف التسجيل')
  ) {
    return {
      commandId: 'stop-recording',
      action: 'voice-action',
      actionType: 'stop-recording',
      label: 'Stop recording',
    }
  }

  // 3. Export to Notion
  if (
    norm.includes('export to notion') ||
    norm.includes('send to notion') ||
    norm.includes('notion export') ||
    norm.includes('exportar a notion') ||
    norm.includes('enviar a notion') ||
    norm.includes('exporter vers notion') ||
    norm.includes('exporter a notion') ||
    norm.includes('envoyer à notion') ||
    norm.includes('envoyer a notion') ||
    norm.includes('nach notion exportieren') ||
    norm.includes('an notion senden') ||
    norm.includes('notion export') ||
    norm.includes('نویشن میں ایکسپورٹ') ||
    norm.includes('تصدير إلى نوشن') ||
    norm.includes('تصدير الى نوشن') ||
    norm === 'notion' ||
    norm === 'نوشن' ||
    norm === 'نویشن'
  ) {
    return {
      commandId: 'export-notion',
      action: 'voice-action',
      actionType: 'export-notion',
      pathHint: '/app/editor',
      label: 'Export to Notion',
    }
  }

  // 4. Open Memory
  if (
    norm.includes('open memory') ||
    norm.includes('go to memory') ||
    norm.includes('view memory') ||
    norm.includes('abrir memoria') ||
    norm.includes('ver memoria') ||
    norm.includes('ir a memoria') ||
    norm.includes('ouvrir mémoire') ||
    norm.includes('ouvrir memoire') ||
    norm.includes('voir mémoire') ||
    norm.includes('voir memoire') ||
    norm.includes('aller à mémoire') ||
    norm.includes('aller a memoire') ||
    norm.includes('speicher öffnen') ||
    norm.includes('speicher anzeigen') ||
    norm.includes('gehe zu speicher') ||
    norm.includes('memory kholo') ||
    norm.includes('میموری کھولیں') ||
    norm.includes('افتح الذاكرة') ||
    norm === 'memory' ||
    norm === 'memoria' ||
    norm === 'mémoire' ||
    norm === 'memoire' ||
    norm === 'speicher' ||
    norm === 'میموری' ||
    norm === 'الذاكرة'
  ) {
    return {
      commandId: 'open-memory',
      action: 'navigate',
      path: '/app/memory',
      label: 'Open Memory',
    }
  }

  // 5. Open Settings
  if (
    norm.includes('open settings') ||
    norm.includes('go to settings') ||
    norm.includes('abrir configuración') ||
    norm.includes('abrir configuracion') ||
    norm.includes('ouvrir paramètres') ||
    norm.includes('ouvrir parametres') ||
    norm.includes('einstellungen öffnen') ||
    norm.includes('settings kholo') ||
    norm.includes('ترتیبات کھولیں') ||
    norm.includes('افتح الإعدادات') ||
    norm.includes('افتح الاعدادات') ||
    norm === 'settings' ||
    norm === 'configuración' ||
    norm === 'configuracion' ||
    norm === 'paramètres' ||
    norm === 'parametres' ||
    norm === 'einstellungen' ||
    norm === 'ترتیبات' ||
    norm === 'الإعدادات' ||
    norm === 'الاعدادات'
  ) {
    return {
      commandId: 'open-settings',
      action: 'navigate',
      path: '/app/settings',
      label: 'Open Settings',
    }
  }

  // 6. Open Atelier
  if (
    norm.includes('open atelier') ||
    norm.includes('abrir atelier') ||
    norm.includes('ouvrir atelier') ||
    norm.includes('atelier öffnen') ||
    norm.includes('atelier kholo') ||
    norm.includes('اٹیلیئر کھولیں') ||
    norm.includes('افتح المرسم') ||
    norm.includes('افتح اتيليه') ||
    norm.includes('افتح أتيليه') ||
    norm === 'atelier' ||
    norm === 'اٹیلیئر' ||
    norm === 'المرسم' ||
    norm === 'أتيليه' ||
    norm === 'اتيليه'
  ) {
    return {
      commandId: 'open-atelier',
      action: 'navigate',
      path: '/app/atelier',
      label: 'Open Atelier',
    }
  }

  // 7. Open Voice Twin
  if (
    norm.includes('open voice twin') ||
    norm.includes('abrir voice twin') ||
    norm.includes('ouvrir voice twin') ||
    norm.includes('voice twin öffnen') ||
    norm.includes('voice twin kholo') ||
    norm.includes('وائس ٹوئن کھولیں') ||
    norm.includes('افتح توأم الصوت') ||
    norm.includes('افتح توام الصوت') ||
    norm.includes('voice twin') ||
    norm.includes('وائس ٹوئن') ||
    norm.includes('توأم الصوت') ||
    norm.includes('توام الصوت')
  ) {
    return {
      commandId: 'open-voice-twin',
      action: 'navigate',
      path: '/app/voice-twin',
      label: 'Open Voice Twin',
    }
  }

  // 8. Open Documents
  if (
    norm.includes('open documents') ||
    norm.includes('go to documents') ||
    norm.includes('abrir documentos') ||
    norm.includes('ouvrir documents') ||
    norm.includes('dokumente öffnen') ||
    norm.includes('documents kholo') ||
    norm.includes('دستاویزات کھولیں') ||
    norm.includes('افتح المستندات') ||
    norm === 'documents' ||
    norm === 'documentos' ||
    norm === 'dokumente' ||
    norm === 'دستاویزات' ||
    norm === 'المستندات'
  ) {
    return {
      commandId: 'open-documents',
      action: 'navigate',
      path: '/app/documents',
      label: 'Open Documents',
    }
  }

  // 9. Open Trust / Compliance
  if (
    norm.includes('open trust') ||
    norm.includes('open compliance') ||
    norm.includes('abrir confianza') ||
    norm.includes('abrir cumplimiento') ||
    norm.includes('ouvrir confiance') ||
    norm.includes('ouvrir conformité') ||
    norm.includes('ouvrir conformite') ||
    norm.includes('vertrauen öffnen') ||
    norm.includes('trust kholo') ||
    norm.includes('ٹرسٹ کھولیں') ||
    norm.includes('افتح الثقة') ||
    norm === 'trust' ||
    norm === 'compliance' ||
    norm === 'confianza' ||
    norm === 'cumplimiento' ||
    norm === 'confiance' ||
    norm === 'conformité' ||
    norm === 'conformite' ||
    norm === 'ٹرسٹ' ||
    norm === 'الثقة'
  ) {
    return {
      commandId: 'open-compliance',
      action: 'navigate',
      path: '/app/compliance',
      label: 'Open Trust',
    }
  }

  return null
}
