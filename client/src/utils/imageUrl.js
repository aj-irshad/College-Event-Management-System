const backendBaseUrl = (import.meta.env.VITE_BASE_URL || "").replace(/\/+$/, "");

const legacyUploadRoutes = {
  profiles: "user",
  blogs: "blog",
};

export const resolveImageUrl = (storedValue, legacyFolder) => {
  if (typeof storedValue !== "string") return "";
  const imageValue = storedValue.trim();
  if (/^https?:\/\//i.test(imageValue)) return imageValue;

  const route = legacyUploadRoutes[legacyFolder];
  if (!route || !imageValue) return "";

  const normalized = imageValue.replace(/\\/g, "/");
  if (/^\/?uploads\//i.test(normalized)) {
    return `${backendBaseUrl}/${normalized.replace(/^\/+/, "")}`;
  }

  const safePath = normalized
    .split("/")
    .filter((segment) => segment && segment !== "." && segment !== "..")
    .map(encodeURIComponent)
    .join("/");
  if (!safePath) return "";

  return `${backendBaseUrl}/uploads/${route}/${safePath}`;
};
