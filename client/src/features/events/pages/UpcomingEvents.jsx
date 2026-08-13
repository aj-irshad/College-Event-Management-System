import CreateEvent from "../../admin/pages/events/CreateEvent";
import { useContext } from "react";
import authContext from "../../../context/authContext";
const UpcomingEvents = () => {
  const { isAdmin } = useContext(authContext);
  return (
    <>
      <section className="title">
        <article className="upcoming-events">
          <p>Upcoming Events</p>
          <p>Checkout the events coming soon</p>
        </article>
        {isAdmin ? <CreateEvent /> : null}
      </section>
    </>
  );
};

export default UpcomingEvents;
