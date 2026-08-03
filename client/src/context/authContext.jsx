import { createContext, useEffect, useState } from "react";
import { getUserProfile } from "../services/authService";

const authContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await getUserProfile();
        setUser(response.data);
      } catch (err) {
        console.error(err.message);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    checkLogin();
  }, []);

  // Compute isAdmin whenever user object changes
  const isAdmin = user?.role === "admin";

  return (
    <authContext.Provider
      value={{
        user,
        setUser,
        isAdmin,
        loading,
      }}
    >
      {children}
    </authContext.Provider>
  );
};

export default authContext;
