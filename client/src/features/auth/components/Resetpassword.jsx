import { useRef, useState } from "react";
import { resetPassword } from "../../../services/authService";
import { useNavigate } from "react-router-dom";
import ResetBanner from "./ResetBanner";
import ResetForm from "./ResetForm";
import { useNotifications } from "../../../context/NotificationContext.jsx";
import "../styles/reset.css";
import "../auth.css";

const Resetpassword = () => {
  const navigate = useNavigate();
  const { notify } = useNotifications();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false);
  const [checkMatchPassword, setCheckMatchPassword] = useState(true);
  const [formData, setFormData] = useState({
    oldPassword: "",
    newPassword: "",
    confirmNewPassword: "",
  });

  function handleChange(e) {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (submittingRef.current) return;

    if (formData.newPassword !== formData.confirmNewPassword) {
      setCheckMatchPassword(false);
      return;
    }
    setCheckMatchPassword(true);
    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      await resetPassword(formData);
      notify("success", "Your password has been reset successfully.");
      navigate("/login");
    } catch (err) {
      notify("error", err.response?.data?.message || "Could not reset your password.");
      navigate("/login");
      console.error(err.message);
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  }

  return (
    <main className="Resetmain">
      <ResetBanner />
      <ResetForm
        formData={formData}
        checkMatchPassword={checkMatchPassword}
        handleChange={handleChange}
        handleSubmit={handleSubmit}
        isSubmitting={isSubmitting}
      />
    </main>
  );
};

export default Resetpassword;
