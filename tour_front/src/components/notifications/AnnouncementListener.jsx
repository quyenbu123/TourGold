import { useEffect } from "react";
import { connect, disconnect } from "../../services/socket";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useNotifications } from "../../context/NotificationsContext";

export default function AnnouncementListener() {
  const { addMessage } = useNotifications();
  useEffect(() => {
    connect(
      (msg) => {
        const content = msg?.content || "";
        if (content) {
          addMessage({ content });
          toast.info(content, { position: "top-right" });
        }
      },
      () => {},
      () => {}
    );
    return () => disconnect();
  }, []);

  return <ToastContainer newestOnTop />;
}
