import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config/env";
import { useAuth } from "../context/AuthContext";

const FloatingButton = ({ onClick }) => (
  <button
    type="button"
    onClick={onClick}
    title="Hỏi AI về tour"
    style={{
      position: "fixed",
      right: 20,
      bottom: 88,
      zIndex: 9999,
      width: 56,
      height: 56,
      borderRadius: "50%",
      padding: 0,
      backgroundColor: "#0d6efd",
      color: "#fff",
      border: "none",
      boxShadow: "0 4px 10px rgba(0,0,0,.15)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
    }}
  >
    <i className="fas fa-robot"></i>
  </button>
);

const ChatAIWidget = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const isAdminRoute = location.pathname.startsWith("/admin");
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([]);
  const inputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const renderMessageText = (text, isBot) => {
    if (!text) return null;
    const nodes = [];
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    let lastIndex = 0;
    let match;
    let chunkIndex = 0;

    const appendText = (str, keyPrefix) => {
      if (!str) return;
      const lines = str.split(/\n/);
      lines.forEach((line, idx) => {
        nodes.push(
          <React.Fragment key={`${keyPrefix}-line-${idx}`}>
            {line}
            {idx < lines.length - 1 && <br />}
          </React.Fragment>
        );
      });
    };

    while ((match = urlRegex.exec(text)) !== null) {
      const start = match.index;
      const url = match[0];
      if (start > lastIndex) {
        appendText(text.substring(lastIndex, start), `text-${chunkIndex++}`);
      }
      nodes.push(
        <a
          key={`link-${chunkIndex++}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: isBot ? "#ffe184" : "#0d6efd",
            textDecoration: "underline",
            wordBreak: "break-all",
          }}
        >
          {url}
        </a>
      );
      lastIndex = start + url.length;
    }

    if (lastIndex < text.length) {
      appendText(text.substring(lastIndex), `tail-${chunkIndex}`);
    }

    return nodes;
  };

  const ask = async () => {
    const q = question.trim();
    if (!q || loading) return;
    setLoading(true);
    const userMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      author: "Bạn",
      text: q,
    };
    setMessages((prev) => [...prev, userMessage]);
    setQuestion("");
    try {
      const resp = await fetch(`${API_BASE_URL.replace(/\/api$/, "")}/api/v1/ai-chat/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: q }),
      });
      const data = await resp.json().catch(() => ({}));
      const botText = resp.ok && data && typeof data.answer === "string" && data.answer.trim()
        ? data.answer.trim()
        : "Xin lỗi, mình chưa thể trả lời ngay bây giờ. Bạn vui lòng thử lại sau nhé.";
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-${Date.now()}`,
          role: "bot",
          author: "Tour Gold",
          text: botText,
        },
      ]);
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        {
          id: `bot-error-${Date.now()}`,
          role: "bot",
          author: "Tour Gold",
          text: "Có lỗi kết nối, bạn vui lòng thử lại sau một chút nhé.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAdminRoute || !open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(timer);
  }, [open, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute || !open) return;
    setMessages((prev) => {
      if (prev.length > 0) return prev;
      return [
        {
          id: "bot-welcome",
          role: "bot",
          author: "Tour Gold",
          text: "👋 Xin chào! Mình là trợ lý AI của Tour Gold. Bạn cần hỗ trợ tour hoặc đặt chỗ, cứ nhắn cho mình nhé!",
        },
      ];
    });
  }, [open, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute || !messagesEndRef.current) return;
    messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, isAdminRoute]);

  useEffect(() => {
    if (isAdminRoute) return undefined;
    if (typeof window === "undefined" || !window.Tawk_API) return undefined;
    try {
      if (open) {
        window.Tawk_API.hideWidget && window.Tawk_API.hideWidget();
      } else {
        window.Tawk_API.showWidget && window.Tawk_API.showWidget();
      }
    } catch (e) {
      // ignore Tawk API failures
    }
    return () => {
      try {
        window.Tawk_API && window.Tawk_API.showWidget && window.Tawk_API.showWidget();
      } catch (e) {
        // ignore
      }
    };
  }, [open, isAdminRoute]);

  if (isAdminRoute) {
    return null;
  }

  return (
    <>
      {!open && <FloatingButton onClick={() => setOpen(true)} />}
      {open && (
        <div
          style={{
            position: "fixed",
            right: 20,
            bottom: 20,
            width: 420,
            maxWidth: "calc(100vw - 40px)",
            maxHeight: "calc(100vh - 80px)",
            background: "#fff",
            borderRadius: 16,
            boxShadow: "0 10px 30px rgba(0,0,0,.2)",
            zIndex: 10000,
            overflow: "hidden",
            border: "1px solid rgba(0,0,0,.08)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              background: "#0d6efd",
              color: "#fff",
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <strong style={{ fontSize: 16 }}>Tour Gold</strong>
            <button
              type="button"
              onClick={() => setOpen(false)}
              style={{ background: "transparent", border: "none", color: "#fff" }}
              aria-label="Đóng"
            >
              <i className="fas fa-times"></i>
            </button>
          </div>

          <div style={{ padding: 16, display: "flex", flexDirection: "column", flex: 1, overflow: "hidden" }}>
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                paddingRight: 4,
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  style={{
                    display: "flex",
                    justifyContent: msg.role === "bot" ? "flex-start" : "flex-end",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "80%",
                      backgroundColor: msg.role === "bot" ? "#0d6efd" : "#f1f3f5",
                      color: msg.role === "bot" ? "#fff" : "#212529",
                      padding: "12px 14px",
                      borderRadius: msg.role === "bot" ? "4px 16px 16px 16px" : "16px 4px 16px 16px",
                      boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                    }}
                  >
                    <div style={{ fontSize: 12, opacity: 0.8, marginBottom: 6 }}>{msg.author}</div>
                    <div style={{ whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{renderMessageText(msg.text, msg.role === "bot")}</div>
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display: "flex", justifyContent: "flex-start" }}>
                  <div
                    style={{
                      backgroundColor: "#0d6efd",
                      color: "#fff",
                      padding: "10px 14px",
                      borderRadius: "4px 16px 16px 16px",
                      maxWidth: "70%",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <i className="fas fa-spinner fa-spin"></i>
                    <span>Đang soạn trả lời...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <input
                ref={inputRef}
                type="text"
                className="form-control"
                placeholder="Ví dụ: Tour Đà Nẵng có giá bao nhiêu?"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key !== "Enter") return;
                  if (e.nativeEvent?.isComposing) return;
                  e.preventDefault();
                  ask();
                }}
              />
              <button
                className="btn btn-primary"
                onClick={ask}
                disabled={loading}
                style={{ width: 48, height: 48, borderRadius: "50%" }}
              >
                {loading ? <i className="fas fa-spinner fa-spin"></i> : <i className="fas fa-paper-plane"></i>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatAIWidget;

