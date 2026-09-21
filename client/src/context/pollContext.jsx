import { useState, createContext, useEffect } from "react";

import { fetchPollForm } from "../services/pollService";

const pollContext = createContext({});

export const PollProvider = ({ children }) => {
  const [pollForm, setPollForm] = useState([]);
  const [pollLoading, setPollLoading] = useState(true);
  const [totalPolls, setTotalPolls] = useState(0);

  // poll forms for user
  useEffect(() => {
    const fetchForm = async () => {
      try {
        const response = await fetchPollForm();
        setPollForm(response.data);
        setTotalPolls(response.data.length);
      } catch (err) {
        console.error("Error fetching poll forms", err.message);
        setPollForm([]);
      } finally {
        setPollLoading(false);
      }
    };
    fetchForm();
  }, []);

  return (
    <pollContext.Provider value={{ pollForm, pollLoading, totalPolls }}>
      {children}
    </pollContext.Provider>
  );
};

export default pollContext;
