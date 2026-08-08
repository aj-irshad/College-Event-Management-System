import { useContext } from "react";

import authContext from "../context/authContext";

import Header from "../components/Header";
import Aside from "../components/Aside";
import Main from "../components/Main";

import "../styles/home.css";

const Home = () => {
  const { user, isAdmin } = useContext(authContext);

  if (!user) {
    return <h1>Loading...</h1>;
  }

  return (
    <div id="home">
      <Header user={user} />
      <Aside isAdmin={isAdmin} user={user} />
      <Main />
    </div>
  );
};

export default Home;
