import React, { useState, useRef, useEffect } from "react";
import {
  MessageSquare,
  Send,
  X,
  Minimize2,
  Maximize2,
  Bot,
  User,
  Sparkles,
} from "lucide-react";
import Markdown from "react-markdown";
import { Button } from "./ui/Button";
import { cn, formatDate } from "../lib/utils";
import { sendAgentMessage, getStudies } from "../lib/api";

const QUICK_QUESTIONS = {
  dashboard: [
    "What are the top critical risks?",
    "Summarize all studies",
    "Show risk distribution",
  ],
  analyze: [
    "What nodes have been identified?",
    "What-if scenarios for this process",
    "Suggest additional parameters to check",
  ],
  worksheet: [
    "Show missing safeguards",
    "What are the highest risk deviations?",
    "Suggest additional recommendations",
  ],
  reports: [
    "Summarize this study",
    "List all critical findings",
    "Generate compliance summary",
  ],
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2">
      <div className="loading-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
      <div className="loading-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
      <div className="loading-dot h-2 w-2 rounded-full bg-muted-foreground/50" />
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={cn(
        "flex gap-2 animate-fade-in",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-7 w-7 shrink-0 items-center justify-center rounded-full",
          isUser ? "bg-primary" : "bg-muted"
        )}
      >
        {isUser ? (
          <User className="h-4 w-4 text-primary-foreground" />
        ) : (
          <Bot className="h-4 w-4 text-foreground" />
        )}
      </div>
      <div
        className={cn(
          "rounded-lg px-3 py-2 max-w-[80%] text-sm",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        )}
      >
        <div className="break-words prose prose-sm prose-slate dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_ul]:my-1 [&_li]:my-0.5 [&_p]:my-1">
          {isUser ? (
            <span>{message.content}</span>
          ) : (
            <Markdown>{message.content}</Markdown>
          )}
        </div>
        {message.timestamp && (
          <p
            className={cn(
              "text-[10px] mt-1",
              isUser ? "text-primary-foreground/60" : "text-muted-foreground"
            )}
          >
            {formatDate(message.timestamp)}
          </p>
        )}
      </div>
    </div>
  );
}

export function ChatAgent({ studyId: propStudyId, context = "dashboard" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [studies, setStudies] = useState([]);
  const [selectedStudyId, setSelectedStudyId] = useState(propStudyId || "");
  const [messages, setMessages] = useState([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hello! I'm your HAZOP Assistant. Select a study below, then ask me about risks, deviations, or safeguards.",
      timestamp: new Date().toISOString(),
    },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  // Load studies when chat opens
  useEffect(() => {
    if (isOpen) {
      getStudies().then((data) => {
        setStudies(data);
        // Auto-select if only one study or prop provided
        if (!selectedStudyId && data.length > 0) {
          setSelectedStudyId(data[data.length - 1].study_id);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  // Update if prop changes
  useEffect(() => {
    if (propStudyId) setSelectedStudyId(propStudyId);
  }, [propStudyId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content) return;

    const userMessage = {
      id: Date.now(),
      role: "user",
      content,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue("");
    setIsTyping(true);

    try {
      const sid = selectedStudyId || "general";
      const response = await sendAgentMessage(sid, content);
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: response.response || response.message || response.content || "No response",
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now() + 1,
          role: "assistant",
          content: `I encountered an error: ${err.message}. Please try again.`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickQuestion = (question) => {
    setInputValue(question);
    setTimeout(() => handleSend(), 0);
  };

  const quickQuestions = QUICK_QUESTIONS[context] || QUICK_QUESTIONS.dashboard;

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg hover:bg-primary/90 transition-all hover:scale-105"
      >
        <MessageSquare className="h-6 w-6" />
      </button>
    );
  }

  return (
    <div
      className={cn(
        "fixed z-50 flex flex-col bg-background border rounded-lg shadow-xl transition-all",
        isExpanded
          ? "bottom-4 right-4 left-4 top-4 sm:left-auto sm:w-[600px] sm:top-4"
          : "bottom-6 right-6 w-[380px] h-[520px]"
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h3 className="text-sm font-semibold">HAZOP Agent</h3>
            <p className="text-xs text-muted-foreground">AI-powered assistant</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? (
              <Minimize2 className="h-4 w-4" />
            ) : (
              <Maximize2 className="h-4 w-4" />
            )}
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg) => (
          <MessageBubble key={msg.id} message={msg} />
        ))}
        {isTyping && (
          <div className="flex gap-2">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
              <Bot className="h-4 w-4" />
            </div>
            <div className="rounded-lg bg-muted">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Study selector */}
      {studies.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/30">
          <select
            value={selectedStudyId}
            onChange={(e) => setSelectedStudyId(e.target.value)}
            className="w-full text-xs rounded border border-input bg-background px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value="">-- Select a study --</option>
            {studies.map((s) => (
              <option key={s.study_id} value={s.study_id}>
                {s.name} ({s.status})
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick questions */}
      {messages.length <= 2 && (
        <div className="px-4 pb-2 pt-2">
          <p className="text-xs text-muted-foreground mb-2">Quick questions:</p>
          <div className="flex flex-wrap gap-1.5">
            {quickQuestions.map((q) => (
              <button
                key={q}
                onClick={() => handleQuickQuestion(q)}
                className="rounded-full border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your HAZOP study..."
            className="flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring max-h-24"
            rows={1}
          />
          <Button
            size="icon"
            onClick={handleSend}
            disabled={!inputValue.trim() || isTyping}
            className="shrink-0"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ChatAgent;
