import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import api from "../services/api";
import { useAuth } from "./AuthContext";

const NotificationsContext = createContext(null);

export function NotificationsProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [recent, setRecent] = useState([]); // optional: keep last N

  const addMessage = (msg) => {
    setUnreadCount((c) => c + 1);
    setRecent((list) => [{ ...msg, _ts: Date.now() }, ...list].slice(0, 20));
  };

  const resetUnread = () => setUnreadCount(0);

  const refreshUnread = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await api.get("/api/v1/announcements/unread-count");
      setUnreadCount(res.data?.unread ?? 0);
    } catch (e) {
      // ignore silently
    }
  }, [isAuthenticated]);

  const markAllRead = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      await api.post("/api/v1/announcements/mark-all-read");
      setUnreadCount(0);
    } catch (e) {
      // ignore
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshUnread();
    } else {
      setUnreadCount(0);
    }
  }, [isAuthenticated, refreshUnread]);

  const value = useMemo(
    () => ({ unreadCount, resetUnread, addMessage, recent, refreshUnread, markAllRead }),
    [unreadCount, recent]
  );

  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications must be used within NotificationsProvider");
  return ctx;
}
