import { useState, useRef, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import ChatAvatar from "./ChatAvatar";

// TypeScript declarations for Speech APIs
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
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognitionAPI = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognitionAPI();
      
      if (recognitionRef.current) {
        recognitionRef.current.continuous = true;
        recognitionRef.current.interimResults = false;
        recognitionRef.current.lang = 'en-US';
        
        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[event.results.length - 1][0].transcript;
          if (transcript.trim()) {
            toast({
              title: "Voice Input Detected",
              description: `Heard: "${transcript}"`,
            });
            processMessage(transcript);
          }
        };

        recognitionRef.current.onerror = (event) => {
          console.error('Speech recognition error:', event.error);
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
            // Restart recognition if still in voice mode
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
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if (speechSynthesisRef.current) {
        speechSynthesis.cancel();
      }
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get AI response
  const getAIResponse = async (userInput: string): Promise<string> => {
    try {
      // Simulate AI API call - replace with actual API
      const responses = [
        "That's a fascinating question! Let me help you with that.",
        "I understand what you're asking. Here's what I think...",
        "Great point! Based on my understanding, I'd suggest...",
        "That's an interesting perspective. Let me elaborate on that topic.",
        "I'm here to help! Here's my response to your question."
      ];
      
      // Simulate thinking time
      await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
      
      return responses[Math.floor(Math.random() * responses.length)] + 
             ` You mentioned: "${userInput}". This gives me a good understanding of what you're looking for.`;
    } catch (error) {
      console.error('Error getting AI response:', error);
      return "I apologize, but I'm having trouble processing your request right now. Please try again.";
    }
  };

  // Text-to-Speech function
  const speakText = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;

      // Try to get a natural voice
      const voices = speechSynthesis.getVoices();
      const preferredVoice = voices.find(voice => 
        voice.lang.startsWith('en') && voice.name.includes('Google')
      ) || voices.find(voice => voice.lang.startsWith('en'));
      
      if (preferredVoice) {
        utterance.voice = preferredVoice;
      }

      utterance.onstart = () => setIsSpeaking(true);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);

      speechSynthesisRef.current = utterance;
      speechSynthesis.speak(utterance);
    }
  }, []);

  // Process message (from text or voice)
  const processMessage = async (messageText: string) => {
    if (!messageText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageText,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Get AI response
    try {
      const aiResponseText = await getAIResponse(messageText);
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: aiResponseText,
        isUser: false,
        timestamp: new Date(),
      };
      
      setMessages(prev => [...prev, aiResponse]);
      
      // Speak the response if in voice mode
      if (isVoiceMode) {
        speakText(aiResponseText);
      }
    } catch (error) {
      console.error('Error processing message:', error);
      toast({
        title: "Error",
        description: "Failed to get AI response",
        variant: "destructive",
      });
    }
  };

  const handleSendMessage = () => {
    processMessage(inputValue);
  };

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
      // Start voice recognition
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
          console.error('Error starting voice recognition:', error);
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
      // Stop voice recognition
      setRecognitionActive(false);
      setIsListening(false);
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
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
        {/* Header */}
        <header className="p-6 border-b border-border/50">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold bg-gradient-ai bg-clip-text text-transparent">
                AI Assistant
              </h1>
              <p className="text-muted-foreground">Your intelligent chat companion</p>
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
          {/* Chat Area */}
          <div className="flex-1 flex flex-col">
            {/* Messages */}
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

            {/* Input Area */}
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

          {/* Avatar Panel */}
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