export const EVENT_DEPARTMENTS = [
  "B. Tech in CS & AI",
  "B. Tech in IT",
  "IT Engineering",
  "Civil Engineering",
];

export const EVENT_SEMESTERS = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII"];

export const isEventAvailableToUser = (event, user) => {
  const targets = event?.audienceTargets;
  if (!Array.isArray(targets) || targets.length === 0) return true;
  if (user?.role === "admin") return true;
  if (!user?.department || !user?.semester) return false;

  return targets.some(
    (target) =>
      target.department === user.department &&
      Array.isArray(target.semesters) &&
      target.semesters.includes(user.semester),
  );
};
