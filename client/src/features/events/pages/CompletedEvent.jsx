import { useContext } from "react";
import eventContext from "../../../context/EventContext.jsx";
import "../styles/upcomingEvent.css";
import EventsPage from "../components/EventPage.jsx";
const CompletedEvent = () => {
  const { completedEvents } = useContext(eventContext);

  return (
    <>
      <EventsPage
        title="Completed Events"
        subtitle="Look back at the events that brought our campus together"
        events={completedEvents}
      />
    </>
  );
};

export default CompletedEvent;
