import { useCallback, useContext, useEffect, useRef, useState, createContext } from "react";

import { fetchPollForm, fetchPublicPollResults } from "../services/pollService";
import socket from "../api/socket";
import authContext from "./authContext";
import { isEventAvailableToProfile } from "../features/events/utils/eventTargeting.js";

const pollContext = createContext({});

const upsertById = (items, item) => {
  if (!item?._id) return items;
  const index = items.findIndex((current) => current._id === item._id);
  if (index === -1) return [item, ...items];
  return items.map((current, currentIndex) =>
    currentIndex === index ? item : current,
  );
};

export const PollProvider = ({ children }) => {
  const { user } = useContext(authContext);
  const [pollForm, setPollForm] = useState([]);
  const [pollResults, setPollResults] = useState([]);
  const [pollLoading, setPollLoading] = useState(true);
  const [pollResultsLoading, setPollResultsLoading] = useState(true);
  const [pollError, setPollError] = useState("");
  const [pollResultsError, setPollResultsError] = useState("");
  const pollRevisionRef = useRef(0);
  const resultsRevisionRef = useRef(0);

  const refreshPolls = useCallback(async () => {
    const revisionAtRequest = pollRevisionRef.current;
    try {
      const response = await fetchPollForm();
      if (!Array.isArray(response.data)) throw new Error("Unexpected poll response");
      if (pollRevisionRef.current === revisionAtRequest) {
        setPollForm(response.data.filter((poll) => isEventAvailableToProfile(poll, user)));
        setPollError("");
      }
    } catch (err) {
      console.error("Error fetching poll forms:", err.message);
      if (pollRevisionRef.current === revisionAtRequest) setPollError("Failed to load polls. Please try again later.");
    } finally {
      setPollLoading(false);
    }
  }, [user]);

  const refreshPollResults = useCallback(async () => {
    const revisionAtRequest = resultsRevisionRef.current;
    try {
      const response = await fetchPublicPollResults();
      if (!Array.isArray(response.data)) throw new Error("Unexpected poll results response");
      if (resultsRevisionRef.current === revisionAtRequest) {
        setPollResults(response.data.filter((poll) => isEventAvailableToProfile(poll, user)));
        setPollResultsError("");
      }
    } catch (err) {
      console.error("Error fetching poll results:", err.message);
      if (resultsRevisionRef.current === revisionAtRequest) setPollResultsError("Failed to load poll results. Please try again later.");
    } finally {
      setPollResultsLoading(false);
    }
  }, [user]);

  const removePoll = useCallback((pollId) => {
    if (!pollId) return;
    pollRevisionRef.current += 1;
    resultsRevisionRef.current += 1;
    setPollForm((current) => current.filter((poll) => poll._id !== pollId));
    setPollResults((current) => current.filter((poll) => poll._id !== pollId));
  }, []);

  useEffect(() => {
    void refreshPolls();
    void refreshPollResults();
  }, [refreshPolls, refreshPollResults]);

  useEffect(() => {
    const handleCreated = (poll) => {
      if (!poll?._id) return;
      pollRevisionRef.current += 1;
      if (!isEventAvailableToProfile(poll, user)) return;
      setPollForm((current) => upsertById(current, poll));
      resultsRevisionRef.current += 1;
      void refreshPollResults();
    };

    const handleUpdated = (poll) => {
      if (!poll?._id) return;
      pollRevisionRef.current += 1;
      if (!isEventAvailableToProfile(poll, user)) {
        setPollForm((current) => current.filter((item) => item._id !== poll._id));
        setPollResults((current) => current.filter((item) => item._id !== poll._id));
        return;
      }
      setPollForm((current) => upsertById(current, poll));
      resultsRevisionRef.current += 1;
      void refreshPollResults();
    };

    const handleDeleted = ({ _id } = {}) => {
      if (!_id) return;
      pollRevisionRef.current += 1;
      setPollForm((current) => current.filter((poll) => poll._id !== _id));
      resultsRevisionRef.current += 1;
      setPollResults((current) => current.filter((poll) => poll._id !== _id));
    };

    const handleResultsUpdated = () => {
      resultsRevisionRef.current += 1;
      void refreshPollResults();
    };

    const handleExpired = ({ pollId } = {}) => {
      if (!pollId) return;
      pollRevisionRef.current += 1;
      resultsRevisionRef.current += 1;
      const markCompleted = (poll) =>
        poll._id === pollId ? { ...poll, status: "Completed" } : poll;
      setPollForm((current) => current.map(markCompleted));
      setPollResults((current) => current.map(markCompleted));
      void refreshPollResults();
    };

    const handleReady = () => {
      void refreshPolls();
      void refreshPollResults();
    };

    socket.on("polls:ready", handleReady);
    socket.on("polls:created", handleCreated);
    socket.on("polls:updated", handleUpdated);
    socket.on("polls:deleted", handleDeleted);
    socket.on("polls:results-updated", handleResultsUpdated);
    socket.on("polls:expired", handleExpired);

    // The shared socket may have connected before this provider mounted.
    if (socket.connected) handleReady();

    return () => {
      socket.off("polls:ready", handleReady);
      socket.off("polls:created", handleCreated);
      socket.off("polls:updated", handleUpdated);
      socket.off("polls:deleted", handleDeleted);
      socket.off("polls:results-updated", handleResultsUpdated);
      socket.off("polls:expired", handleExpired);
    };
  }, [refreshPolls, refreshPollResults, user]);

  return (
    <pollContext.Provider
      value={{
        pollForm,
        pollLoading,
        pollError,
        pollResults,
        pollResultsLoading,
        pollResultsError,
        refreshPolls,
        refreshPollResults,
        removePoll,
        totalPolls: pollForm.length,
      }}
    >
      {children}
    </pollContext.Provider>
  );
};

export default pollContext;
