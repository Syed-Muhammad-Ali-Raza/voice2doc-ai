/** Options shared by every OpenAI-compatible call (OpenAI, Groq, etc.). */
export function openAIOptions(apiKey: string) {
  const baseURL = process.env.OPENAI_BASE_URL?.replace(/\/$/, '')
  return baseURL ? { apiKey, baseURL } : { apiKey }
}
