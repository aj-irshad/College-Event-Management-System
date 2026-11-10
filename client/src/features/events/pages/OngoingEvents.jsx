import { useContext } from "react";
import eventContext from "../../../context/EventContext.jsx";

import "../styles/upcomingEvent.css";

import EventsPage from "../components/EventPage.jsx";

const OngoingEvents = () => {
  const { ongoingEvents, eventLoading, eventError } = useContext(eventContext);

  return (
    <>
      <EventsPage
        events={ongoingEvents}
        loading={eventLoading}
        error={eventError}
        title="Ongoing Events"
        subtitle="Experience what's happening in our campus"
      />
    </>
  );
};

export default OngoingEvents;
