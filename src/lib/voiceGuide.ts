export type VoiceTourId = 'welcome' | 'record' | 'memory' | 'settings' | 'atelier' | 'help' | 'echo' | 'voiceTwin'

export interface VoiceTour {
  id: VoiceTourId
  titleKey: string
  steps: string[]
}

/** Spoken demo scripts — Voice2Doc teaches itself by voice. */
export const VOICE_TOURS: VoiceTour[] = [
  {
    id: 'welcome',
    titleKey: 'voiceGuide.tourWelcome',
    steps: [
      'Welcome to Voice2Doc. This is your spoken studio guide.',
      'You can record or upload audio, and AI turns it into a polished document.',
      'Use the sidebar to open Documents, Record, Memory, Atelier, and Settings.',
      'Tap the voice guide anytime you want a short walkthrough.',
    ],
  },
  {
    id: 'record',
    titleKey: 'voiceGuide.tourRecord',
    steps: [
      'To create a document from voice, open Record in the sidebar.',
      'Allow microphone access, then press the record button and speak naturally.',
      'When you stop, choose document type, tone, and length, then start processing.',
      'You will see stages: uploading, transcribing, understanding, formatting, and finalizing.',
    ],
  },
  {
    id: 'memory',
    titleKey: 'voiceGuide.tourMemory',
    steps: [
      'Meeting Memory keeps decisions and actions across Zoom, Meet, and Teams imports.',
      'Open Memory to see threads. Recurring decisions are linked automatically.',
      'Select a thread to view linked meetings, speakers, and action owners.',
      'Mark a thread resolved when the follow-up is done.',
    ],
  },
  {
    id: 'settings',
    titleKey: 'voiceGuide.tourSettings',
    steps: [
      'Open Settings to personalize your studio.',
      'Change language, including Urdu and Arabic with right-to-left layout.',
      'Pick an accent color and typography pair. The whole app updates live.',
      'Your preferences sync to your account when you are logged in.',
    ],
  },
  {
    id: 'atelier',
    titleKey: 'voiceGuide.tourAtelier',
    steps: [
      'Document Atelier is where brand and tone live.',
      'Create a brand kit with logo text, accent color, and letterhead.',
      'Save a Tone DNA profile such as Board brief or Customer email.',
      'Preview applies letterhead and shows a tone fit score for your draft.',
    ],
  },
  {
    id: 'help',
    titleKey: 'voiceGuide.tourHelp',
    steps: [
      'Need written help? Open Help Center from the website footer.',
      'Privacy Policy explains how audio and integrations are handled.',
      'Contact us if you are stuck. Demo mode replies instantly.',
      'The Studio AI chatbot in the app shell can answer product questions beside the editor.',
    ],
  },
  {
    id: 'echo',
    titleKey: 'voiceGuide.tourEcho',
    steps: [
      'Echo Score measures how much of what you said survived into the finished document.',
      'Open any document in the editor to see the score, lost phrases, and restore tips.',
      'Rescore after edits to check whether commitments and action items are still present.',
      'Tap Restore on a lost phrase to drop it back into the draft as a bullet.',
    ],
  },
  {
    id: 'voiceTwin',
    titleKey: 'voiceGuide.tourVoiceTwin',
    steps: [
      'Voice Twin learns how you write from past documents.',
      'Open Voice Twin in the sidebar, pick source docs, and train a versioned twin.',
      'Optionally include Meeting Memory decisions as tone hints.',
      'In the editor, tap Sound like me to rewrite the draft in your voice.',
    ],
  },
]

export function getTour(id: VoiceTourId): VoiceTour {
  return VOICE_TOURS.find((t) => t.id === id) ?? VOICE_TOURS[0]!
}

export function speechSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function stopVoiceGuide() {
  if (!speechSupported()) return
  window.speechSynthesis.cancel()
}

/** Speak tour steps sequentially using the browser Speech Synthesis API. */
export function playVoiceGuide(
  tourId: VoiceTourId,
  opts?: { lang?: string; onEnd?: () => void; onStep?: (index: number) => void },
): void {
  if (!speechSupported()) {
    opts?.onEnd?.()
    return
  }
  stopVoiceGuide()
  const tour = getTour(tourId)
  const lang = opts?.lang || 'en-US'
  let i = 0

  const speakNext = () => {
    if (i >= tour.steps.length) {
      opts?.onEnd?.()
      return
    }
    opts?.onStep?.(i)
    const utter = new SpeechSynthesisUtterance(tour.steps[i])
    utter.lang = lang
    utter.rate = 1
    utter.onend = () => {
      i += 1
      speakNext()
    }
    utter.onerror = () => {
      i += 1
      speakNext()
    }
    window.speechSynthesis.speak(utter)
  }

  speakNext()
}

export function localeToSpeechLang(locale: string): string {
  const map: Record<string, string> = {
    en: 'en-US',
    es: 'es-ES',
    fr: 'fr-FR',
    de: 'de-DE',
    ur: 'ur-PK',
    ar: 'ar-SA',
  }
  return map[locale] || 'en-US'
}
