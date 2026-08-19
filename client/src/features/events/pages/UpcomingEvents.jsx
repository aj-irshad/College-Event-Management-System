import { useContext } from "react";
import eventContext from "../../../context/EventContext.jsx";

import EventsPage from "../components/EventPage.jsx";
import "../styles/upcomingEvent.css";

const UpcomingEvents = () => {
  const { upcomingEvents } = useContext(eventContext);

  return (
    <>
      <EventsPage
        events={upcomingEvents}
        title="Upcoming Events"
        subtitle="Checkout the events coming soon"
      />
    </>
  );
};

export default UpcomingEvents;
