import { describe, expect, it } from 'vitest'
import { parseVoiceCommand } from './speechRecognition'

describe('Speech Recognition Command Parsing', () => {
  it('identifies start-recording command across multiple languages', () => {
    expect(parseVoiceCommand('Start recording')?.commandId).toBe('start-recording')
    expect(parseVoiceCommand('iniciar grabación')?.commandId).toBe('start-recording')
    expect(parseVoiceCommand('démarrer l\'enregistrement')?.commandId).toBe('start-recording')
    expect(parseVoiceCommand('aufnahme starten')?.commandId).toBe('start-recording')
    expect(parseVoiceCommand('recording shuru karo')?.commandId).toBe('start-recording')
    expect(parseVoiceCommand('ابدا التسجيل')?.commandId).toBe('start-recording')
  })

  it('identifies stop-recording command across multiple languages', () => {
    expect(parseVoiceCommand('stop recording')?.commandId).toBe('stop-recording')
    expect(parseVoiceCommand('detener grabacion')?.commandId).toBe('stop-recording')
    expect(parseVoiceCommand('arrêter l\'enregistrement')?.commandId).toBe('stop-recording')
    expect(parseVoiceCommand('recording roko')?.commandId).toBe('stop-recording')
  })

  it('identifies export-notion command across multiple languages', () => {
    expect(parseVoiceCommand('Export to Notion')?.commandId).toBe('export-notion')
    expect(parseVoiceCommand('send to Notion')?.commandId).toBe('export-notion')
    expect(parseVoiceCommand('exportar a notion')?.commandId).toBe('export-notion')
    expect(parseVoiceCommand('exporter vers notion')?.commandId).toBe('export-notion')
    expect(parseVoiceCommand('notion export')?.commandId).toBe('export-notion')
  })

  it('identifies navigation commands', () => {
    expect(parseVoiceCommand('Open Memory')?.commandId).toBe('open-memory')
    expect(parseVoiceCommand('go to memory')?.commandId).toBe('open-memory')
    expect(parseVoiceCommand('memory')?.commandId).toBe('open-memory')

    expect(parseVoiceCommand('Open Settings')?.commandId).toBe('open-settings')
    expect(parseVoiceCommand('open atelier')?.commandId).toBe('open-atelier')
    expect(parseVoiceCommand('open voice twin')?.commandId).toBe('open-voice-twin')
    expect(parseVoiceCommand('open trust')?.commandId).toBe('open-compliance')
    expect(parseVoiceCommand('open documents')?.commandId).toBe('open-documents')
  })

  it('identifies the expanded navigation commands', () => {
    expect(parseVoiceCommand('go home')?.commandId).toBe('open-dashboard')
    expect(parseVoiceCommand('dashboard')?.commandId).toBe('open-dashboard')
    expect(parseVoiceCommand('new recording')?.commandId).toBe('open-record')
    expect(parseVoiceCommand('upload audio')?.commandId).toBe('open-upload')
    expect(parseVoiceCommand('open templates')?.commandId).toBe('open-templates')
    expect(parseVoiceCommand('open integrations')?.commandId).toBe('open-integrations')
    expect(parseVoiceCommand('open billing')?.commandId).toBe('open-billing')
    expect(parseVoiceCommand('manage subscription')?.commandId).toBe('open-billing')
  })

  it('is locale-aware when a locale is provided', () => {
    expect(parseVoiceCommand('abrir memoria', 'es')?.commandId).toBe('open-memory')
    expect(parseVoiceCommand('ouvrir mémoire', 'fr')?.commandId).toBe('open-memory')
    expect(parseVoiceCommand('speicher öffnen', 'de')?.commandId).toBe('open-memory')

    // English always remains a fallback inside any locale
    expect(parseVoiceCommand('open memory', 'es')?.commandId).toBe('open-memory')

    // Phrases from other locales are ignored for the active locale
    expect(parseVoiceCommand('abrir memoria', 'en')).toBeNull()
    expect(parseVoiceCommand('iniciar grabación', 'en')).toBeNull()
    expect(parseVoiceCommand('aufnahme starten', 'es')).toBeNull()
  })

  it('marks impactful commands as needing confirmation', () => {
    expect(parseVoiceCommand('stop recording')?.confirm).toBe(true)
    expect(parseVoiceCommand('export to notion')?.confirm).toBe(true)
    expect(parseVoiceCommand('start recording')?.confirm).toBeFalsy()
    expect(parseVoiceCommand('open memory')?.confirm).toBeFalsy()
  })

  it('exposes translated label keys and stable paths', () => {
    const memory = parseVoiceCommand('open memory')
    expect(memory?.labelKey).toBe('nav.memory')
    expect(memory?.path).toBe('/app/memory')
    expect(memory?.action).toBe('navigate')

    const start = parseVoiceCommand('start recording')
    expect(start?.labelKey).toBe('voiceGuide.cmdStartRecording')
    expect(start?.actionType).toBe('start-recording')
    expect(start?.pathHint).toBe('/app/record')
  })

  it('returns null for unrecognized text', () => {
    expect(parseVoiceCommand('Hello world')).toBeNull()
    expect(parseVoiceCommand('What is the weather today?')).toBeNull()
  })
})
