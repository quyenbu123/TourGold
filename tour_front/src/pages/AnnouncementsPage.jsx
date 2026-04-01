import { useEffect, useState } from "react";
import api from "../services/api";
import { useNotifications } from "../context/NotificationsContext";

export default function AnnouncementsPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { markAllRead, refreshUnread } = useNotifications();
  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/v1/announcements/mine");
        setItems(res.data || []);
        await markAllRead();
        await refreshUnread();
      } catch (e) {
        setError("Không tải được thông báo");
      } finally {
        setLoading(false);
      }
    })();
  }, [markAllRead, refreshUnread]);

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="container py-4">
      <h2 className="mb-3">Thông Báo</h2>
      {items.length === 0 ? (
        <div className="text-muted">Chưa có thông báo</div>
      ) : (
        <div className="list-group">
          {items.map((r) => (
            <div key={r.id} className="list-group-item">
              <div className="d-flex justify-content-between">
                <div style={{ whiteSpace: "pre-wrap" }}>{r.announcement?.content ?? r.content}</div>
                <small className="text-muted">
                  {(r.announcement?.createdAt ?? r.createdAt)?.replace("T", " ").replace("Z", "")}
                </small>
              </div>
              {(r.announcement?.createdBy ?? r.createdBy) && (
                <small className="text-muted">Bởi: {r.announcement?.createdBy ?? r.createdBy}</small>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
