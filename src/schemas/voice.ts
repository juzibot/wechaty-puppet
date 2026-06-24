export interface VoiceTextPayload {
  text     : string,   // the ASR (voice-to-text) result; empty string when no valid speech
  noSpeech : boolean,  // true when the puppet ASR confirmed the voice has no valid speech
                       // (e.g. WeCom EMPTY_VOICE_TEXT_2070), so the bot can skip its own paid ASR
}
