import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { Plus } from "lucide-react";

import EventBtn from "../components/EventBtn.jsx";
import EventCards from "../components/EventCards";

import authContext from "../../../context/authContext";

import "../styles/upcomingEvent.css";

const EventsPage = ({ events = [], title, subtitle, participations = [] }) => {
  const { isAdmin } = useContext(authContext);
  const navigate = useNavigate();

  return (
    <>
      <section className="eventsPageHeader">
        <article className="eventsPageHeading">
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </article>

        {isAdmin && (
          <EventBtn
            text="Create Event"
            onClick={() => navigate("/create-event")}
            icon={<Plus size={18} />}
            className="eventBtnCreate"
          />
        )}
      </section>

      <section className="upcomingEventsCards">
        {events.map((event) => {
          const hasParticipated = participations.some(
            (participation) => participation.event?._id === event._id,
          );

          return (
            <EventCards
              key={event._id}
              event={event}
              isAdmin={isAdmin}
              hasParticipated={hasParticipated}
            />
          );
        })}
      </section>
    </>
  );
};

export default EventsPage;
