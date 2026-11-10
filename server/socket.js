import jwt from "jsonwebtoken";
import { Server } from "socket.io";
import Users from "./model/user.js";
import { EVENT_DEPARTMENTS, EVENT_SEMESTERS } from "./utils/eventTargeting.js";

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
      const user = await Users.findById(decoded.userId).select("role department semester");
      if (!user) {
        debugLog("authentication rejected: user not found", decoded.userId);
        return next(new Error("Authentication required"));
      }

      socket.data.userId = String(user._id);
      socket.data.role = user.role;
      socket.data.department = user.department;
      socket.data.semester = user.semester;
      debugLog("socket authenticated", { userId: socket.data.userId });
      return next();
    } catch (error) {
      debugLog("authentication rejected", error.message);
      return next(new Error("Authentication required"));
    }
  });

  io.on("connection", async (socket) => {
    try {
      await socket.join(["blogs"]);
      if (socket.data.role === "admin") {
        await socket.join("events");
        await socket.join("polls:admin");
      } else {
        await socket.join("events:all");
        await socket.join("polls:all");
        if (socket.data.department && socket.data.semester) {
          await socket.join(eventTargetRoom(socket.data.department, socket.data.semester));
          await socket.join(pollTargetRoom(socket.data.department, socket.data.semester));
        }
      }
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

const eventTargetRoom = (department, semester) =>
  `events:target:${encodeURIComponent(department)}:${encodeURIComponent(semester)}`;

const pollTargetRoom = (department, semester) =>
  `polls:target:${encodeURIComponent(department)}:${encodeURIComponent(semester)}`;

const eventRooms = (event) => {
  if (!event) return [];
  const targets = event?.audienceTargets;
  if (!Array.isArray(targets) || targets.length === 0) return ["events:all"];
  const rooms = new Set();
  for (const target of targets) {
    if (!EVENT_DEPARTMENTS.includes(target?.department) || !Array.isArray(target.semesters)) continue;
    for (const semester of target.semesters) {
      if (EVENT_SEMESTERS.includes(semester)) rooms.add(eventTargetRoom(target.department, semester));
    }
  }
  return [...rooms];
};

export const emitEventToAudience = (eventName, payload, event, previousEvent) => {
  const io = getIO();
  const rooms = new Set(["events", ...eventRooms(event), ...eventRooms(previousEvent)]);
  for (const room of rooms) io.to(room).emit(eventName, payload);
};

export const emitEventStatusRefresh = () => {
  const io = getIO();
  const rooms = new Set(["events", "events:all"]);
  for (const department of EVENT_DEPARTMENTS) {
    for (const semester of EVENT_SEMESTERS) {
      rooms.add(eventTargetRoom(department, semester));
    }
  }
  for (const room of rooms) io.to(room).emit("events:statuses-updated");
};

const pollRooms = (poll) => {
  if (!poll) return [];
  const targets = poll.audienceTargets;
  if (!Array.isArray(targets) || !targets.length) return ["polls:all"];
  const rooms = new Set();
  for (const target of targets) {
    if (!EVENT_DEPARTMENTS.includes(target?.department) || !Array.isArray(target.semesters)) continue;
    for (const semester of target.semesters) {
      if (EVENT_SEMESTERS.includes(semester)) rooms.add(pollTargetRoom(target.department, semester));
    }
  }
  return [...rooms];
};

export const emitPollToAudience = (eventName, payload, poll, previousPoll) => {
  const io = getIO();
  const rooms = new Set(["polls:admin", ...pollRooms(poll), ...pollRooms(previousPoll)]);
  for (const room of rooms) io.to(room).emit(eventName, payload);
};

export const emitPollExpiryToAudience = (poll) => {
  const io = getIO();
  const rooms = new Set(["polls:admin", ...pollRooms(poll)]);
  for (const room of rooms) io.to(room).emit("polls:expired", { pollId: String(poll._id) });
};

export const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized");
  }
  return io;
};
