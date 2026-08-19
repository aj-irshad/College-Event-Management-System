import { useContext } from "react";
import eventContext from "../../../context/EventContext.jsx";

import "../styles/upcomingEvent.css";

import EventsPage from "../components/EventPage.jsx";

const OngoingEvents = () => {
  const { ongoingEvents } = useContext(eventContext);

  return (
    <>
      <EventsPage
        events={ongoingEvents}
        title="Ongoing Events"
        subtitle="Experience what's happening in our campus"
      />
    </>
  );
};

export default OngoingEvents;
