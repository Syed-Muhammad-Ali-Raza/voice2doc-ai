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

  it('returns null for unrecognized text', () => {
    expect(parseVoiceCommand('Hello world')).toBeNull()
    expect(parseVoiceCommand('What is the weather today?')).toBeNull()
  })
})
