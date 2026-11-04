import { useCallback, useEffect, useRef, useState, createContext } from "react";

import { fetchPollForm, fetchPublicPollResults } from "../services/pollService";
import socket from "../api/socket";

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
  const [pollForm, setPollForm] = useState([]);
  const [pollResults, setPollResults] = useState([]);
  const [pollLoading, setPollLoading] = useState(true);
  const [pollResultsLoading, setPollResultsLoading] = useState(true);
  const pollRevisionRef = useRef(0);
  const resultsRevisionRef = useRef(0);

  const refreshPolls = useCallback(async () => {
    const revisionAtRequest = pollRevisionRef.current;
    try {
      const response = await fetchPollForm();
      if (
        pollRevisionRef.current === revisionAtRequest &&
        Array.isArray(response.data)
      ) {
        setPollForm(response.data);
      }
    } catch (err) {
      console.error("Error fetching poll forms:", err.message);
      if (pollRevisionRef.current === revisionAtRequest) setPollForm([]);
    } finally {
      setPollLoading(false);
    }
  }, []);

  const refreshPollResults = useCallback(async () => {
    const revisionAtRequest = resultsRevisionRef.current;
    try {
      const response = await fetchPublicPollResults();
      if (
        resultsRevisionRef.current === revisionAtRequest &&
        Array.isArray(response.data)
      ) {
        setPollResults(response.data);
      }
    } catch (err) {
      console.error("Error fetching poll results:", err.message);
    } finally {
      setPollResultsLoading(false);
    }
  }, []);

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
      setPollForm((current) => upsertById(current, poll));
      resultsRevisionRef.current += 1;
      void refreshPollResults();
    };

    const handleUpdated = handleCreated;

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
  }, [refreshPolls, refreshPollResults]);

  return (
    <pollContext.Provider
      value={{
        pollForm,
        pollLoading,
        pollResults,
        pollResultsLoading,
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
