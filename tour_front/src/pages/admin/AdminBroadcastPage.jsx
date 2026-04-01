import { useState } from "react";
import api from "../../services/api";
import { toast } from "react-toastify";

export default function AdminBroadcastPage() {
  const [content, setContent] = useState("");

  const onSend = async () => {
    const text = content.trim();
    if (text.length === 0) return;
    try {
      await api.post("/api/v1/admin/announcements", { content: text });
      toast.success("Đã gửi thông báo");
      setContent("");
    } catch (e) {
      toast.error("Gửi thông báo thất bại");
    }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>Gửi Thông Báo Tới Tất Cả</h2>
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Nhập nội dung thông báo..."
        rows={4}
        style={{ width: "100%", maxWidth: 600 }}
      />
      <div style={{ marginTop: 8 }}>
        <button className="btn btn-primary" onClick={onSend}>Gửi cho tất cả</button>
      </div>
      <p style={{ marginTop: 8, color: "#666" }}>
        Bất kỳ ai đang mở website sẽ nhận được thông báo này ngay lập tức.
      </p>
    </div>
  );
}
