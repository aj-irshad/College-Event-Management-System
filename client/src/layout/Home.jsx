import { useContext, useState } from "react";
import authContext from "../context/authContext";
import Header from "../components/Header";
import Aside from "../components/Aside";
import Main from "../components/Main";
import "../styles/home.css";

const Home = () => {
  const { user, isAdmin } = useContext(authContext);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  if (!user) {
    return <h1>Loading...</h1>;
  }

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen((prev) => !prev);
  };

  return (
    <div id="home" className={isMobileMenuOpen ? "sidebar-open" : ""}>
      <Header
        user={user}
        onToggleMenu={toggleMobileMenu}
        isMobileMenuOpen={isMobileMenuOpen}
      />
      <Aside
        isAdmin={isAdmin}
        user={user}
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />
      <Main />

      {/* Backdrop overlay for mobile */}
      {isMobileMenuOpen && (
        <div
          className="sidebar-backdrop"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </div>
  );
};

export default Home;
