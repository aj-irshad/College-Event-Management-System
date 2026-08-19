import { createContext, useEffect, useState } from "react";
import { getEvents, createEvent, deleteEvent } from "../services/eventService";

const eventContext = createContext({});

export const EventProvider = ({ children }) => {
  const [events, setEvents] = useState([]);
  const [eventLoading, setEventLoading] = useState(true);

  useEffect(() => {
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

  const createEventContext = async (eventData) => {
    try {
      const response = await createEvent(eventData);
      setEvents((prevEvents) => [...prevEvents, response.data.event]);
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
