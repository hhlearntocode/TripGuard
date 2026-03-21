export interface VoiceChatRecorderResult {
  isSupported: boolean;
  isRecording: boolean;
  isConnecting: boolean;
  liveTranscript: string;
  voiceError: string | null;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<string>;
  clearVoiceError: () => void;
  clearTranscript: () => void;
}

export function useVoiceChatRecorder(_: () => Promise<string>): VoiceChatRecorderResult {
  return {
    isSupported: false,
    isRecording: false,
    isConnecting: false,
    liveTranscript: "",
    voiceError: null,
    startRecording: async () => {},
    stopRecording: async () => "",
    clearVoiceError: () => {},
    clearTranscript: () => {},
  };
}
