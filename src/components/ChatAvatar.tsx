import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ChatAvatarProps {
  isListening: boolean;
  isVoiceMode: boolean;
  isSpeaking?: boolean;
}

const ChatAvatar = ({ isListening, isVoiceMode, isSpeaking = false }: ChatAvatarProps) => {
  const [pulseIntensity, setPulseIntensity] = useState(0);
  const [mouthMovement, setMouthMovement] = useState(0);

  useEffect(() => {
    if (isListening || isSpeaking) {
      const interval = setInterval(() => {
        setPulseIntensity(Math.random() * 100);
      }, 200);
      return () => clearInterval(interval);
    } else {
      setPulseIntensity(0);
    }
  }, [isListening, isSpeaking]);

  // Mouth movement animation for speaking
  useEffect(() => {
    if (isSpeaking) {
      const interval = setInterval(() => {
        setMouthMovement(Math.random() * 40 + 10);
      }, 150);
      return () => clearInterval(interval);
    } else {
      setMouthMovement(0);
    }
  }, [isSpeaking]);

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
              : "var(--shadow-avatar)"
          }}
        >
          {/* Avatar face */}
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
            
            {/* Mouth - animated based on voice activity */}
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
                    : "scaleY(0.5)"
                }}
              />
            </div>
            
            {/* Listening indicator waves */}
            {isListening && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-background/80 rounded-full animate-pulse"
                      style={{
                        height: `${10 + (pulseIntensity / 10) * Math.sin(Date.now() / 200 + i)}px`,
                        animationDelay: `${i * 100}ms`
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
        <h3 className="text-lg font-semibold bg-gradient-ai bg-clip-text text-transparent">
          AI Assistant
        </h3>
        <p className="text-sm text-muted-foreground mt-1">
          {isSpeaking ? "Speaking..." : isListening ? "Listening..." : "Ready to chat"}
        </p>
        
        {/* Voice activity indicator */}
        {(isListening || isSpeaking) && (
          <div className="mt-4 flex justify-center space-x-1">
            {[...Array(3)].map((_, i) => (
              <div
                key={i}
                className={cn(
                  "w-2 h-2 rounded-full animate-bounce",
                  isSpeaking ? "bg-ai-secondary" : "bg-ai-primary"
                )}
                style={{ animationDelay: `${i * 200}ms` }}
              />
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-8 p-4 bg-card/50 rounded-lg border border-border/50">
        <p className="text-xs text-muted-foreground text-center">
          {isSpeaking 
            ? "I'm responding to your message..."
            : isListening 
            ? "Speak naturally - I'm listening to your voice"
            : "Click the microphone to start voice conversation"
          }
        </p>
      </div>
    </div>
  );
};

export default ChatAvatar;