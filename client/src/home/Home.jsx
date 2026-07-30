import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";

import { getUserProfile } from "../services/authService";

import Header from "./components/Header";
import Aside from "./components/Aside";
import Main from "./components/Main";
import "./styles/home.css";

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
        console.error(error.response?.data?.message);
        if (error.response?.status === 401) {
          navigate("/login");
        }
      }
    };
    checkLogin();
  }, [navigate]);

  if (!user) {
    return <h1>Loading...</h1>;
  }

  const isAdmin = user.role === "admin" ? true : false;
  // const isAdmin = true;

  return (
    <div id="home">
      <Header user={user} />
      <Aside />
      <Main isAdmin={isAdmin} user={user} />
    </div>
  );
};

export default Home;
