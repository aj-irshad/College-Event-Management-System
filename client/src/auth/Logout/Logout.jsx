import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { logout } from "../../services/authService";
import { LogOut } from "lucide-react";
import "./logout.css";

const Logout = () => {
  const navigate = useNavigate();

  useEffect(() => {
    async function handleLogout() {
      try {
        const response = await logout();
        console.log(response);
        alert("Logged out successfully");
      } catch (err) {
        console.error(err.message);
      } finally {
        navigate("/login");
      }
    }

    handleLogout();
  }, [navigate]);

  return (
    <main className="logoutMain">
      <section className="logoutBanner">
        <LogOut className="logoutIcon" />
        <h1>See You Soon</h1>
        <p>Thank you for using our campus community</p>
      </section>

      <section className="logoutStatus">
        <div className="spinner"></div>
        <h2>Logging out...</h2>
        <p>Please wait while we secure your session</p>
      </section>
    </main>
  );
};

export default Logout;
