import { useState } from "react";
import { resetPassword } from "../../services/authService";
import { useNavigate } from "react-router-dom";
import ResetBanner from "./ResetBanner";
import ResetForm from "./ResetForm";
import "./reset.css";

const Resetpassword = () => {
  const navigate = useNavigate();
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

    if (formData.newPassword !== formData.confirmNewPassword) {
      setCheckMatchPassword(false);
      return;
    }
    setCheckMatchPassword(true);

    try {
      const response = await resetPassword(formData);
      console.log(response);
      alert("Reset password successful");
      navigate("/login");
    } catch (err) {
      navigate("/login");
      console.error(err.message);
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
      />
    </main>
  );
};

export default Resetpassword;
