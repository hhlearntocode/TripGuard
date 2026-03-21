import { CommitStrategy, useScribe } from "@elevenlabs/react";
import { useEffect, useRef, useState } from "react";

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

const buildTranscript = (committed: string, partial: string) =>
  [committed.trim(), partial.trim()].filter(Boolean).join(" ").trim();

export function useVoiceChatRecorder(fetchToken: () => Promise<string>): VoiceChatRecorderResult {
  const [liveTranscript, setLiveTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const committedTranscriptRef = useRef("");
  const partialTranscriptRef = useRef("");

  const scribe = useScribe({
    modelId: "scribe_v2_realtime",
    languageCode: "en",
    commitStrategy: CommitStrategy.VAD,
    vadSilenceThresholdSecs: 0.6,
    minSpeechDurationMs: 100,
    minSilenceDurationMs: 300,
    onPartialTranscript: ({ text }) => {
      partialTranscriptRef.current = text.trim();
      setLiveTranscript(buildTranscript(committedTranscriptRef.current, partialTranscriptRef.current));
    },
    onCommittedTranscript: ({ text }) => {
      const nextText = text.trim();
      if (!nextText) return;
      committedTranscriptRef.current = buildTranscript(committedTranscriptRef.current, nextText);
      partialTranscriptRef.current = "";
      setLiveTranscript(committedTranscriptRef.current);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Voice transcription failed.";
      setVoiceError(message);
    },
  });

  const isSupported =
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function";

  const clearTranscript = () => {
    committedTranscriptRef.current = "";
    partialTranscriptRef.current = "";
    setLiveTranscript("");
    scribe.clearTranscripts();
  };

  const startRecording = async () => {
    if (!isSupported) {
      setVoiceError("Microphone is not available in this browser.");
      return;
    }

    try {
      setVoiceError(null);
      clearTranscript();
      const token = await fetchToken();
      await scribe.connect({
        token,
        languageCode: "en",
        microphone: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not start voice recording.";
      setVoiceError(message);
      scribe.disconnect();
    }
  };

  const stopRecording = async () => {
    if (scribe.isConnected) {
      scribe.disconnect();
      await new Promise((resolve) => window.setTimeout(resolve, 160));
    }

    const committed = committedTranscriptRef.current.trim();
    const partial = partialTranscriptRef.current.trim();
    const finalTranscript = committed && partial
      ? `${committed} ${partial}`.trim()
      : committed || partial || liveTranscript.trim();
    if (finalTranscript) {
      setLiveTranscript(finalTranscript);
    }
    return finalTranscript;
  };

  useEffect(() => {
    return () => {
      scribe.disconnect();
    };
  }, [scribe.disconnect]);

  return {
    isSupported,
    isRecording: scribe.isConnected,
    isConnecting: scribe.status === "connecting",
    liveTranscript,
    voiceError: voiceError ?? scribe.error,
    startRecording,
    stopRecording,
    clearVoiceError: () => setVoiceError(null),
    clearTranscript,
  };
}
