import SockJS from "sockjs-client";
import { Client } from "@stomp/stompjs";
import { API_BASE_URL } from "../config/env";

export const createPaymentSocket = (baseUrl = API_BASE_URL.replace(/\/api$/, "")) => {
  const client = new Client({
    // Use SockJS
    webSocketFactory: () => new SockJS(`${baseUrl}/ws`),
    reconnectDelay: 3000,
    debug: () => {},
  });

  const connect = () => new Promise((resolve, reject) => {
    client.onConnect = () => resolve();
    client.onStompError = (frame) => reject(frame);
    client.activate();
  });

  const disconnect = () => client.deactivate();

  const subscribePayment = (orderId, handler) => {
    return client.subscribe(`/topic/payments/${orderId}`, (message) => {
      try {
        const payload = JSON.parse(message.body);
        handler(payload);
      } catch (_) {}
    });
  };

  return { client, connect, disconnect, subscribePayment };
};
let client;
let connected = false;
let connecting = false;

export function connect(onMessage, onConnect, onError) {
  if (connected || connecting) return;
  connecting = true;
  const c = new Client({
    webSocketFactory: () => new SockJS(API_BASE_URL.replace(/\/api$/, "") + "/ws"),
    reconnectDelay: 2000,
    onConnect: () => {
      client = c;
      connected = true;
      connecting = false;
      try {
        c.subscribe("/topic/announcements", (msg) => {
          if (onMessage) {
            try {
              const body = JSON.parse(msg.body);
              onMessage(body);
            } catch (_) {
              onMessage({ content: msg.body });
            }
          }
        });
      } catch (e) {
        // Swallow subscribe error; will retry on reconnect
      }
      onConnect && onConnect();
    },
    onStompError: (frame) => {
      connecting = false;
      onError && onError(frame);
    },
    onWebSocketError: (evt) => {
      connecting = false;
      onError && onError(evt);
    },
    onDisconnect: () => {
      connected = false;
    }
  });
  client = c;
  c.activate();
}

export function disconnect() {
  try {
    if (client && (connected || connecting)) {
      client.deactivate();
    }
  } finally {
    connected = false;
    connecting = false;
  }
}

export function sendAnnouncement(content) {
  if (!client || !connected) return;
  client.publish({ destination: "/app/announce", body: JSON.stringify({ content }) });
}
