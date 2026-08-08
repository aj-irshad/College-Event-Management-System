import { LockKeyhole } from "lucide-react";

function ResetBanner() {
  return (
    <section className="createPassword">
      <LockKeyhole className="resetPasswordIcon" />
      <h1>Create New Password</h1>
      <p>Choose a password for your account</p>
    </section>
  );
}

export default ResetBanner;
