import { useEffect, useState } from "react";
import api from "../../services/api";

export default function AdminAnnouncementsListPage() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await api.get("/api/v1/admin/announcements");
        setItems(res.data || []);
      } catch (e) {
        setError("Không tải được danh sách thông báo");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) return <div>Đang tải...</div>;
  if (error) return <div className="text-danger">{error}</div>;

  return (
    <div className="container-fluid">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h3>Danh Sách Thông Báo Gần Đây</h3>
      </div>
      {items.length === 0 ? (
        <div className="text-muted">Chưa có thông báo</div>
      ) : (
        <div className="list-group">
          {items.map((a) => (
            <div key={a.id} className="list-group-item">
              <div className="d-flex justify-content-between">
                <div style={{ whiteSpace: "pre-wrap" }}>{a.content}</div>
                <small className="text-muted">
                  {a.createdAt?.replace("T", " ").replace("Z", "")}
                </small>
              </div>
              {a.createdBy && (
                <small className="text-muted">Bởi: {a.createdBy}</small>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
