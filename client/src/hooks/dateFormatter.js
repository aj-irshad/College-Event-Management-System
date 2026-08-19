const formatDate = (dateTime) => {
  return new Date(dateTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
};

const formatTime = (dateTime) => {
  return new Date(dateTime).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
};

export { formatDate, formatTime };
