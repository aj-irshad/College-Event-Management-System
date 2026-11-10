import fetchAllEmails from "./fetchUserEmails.js";
import sendEventNotification from "./notification.js";

const sendEventNotifications = async (event, recipients) => {
  try {
    const emails = Array.isArray(recipients)
      ? recipients.map(({ email }) => email).filter(Boolean)
      : await fetchAllEmails();

    const results = await Promise.allSettled(
      emails.map((email) => sendEventNotification(email, event)),
    );

    const successful = results.filter(
      (result) => result.status === "fulfilled",
    ).length;

    const failed = results.length - successful;

    console.log(
      `Notifications for "${event.title}": ${successful} sent, ${failed} failed.`,
    );
  } catch (error) {
    console.error(
      `Failed to process notifications for "${event.title}":`,
      error.message,
    );
  }
};

export default sendEventNotifications;
