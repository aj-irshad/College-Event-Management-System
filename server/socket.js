import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import Users from "./model/user.js";

let io = null;
const isDebugEventSocket = () => process.env.DEBUG_EVENT_SOCKET === "true";

const debugLog = (...args) => {
  if (isDebugEventSocket()) console.info("[event-socket]", ...args);
};

const readCookie = (cookieHeader, cookieName) => {
  const cookie = cookieHeader
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${cookieName}=`));

  if (!cookie) return null;
  try {
    return decodeURIComponent(cookie.slice(cookieName.length + 1));
  } catch {
    return null;
  }
};

export const initIO = (httpServer, corsOrigin) => {
  io = new Server(httpServer, {
    cors: {
      origin: corsOrigin,
      credentials: true,
    },
  });
  debugLog("server initialized", { pid: process.pid, corsOrigin });

  io.use(async (socket, next) => {
    try {
      const token = readCookie(socket.handshake.headers.cookie, "ems");
      if (!token) {
        debugLog("authentication rejected: ems cookie missing");
        return next(new Error("Authentication required"));
      }

      const decoded = jwt.verify(token, process.env.JWT_KEY);
      const user = await Users.findById(decoded.userId).select("role");
      if (!user) {
        debugLog("authentication rejected: user not found", decoded.userId);
        return next(new Error("Authentication required"));
      }

      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      debugLog("socket authenticated", { userId: socket.data.userId });
      return next();
    } catch (error) {
      debugLog("authentication rejected", error.message);
      return next(new Error("Authentication required"));
    }
  });

  io.on("connection", async (socket) => {
    try {
      await socket.join(["events", "blogs", "polls"]);
      await socket.join(`user:${socket.data.userId}`);
      if (socket.data.role === "admin") await socket.join("admins");
      let roomSize;
      let blogRoomSize;
      if (isDebugEventSocket()) {
        try {
          roomSize = (await io.in("events").allSockets()).size;
          blogRoomSize = (await io.in("blogs").allSockets()).size;
        } catch (error) {
          debugLog("room count unavailable", error.message);
        }
      }
      debugLog("client joined feature rooms", {
        pid: process.pid,
        userId: socket.data.userId,
        eventRoomSize: roomSize,
        blogRoomSize,
      });
      // Clients use this signal to reconcile REST state after room membership
      // is active, including events emitted during the connection handshake.
      socket.emit("events:ready");
      socket.emit("blogs:ready");
      socket.emit("polls:ready");
    } catch (error) {
      console.error("Failed to join event room:", error.message);
      socket.disconnect(true);
    }

    socket.on("disconnect", (reason) => {
      debugLog("client disconnected", {
        pid: process.pid,
        userId: socket.data.userId,
        reason,
      });
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
};
