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
    MediaRecorder: any;
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
    { id: "1", content: "Hello! I'm your AI assistant. How can I help you today?", isUser: false, timestamp: new Date() }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const { toast } = useToast();

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  useEffect(() => scrollToBottom(), [messages]);

  // === Text / Chat API ===
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
      console.error(error);
      return "Server not reachable.";
    }
  };

  const speakAudioBase64 = async (base64: string) => {
    const audio = new Audio(`data:audio/mp3;base64,${base64}`);
    setIsSpeaking(true);
    audio.play();
    audio.onended = () => setIsSpeaking(false);
  };

  // === Handle voice input through /voice endpoint ===
  const startVoiceRecording = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast({ title: "Error", description: "Microphone not supported", variant: "destructive" });
      return;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    setMediaRecorder(recorder);
    audioChunksRef.current = [];

    recorder.ondataavailable = (e: BlobEvent) => audioChunksRef.current.push(e.data);

    recorder.onstop = async () => {
      const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
      const formData = new FormData();
      formData.append("file", audioBlob, "voice.wav");

      try {
        const res = await fetch(`${API_URL}/voice`, { method: "POST", body: formData });
        const data = await res.json();

        // Update chat messages
        const userMessage: Message = { id: Date.now().toString(), content: data.transcription, isUser: true, timestamp: new Date() };
        const assistantMessage: Message = { id: (Date.now() + 1).toString(), content: data.assistant, isUser: false, timestamp: new Date() };

        setMessages(prev => [...prev, userMessage, assistantMessage]);

        // Play assistant TTS audio
        if (data.audio_base64) await speakAudioBase64(data.audio_base64);

      } catch (error) {
        console.error(error);
        toast({ title: "Error", description: "Failed to process voice", variant: "destructive" });
      }
    };

    recorder.start();
    setIsListening(true);
    toast({ title: "Listening...", description: "Speak now" });
  };

  const stopVoiceRecording = () => {
    if (mediaRecorder && mediaRecorder.state !== "inactive") {
      mediaRecorder.stop();
      setIsListening(false);
    }
  };

  const toggleVoiceMode = () => {
    const newMode = !isVoiceMode;
    setIsVoiceMode(newMode);

    if (!newMode) stopVoiceRecording();
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;
    const userMessage: Message = { id: Date.now().toString(), content: inputValue, isUser: true, timestamp: new Date() };
    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    const aiResponse = await getLLMResponse(inputValue);
    const assistantMessage: Message = { id: (Date.now() + 1).toString(), content: aiResponse, isUser: false, timestamp: new Date() };
    setMessages(prev => [...prev, assistantMessage]);
  };

  return (
    <div className="flex h-screen bg-gradient-chat">
      <div className="flex-1 flex flex-col max-w-4xl mx-auto">
        {/* Header */}
        <header className="p-6 border-b border-border/50 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold bg-gradient-ai bg-clip-text text-transparent">AI Assistant</h1>
            <p className="text-muted-foreground">Your intelligent chat companion</p>
          </div>
          <Button
            onClick={toggleVoiceMode}
            variant={isVoiceMode ? "default" : "outline"}
            size="lg"
            className={cn("transition-all duration-300", isVoiceMode && "bg-gradient-ai shadow-ai")}
          >
            {isVoiceMode ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            {isVoiceMode ? "Exit Voice" : "Voice Mode"}
          </Button>
        </header>

        <div className="flex-1 flex">
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map(msg => (
                <div key={msg.id} className={cn("flex", msg.isUser ? "justify-end" : "justify-start")}>
                  <Card className={cn("max-w-[80%] p-4", msg.isUser ? "bg-gradient-ai text-primary-foreground shadow-ai" : "bg-card border-border/50 shadow-chat")}>
                    <p className="text-sm leading-relaxed">{msg.content}</p>
                    <p className="text-xs opacity-70 mt-2">{msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                  </Card>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {!isVoiceMode && (
              <div className="p-6 border-t border-border/50 flex gap-3">
                <Input value={inputValue} onChange={(e) => setInputValue(e.target.value)} placeholder="Type your message..." className="flex-1 bg-secondary/50 border-border/50 focus:border-ai-primary transition-colors" />
                <Button onClick={handleSendMessage} disabled={!inputValue.trim()} className="bg-gradient-ai shadow-ai hover:shadow-lg transition-all duration-300"><Send className="w-4 h-4" /></Button>
              </div>
            )}
          </div>

          {/* Avatar Panel */}
          {isVoiceMode && (
            <div className="w-80 border-l border-border/50 p-6 flex flex-col items-center justify-center">
              <ChatAvatar isListening={isListening} isVoiceMode={isVoiceMode} isSpeaking={isSpeaking} />
              <div className="mt-6">
                {isListening ? (
                  <Button onClick={stopVoiceRecording} className="bg-red-500 hover:bg-red-600 text-white">Stop</Button>
                ) : (
                  <Button onClick={startVoiceRecording} className="bg-green-500 hover:bg-green-600 text-white">Talk</Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;
