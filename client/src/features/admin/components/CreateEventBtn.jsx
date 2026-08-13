import { Plus } from "lucide-react";
import "../styles/dashboard.css";

import { useNavigate } from "react-router-dom";

const CreateEventBtn = () => {
  const navigate = useNavigate();
  return (
    <button className="primary-btn" onClick={() => navigate("/create-event")}>
      <Plus size={18} /> Create Event
    </button>
  );
};

export default CreateEventBtn;
