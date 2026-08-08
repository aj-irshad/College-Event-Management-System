import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";
import { logout } from "../../services/authService";
import authContext from "../../context/authContext";
import "./logout.css";

const LogoutButton = () => {
  const { setUser } = useContext(authContext);
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      setUser(null);
      // alert("Logged out successfully");
      navigate("/login", { replace: true });
    } catch (err) {
      console.error(err.message);
    }
  };

  return (
    <button className="logoutButton" onClick={handleLogout}>
      <LogOut size={18} />
      Logout
    </button>
  );
};

export default LogoutButton;
