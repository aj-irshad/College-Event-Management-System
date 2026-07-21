import { createContext, useEffect, useState } from "react";
import { getCurrentUser } from "../services/authService";

const authContext = createContext({});

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await getCurrentUser();
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

  return (
    <authContext.Provider
      value={{
        user,
        setUser,
        loading,
      }}
    >
      {children}
    </authContext.Provider>
  );
};

export default authContext;
