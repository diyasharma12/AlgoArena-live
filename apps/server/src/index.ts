import http from "http";
import { initIo } from './utils/socketInstance';
import { setupSockets } from './sockets/index';
import { PORT } from "./config/config";
import { expirationManager } from "./utils/ExpirationManager";
import { setupChatSocket } from "./sockets/chatsocket";
import { app } from "./app";

const server = http.createServer(app);
export const io = initIo(server);

setupSockets(io);
setupChatSocket(io);

server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  console.log("[Env]", {
    NODE_ENV: process.env.NODE_ENV,
    CLIENT_URL: process.env.CLIENT_URL,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    hasGoogleClientId: Boolean(process.env.GOOGLE_CLIENT_ID),
    hasGoogleClientSecret: Boolean(process.env.GOOGLE_CLIENT_SECRET),
  });
  expirationManager.recover().catch(err => {
    console.error("Expiration recovery failed:", err);
  });
});
