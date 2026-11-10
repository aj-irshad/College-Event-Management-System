import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Plus } from "lucide-react";

import EventCards from "../components/EventCards";

import authContext from "../../../context/authContext";
import { EmptyState, PageHeader } from "../../../components/ModulePageUI";

import "../styles/upcomingEvent.css";

const EventsPage = ({ events = [], title, subtitle, participations = [], loading = false, error = "" }) => {
  const { isAdmin } = useContext(authContext);
  const navigate = useNavigate();

  return (
    <>
      <PageHeader
        title={title}
        description={subtitle}
        actionLabel={isAdmin ? "Create Event" : undefined}
        actionIcon={isAdmin ? <Plus size={18} /> : undefined}
        onAction={isAdmin ? () => navigate("/create-event") : undefined}
      />

      {error && <p className="events-page-error" role="alert">{error}</p>}
      {loading ? <p role="status" className="events-page-state">Loading events…</p> : events.length === 0 ? error ? null : (
        <EmptyState
          icon={CalendarDays}
          title="No events yet"
          description="There are no events in this category right now. Check back later for campus updates."
          actionLabel={isAdmin ? "Create Event" : undefined}
          actionIcon={isAdmin ? <Plus size={18} /> : undefined}
          onAction={isAdmin ? () => navigate("/create-event") : undefined}
        />
      ) : <section className="upcomingEventsCards">
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
      </section>}
    </>
  );
};

export default EventsPage;
