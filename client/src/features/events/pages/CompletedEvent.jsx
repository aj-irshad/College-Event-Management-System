import { useContext } from "react";
import eventContext from "../../../context/EventContext.jsx";
import EventsPage from "../components/EventPage.jsx";
import "../styles/upcomingEvent.css";

const CompletedEvent = () => {
  const { completedEvents, eventLoading, eventError } = useContext(eventContext);

  return (
    <>
      <EventsPage
        title="Completed Events"
        subtitle="Look back at the events that brought our campus together"
        events={completedEvents}
        loading={eventLoading}
        error={eventError}
      />
    </>
  );
};

export default CompletedEvent;
