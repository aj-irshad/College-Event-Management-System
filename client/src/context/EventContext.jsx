import { createContext, useContext, useEffect, useRef, useState } from "react";

import { getEvents, createEvent, deleteEvent } from "../services/eventService";
import authContext from "./authContext";
import socket from "../api/socket";
import { isEventAvailableToProfile } from "../features/events/utils/eventTargeting.js";

const eventContext = createContext({});
const debugEventSocket = import.meta.env.VITE_DEBUG_EVENT_SOCKET === "true";

const debugLog = (...args) => {
  if (debugEventSocket) console.info("[event-socket]", ...args);
};

const sortEvents = (events) =>
  [...events].sort(
    (a, b) => new Date(a.start_at) - new Date(b.start_at),
  );

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [eventLoading, setEventLoading] = useState(true);
  const [eventError, setEventError] = useState("");
  const { user, loading: authLoading } = useContext(authContext);
  const initialEventsLoadRef = useRef(null);
  const hasConnectedRef = useRef(false);
  const eventRevisionRef = useRef(0);
  const eventRequestRef = useRef(0);
  const accessProfileRef = useRef(null);
  accessProfileRef.current = user;
  const userId = user?._id ?? user?.id ?? "";
  const accessProfileKey = `${userId}:${user?.role || ""}:${user?.department || ""}:${user?.semester || ""}`;

  useEffect(() => {
    if (authLoading) return undefined;

    if (!accessProfileRef.current) {
      // Event APIs require authentication; do not issue an initial request before
      // auth restoration or let its expected 401 clear the next user's events.
      eventRequestRef.current += 1;
      initialEventsLoadRef.current = Promise.resolve();
      setEvents([]);
      setEventError("");
      setEventLoading(false);
      return undefined;
    }

    let active = true;
    const requestId = ++eventRequestRef.current;
    const revisionAtRequest = eventRevisionRef.current;
    setEventLoading(true);

    const loadInitialEvents = async () => {
      try {
        const response = await getEvents();
        if (
          !active ||
          requestId !== eventRequestRef.current ||
          revisionAtRequest !== eventRevisionRef.current
        ) return;
        const availableEvents = response.data.filter((event) =>
          isEventAvailableToProfile(event, accessProfileRef.current),
        );
        setEvents(sortEvents(availableEvents));
        setEventError("");
        debugLog("initial REST event state loaded", { count: response.data.length });
      } catch (err) {
        if (active && requestId === eventRequestRef.current) {
          console.error(err.message);
          // A failed refresh is not an empty event list; keep the last good data.
          setEventError("Failed to load events. Please try again later.");
        }
      } finally {
        if (active && requestId === eventRequestRef.current) setEventLoading(false);
      }
    };

    initialEventsLoadRef.current = loadInitialEvents();
    return () => {
      active = false;
    };
  }, [authLoading, accessProfileKey]);

  useEffect(() => {
    const refreshEvents = async () => {
      const requestId = ++eventRequestRef.current;
      const revisionAtRequest = eventRevisionRef.current;
      try {
        const response = await getEvents();
        // Ignore stale requests and snapshots predating a socket/local update.
        if (
          requestId !== eventRequestRef.current ||
          eventRevisionRef.current !== revisionAtRequest
        ) return;
        setEvents(sortEvents(response.data.filter((event) =>
          isEventAvailableToProfile(event, accessProfileRef.current),
        )));
        setEventError("");
        debugLog("REST event state synchronized", { count: response.data.length });
      } catch (err) {
        if (requestId === eventRequestRef.current) {
          console.error("Failed to synchronize events:", err.message);
          setEventError("Failed to refresh events.");
        }
      } finally {
        if (requestId === eventRequestRef.current) setEventLoading(false);
      }
    };

    const handleReady = () => {
      debugLog("events:ready received", { socketId: socket.id });
      if (hasConnectedRef.current) {
        void refreshEvents();
      } else {
        hasConnectedRef.current = true;
        // Reconcile the initial REST load after joining the authenticated room.
        void (initialEventsLoadRef.current || Promise.resolve()).then(
          refreshEvents,
          refreshEvents,
        );
      }
    };

    const handleConnectError = (error) => {
      debugLog("connection error", error.message);
      console.error("Socket connect_error:", error.message);
    };

    const handleConnect = () => debugLog("connected", { socketId: socket.id });
    const handleDisconnect = (reason) =>
      debugLog("disconnected", { socketId: socket.id, reason });

    const handleCreated = (event) => {
      eventRevisionRef.current += 1;
      debugLog("received events:created", { eventId: event?._id });
      if (!isEventAvailableToProfile(event, accessProfileRef.current)) return;
      setEvents((prev) => {
        const next = sortEvents([
          event,
          ...prev.filter((item) => item._id !== event._id),
        ]);
        debugLog("state updated after create", {
          eventId: event?._id,
          count: next.length,
        });
        return next;
      });
    };
    const handleUpdated = (event) => {
      eventRevisionRef.current += 1;
      debugLog("received events:updated", { eventId: event?._id });
      if (!isEventAvailableToProfile(event, accessProfileRef.current)) {
        setEvents((prev) => prev.filter((item) => item._id !== event?._id));
        return;
      }
      setEvents((prev) => {
        const next = sortEvents([
          event,
          ...prev.filter((item) => item._id !== event._id),
        ]);
        debugLog("state updated after update", {
          eventId: event?._id,
          count: next.length,
        });
        return next;
      });
    };
    const handleDeleted = ({ _id }) => {
      eventRevisionRef.current += 1;
      debugLog("received events:deleted", { eventId: _id });
      setEvents((prev) => {
        const next = prev.filter((event) => event._id !== _id);
        debugLog("state updated after delete", { eventId: _id, count: next.length });
        return next;
      });
    };
    const handleStatusesUpdated = () => void refreshEvents();

    socket.on("events:ready", handleReady);
    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("disconnect", handleDisconnect);
    socket.on("events:created", handleCreated);
    socket.on("events:updated", handleUpdated);
    socket.on("events:deleted", handleDeleted);
    socket.on("events:statuses-updated", handleStatusesUpdated);

    if (socket.connected) {
      handleReady();
    }

    return () => {
      socket.off("events:ready", handleReady);
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("disconnect", handleDisconnect);
      socket.off("events:created", handleCreated);
      socket.off("events:updated", handleUpdated);
      socket.off("events:deleted", handleDeleted);
      socket.off("events:statuses-updated", handleStatusesUpdated);
    };
  }, []);

  useEffect(() => {
    if (accessProfileRef.current) {
      socket.connect();
    } else {
      socket.disconnect();
    }

    return () => socket.disconnect();
  }, [accessProfileKey]);

  const createEventContext = async (eventData) => {
    try {
      const response = await createEvent(eventData);
      if (response.data?.event) {
        eventRevisionRef.current += 1;
        setEvents((prev) =>
          sortEvents([
            response.data.event,
            ...prev.filter((event) => event._id !== response.data.event._id),
          ]),
        );
        debugLog("state updated from create response", {
          eventId: response.data.event._id,
        });
      }
      return response;
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  const deleteEventContext = async (eventId) => {
    try {
      await deleteEvent(eventId);
      eventRevisionRef.current += 1;
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event._id !== eventId),
      );
      debugLog("state updated from delete response", { eventId });
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  const ongoingEvents = events.filter((event) => event.status === "Ongoing");
  const upcomingEvents = events.filter((event) => event.status === "Upcoming");
  const completedEvents = events.filter(
    (event) => event.status === "Completed",
  );

  return (
    <eventContext.Provider
      value={{
        events,
        setEvents,
        eventLoading,
        eventError,
        ongoingEvents,
        upcomingEvents,
        completedEvents,
        createEventContext,
        deleteEventContext,
      }}
    >
      {children}
    </eventContext.Provider>
  );
};

export default eventContext;
