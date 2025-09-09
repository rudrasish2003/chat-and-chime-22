import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Send, Mic, MicOff } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatAvatar from "./ChatAvatar";

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
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputValue,
      isUser: true,
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        content: "That's a great question! As an AI assistant, I'm here to help you with a wide variety of tasks. What would you like to explore?",
        isUser: false,
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const toggleVoiceMode = () => {
    setIsVoiceMode(!isVoiceMode);
    if (!isVoiceMode) {
      setIsListening(true);
      // Simulate voice recognition
      setTimeout(() => setIsListening(false), 3000);
    } else {
      setIsListening(false);
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
              <ChatAvatar isListening={isListening} isVoiceMode={isVoiceMode} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatInterface;