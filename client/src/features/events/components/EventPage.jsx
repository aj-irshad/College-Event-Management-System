import EventBtn from "../components/EventBtn.jsx";
import EventCards from "../components/EventCards";
import { Plus } from "lucide-react";
import { useContext } from "react";
import authContext from "../../../context/authContext";
import "../styles/upcomingEvent.css";
import { useNavigate } from "react-router-dom";

const EventsPage = ({ events, title, subtitle }) => {
  const { isAdmin } = useContext(authContext);
  const navigate = useNavigate();

  return (
    <>
      <section className="title">
        <article className="heading">
          <p>{title}</p>
          <p>{subtitle}</p>
        </article>

        {isAdmin && (
          <EventBtn
            text="Create Event"
            onClick={() => navigate("/create-event")}
            icon={<Plus size={18} />}
          />
        )}
      </section>

      <section className="upcomingEventsCards">
        {events.map((event) => (
          <EventCards key={event._id} event={event} isAdmin={isAdmin} />
        ))}
      </section>
    </>
  );
};

export default EventsPage;
