import { useContext, useEffect, useState } from "react";

import eventContext from "../../../context/EventContext.jsx";
import { getMyParticipation } from "../../../services/participantService.js";
import EventsPage from "../components/EventPage.jsx";

import "../styles/upcomingEvent.css";

const UpcomingEvents = () => {
  const { upcomingEvents } = useContext(eventContext);

  const [participations, setParticipations] = useState([]);

  useEffect(() => {
    const fetchParticipation = async () => {
      try {
        const response = await getMyParticipation();

        setParticipations(response.data);
      } catch (error) {
        console.error("Failed to fetch participation:", error);
      }
    };

    fetchParticipation();
  }, []);

  return (
    <EventsPage
      events={upcomingEvents}
      title="Upcoming Events"
      subtitle="Check out the events coming soon"
      participations={participations}
    />
  );
};

export default UpcomingEvents;
