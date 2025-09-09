import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ChatAvatar from "./ChatAvatar";

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

interface Message {
  id: string;
  content: string;
  isUser: boolean;
  timestamp: Date;
}

const API_URL = "http://127.0.0.1:8000";

const ChatInterface = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      content: "Hello! I'm your AI assistant. How can I help you today?",
      isUser: false,
      timestamp: new Date(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [recognitionActive, setRecognitionActive] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);
  const speechSynthesisRef = useRef<SpeechSynthesisUtterance | null>(null);
  const { toast } = useToast();

  // Initialize speech recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognitionAPI =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = "en-US";

        recognitionRef.current.onresult = (event: any) => {
          const transcript =
            event.results[event.results.length - 1][0].transcript;
          if (transcript.trim()) {
            toast({
              title: "Voice Input Detected",
              description: `Heard: "${transcript}"`,
            });
            processMessage(transcript);
          }
        };

        recognitionRef.current.onerror = (event: any) => {
          console.error("Speech recognition error:", event.error);
          setIsListening(false);
          setRecognitionActive(false);
          toast({
            title: "Voice Recognition Error",
            description: "Please try again",
            variant: "destructive",
          });
        };

        recognitionRef.current.onend = () => {
          if (recognitionActive && isVoiceMode) {
            setTimeout(() => {
              if (recognitionRef.current && recognitionActive && isVoiceMode) {
                recognitionRef.current.start();
              }
            }, 100);
          }
        };
      }
    }

    return () => {
      if (recognitionRef.current) recognitionRef.current.stop();
      if (speechSynthesisRef.current) speechSynthesis.cancel();
    };
  }, [recognitionActive, isVoiceMode]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => scrollToBottom(), [messages]);

  // === NEW: Call backend LLM for text messages ===
  const getLLMResponse = async (userInput: string) => {
    try {
      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput }),
      });
      const data = await res.json();
      return data.assistant || "No response from server.";
    } catch (error) {
      console.error("Error getting AI response:", error);
      return "Sorry, server is unreachable.";
    }
  };

  // Text-to-Speech
  const speakText = useCallback((text: string) => {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      const voices = speechSynthesis.getVoices();
      const preferredVoice =
        voices.find(
          (voice) =>
            voice.lang.startsWith("en") && voice.name.includes("Google")
        ) || voices.find((voice) => voice.lang.startsWith("en"));

      if (preferredVoice) utterance.voice = preferredVoice;

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // === Process message typed or voice ===
  const processMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      isUser: true,
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");

    try {
      const aiResponseText = await getLLMResponse(messageText);
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);

      if (isVoiceMode) speakText(aiResponseText);
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => processMessage(inputValue);
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceMode = () => {
    const newVoiceMode = !isVoiceMode;
    setIsVoiceMode(newVoiceMode);

    if (newVoiceMode) {
      if (recognitionRef.current) {
        setRecognitionActive(true);
        setIsListening(true);
        try {
          recognitionRef.current.start();
          toast({
            title: "Voice Mode Activated",
            description: "Listening for your voice...",
          });
        } catch (error) {
          console.error(error);
          setIsListening(false);
          setRecognitionActive(false);
        }
      } else {
        toast({
          title: "Voice Not Supported",
          description: "Your browser doesn't support voice recognition",
          variant: "destructive",
        });
        setIsVoiceMode(false);
      }
    } else {
      setRecognitionActive(false);
      setIsListening(false);
      if (recognitionRef.current) recognitionRef.current.stop();
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
        setIsSpeaking(false);
      }
      toast({
        title: "Voice Mode Deactivated",
        description: "Switched back to text mode",
      });
    }
  };

  return (
    <div className="flex h-screen bg-gradient-chat">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto">
        <header className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-ai bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-muted-foreground">
                Your intelligent chat companion
              </p>
            </div>
            <Button
              onClick={toggleVoiceMode}
              variant={isVoiceMode ? "default" : "outline"}
              size="lg"
              className={cn(
                "transition-all duration-300",
                isVoiceMode && "bg-gradient-ai shadow-ai"
              )}
            >
              {isVoiceMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              {isVoiceMode ? "Exit Voice" : "Voice Mode"}
            </Button>
          </div>
        </header>

        <div className="flex-1 flex">
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.isUser ? "justify-end" : "justify-start"
                  )}
                >
                  <Card
                    className={cn(
                      "max-w-[80%] p-4 transition-all duration-300",
                      message.isUser
                        ? "bg-gradient-ai text-primary-foreground shadow-ai"
                        : "bg-card border-border/50 shadow-chat"
                    )}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                    <p className="text-xs opacity-70 mt-2">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </Card>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {!isVoiceMode && (
              <div className="p-6 border-t border-border/50">
                <div className="flex gap-3">
                  <Input
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 bg-secondary/50 border-border/50 focus:border-ai-primary transition-colors"
                  />
                  <Button
                    onClick={handleSendMessage}
                    disabled={!inputValue.trim()}
                    className="bg-gradient-ai shadow-ai hover:shadow-lg transition-all duration-300"
                  >
                    <Send className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>

          {isVoiceMode && (
            <div className="w-80 border-l border-border/50 p-6">
              <ChatAvatar
                isListening={isListening}
                isVoiceMode={isVoiceMode}
                isSpeaking={isSpeaking}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
