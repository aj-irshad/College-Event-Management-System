import { createContext, useEffect, useState } from "react";
import { io } from "socket.io-client";

import { getEvents, createEvent, deleteEvent } from "../services/eventService";

const eventContext = createContext({});

const socket = io(import.meta.env.VITE_BASE_URL, {
  withCredentials: true,
});

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [eventLoading, setEventLoading] = useState(true);

  useEffect(() => {
    // Fetch existing events
    const getAllEvents = async () => {
      try {
        const response = await getEvents();
        setEvents(response.data);
      } catch (err) {
        console.error(err.message);
        setEvents([]);
      } finally {
        setEventLoading(false);
      }
    };
    getAllEvents();
  }, []);

  useEffect(() => {
    const handleConnect = () => {
      console.log("Socket connected:", socket.id);
    };

    const handleConnectError = (error) => {
      console.error("Socket connect_error:", error.message);
    };

    const handleNewEvent = (newEvent) => {
      setEvents((prevEvents) => {
        if (prevEvents.some((event) => event._id === newEvent._id)) {
          return prevEvents;
        }

        return [...prevEvents, newEvent];
      });
    };

    socket.on("connect", handleConnect);
    socket.on("connect_error", handleConnectError);
    socket.on("newEvent", handleNewEvent);

    if (socket.connected) {
      handleConnect();
    }

    return () => {
      socket.off("connect", handleConnect);
      socket.off("connect_error", handleConnectError);
      socket.off("newEvent", handleNewEvent);
    };
  }, []);

  const createEventContext = async (eventData) => {
    try {
      const response = await createEvent(eventData);
      return response;
    } catch (err) {
      console.error(err.message);
      throw err;
    }
  };

  const deleteEventContext = async (eventId) => {
    try {
      await deleteEvent(eventId);
      setEvents((prevEvents) =>
        prevEvents.filter((event) => event._id !== eventId),
      );
    } catch (err) {
      console.error(err.message);
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
