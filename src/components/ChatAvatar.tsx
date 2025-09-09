import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";

interface ChatAvatarProps {
  isVoiceMode: boolean;
}

const API_URL = "http://127.0.0.1:8000";

const ChatAvatar = ({ isVoiceMode }: ChatAvatarProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [mouthMovement, setMouthMovement] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);

  // Animate pulse and mouth movement
  useEffect(() => {
    if (isListening || isSpeaking) {
      const pulseInterval = setInterval(() => setPulseIntensity(Math.random() * 100), 200);
      const mouthInterval = setInterval(() => setMouthMovement(Math.random() * 40 + 10), 150);
      return () => {
        clearInterval(pulseInterval);
        clearInterval(mouthInterval);
      };
    } else {
      setPulseIntensity(0);
      setMouthMovement(0);
    }
  }, [isListening, isSpeaking]);

  // Play TTS from base64
  const playAudio = useCallback(async (base64: string) => {
  try {
    setIsSpeaking(true);

    // Convert base64 to ArrayBuffer
    const res = await fetch(`data:audio/mp3;base64,${base64}`);
    const arrayBuffer = await res.arrayBuffer();

    // Create AudioContext for reliable playback
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    const buffer = await audioCtx.decodeAudioData(arrayBuffer);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(audioCtx.destination);

    source.onended = () => setIsSpeaking(false);
    source.start(0);
  } catch (err) {
    console.error("Error playing AI audio:", err);
    setIsSpeaking(false);
  }
}, []);


  // Send audio blob to /voice endpoint
  const sendVoiceToAI = useCallback(async (audioBlob: Blob) => {
    const formData = new FormData();
    formData.append("file", audioBlob, "voice.wav");

    try {
      const res = await fetch(`${API_URL}/voice`, { method: "POST", body: formData });
      const data = await res.json();
      if (data.audio_base64) await playAudio(data.audio_base64);
    } catch (err) {
      console.error("Voice API error:", err);
      setIsSpeaking(false);
    }
  }, [playAudio]);

  // Start recording
  const startVoice = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // const recorder = new MediaRecorder(stream);
      const recorder = new MediaRecorder(stream, { mimeType: "audio/webm" });

      mediaRecorderRef.current = recorder;
      audioChunksRef.current = [];

      recorder.ondataavailable = (e: BlobEvent) => audioChunksRef.current.push(e.data);

      recorder.onstop = async () => {
        setIsListening(false);
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
        await sendVoiceToAI(audioBlob);

        // Continuous listening
        if (isVoiceMode) startVoice();
      };

      recorder.start();
      setIsListening(true);

      // Auto-stop after max duration (optional)
      setTimeout(() => {
        if (recorder.state !== "inactive") recorder.stop();
      }, 4000); // 4 sec chunks
    } catch (err) {
      console.error("Error accessing mic:", err);
    }
  }, [isVoiceMode, sendVoiceToAI]);

  // Stop recording
  const stopVoice = useCallback(() => {
    mediaRecorderRef.current?.stop();
    setIsListening(false);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Auto-start/stop voice mode
  useEffect(() => {
    if (isVoiceMode) startVoice();
    else stopVoice();

    return () => stopVoice();
  }, [isVoiceMode, startVoice, stopVoice]);

  // === Avatar UI (animations kept intact) ===
  return (
    <div className="flex flex-col items-center justify-center h-full">
      <div className="relative">
        {/* Outer pulse rings */}
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-ai-primary/30 transition-all duration-500",
            isListening && "animate-ping scale-150"
          )}
        />
        <div
          className={cn(
            "absolute inset-0 rounded-full border-2 border-ai-secondary/30 transition-all duration-700 delay-100",
            isListening && "animate-ping scale-125"
          )}
        />

        {/* Main avatar */}
        <div
          className={cn(
            "w-32 h-32 rounded-full bg-gradient-avatar shadow-avatar transition-all duration-300 flex items-center justify-center",
            isListening && "scale-110 shadow-lg"
          )}
          style={{
            boxShadow: isListening
              ? `0 0 ${20 + pulseIntensity / 2}px hsl(var(--ai-primary) / 0.6)`
              : "var(--shadow-avatar)",
          }}
        >
          <div className="relative w-full h-full rounded-full overflow-hidden">
            {/* Eyes */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2 flex space-x-3">
              <div
                className={cn(
                  "w-3 h-3 bg-background rounded-full transition-all duration-300",
                  isListening && "animate-pulse"
                )}
              />
              <div
                className={cn(
                  "w-3 h-3 bg-background rounded-full transition-all duration-300",
                  isListening && "animate-pulse"
                )}
              />
            </div>

            {/* Mouth */}
            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2">
              <div
                className={cn(
                  "w-8 h-4 border-2 border-background rounded-b-full transition-all duration-200",
                  (isListening || isSpeaking) && "animate-bounce"
                )}
                style={{
                  transform: isSpeaking
                    ? `scaleY(${0.3 + mouthMovement / 100}) scaleX(${1 + mouthMovement / 100})`
                    : isListening
                    ? `scaleY(${0.5 + pulseIntensity / 200})`
                    : "scaleY(0.5)",
                }}
              />
            </div>

            {/* Listening waves */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-background/80 rounded-full animate-pulse"
                      style={{
                        height: `${10 + (pulseIntensity / 10) * Math.sin(Date.now() / 200 + i)}px`,
                        animationDelay: `${i * 100}ms`,
                      }}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Status text */}
      <div className="mt-6 text-center">
        <h3 className="text-lg font-semibold bg-gradient-ai bg-clip-text text-transparent">AI Assistant</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Ready to chat"}
        </p>

        {(isListening || isSpeaking) && (
          <div className="mt-4 flex justify-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn("w-2 h-2 rounded-full animate-bounce", isSpeaking ? "bg-ai-secondary" : "bg-ai-primary")}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          {isSpeaking
            ? "I'm responding..."
            : isListening
            ? "Speak naturally - I'm listening"
            : "Click the microphone to start voice conversation"}
        </p>
      </div>
    </div>
  );
};

export default ChatAvatar;
