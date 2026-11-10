export const isEventAvailableToProfile = (event, user, isAdmin = false) => {
  const targets = event?.audienceTargets;
  if (!Array.isArray(targets) || targets.length === 0) return true;
  if (isAdmin || user?.role === "admin") return true;
  if (!user?.department || !user?.semester) return false;
  return targets.some(
    (target) =>
      target.department === user.department &&
      Array.isArray(target.semesters) &&
      target.semesters.includes(user.semester),
  );
};
