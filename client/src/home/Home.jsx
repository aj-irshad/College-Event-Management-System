import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { getUserProfile } from "../services/authService";

const Home = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const response = await getUserProfile();
        console.log(response.data);
        setUser(response.data);
      } catch (error) {
        console.error(error.response?.data?.msg);
        if (error.response?.status === 401) {
          navigate("/login");
        }
      }
    };
    checkLogin();
  }, [navigate]);

  return (
    <div>
      <h1>Home</h1>
      {user && user.role === "admin" && <p>Hello, Admin</p>}
    </div>
  );
};

export default Home;
