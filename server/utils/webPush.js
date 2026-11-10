import webPush from "web-push";
import PushSubscription from "../model/pushSubscription.js";

let vapidConfigured = false;

const getSafeNotificationPath = (notification, role) => {
  const id = String(notification.linkId || "");
  switch (notification.type) {
    case "event":
      if (!/^[a-f\d]{24}$/i.test(id)) return "/upcoming-events";
      return role === "admin" ? `/edit-event/${id}` : `/participate/${id}`;
    case "blog":
      return /^[a-f\d]{24}$/i.test(id) ? `/blogs/${id}` : "/blogs";
    case "poll":
      return "/polls";
    case "feedback":
      return "/feedback";
    default:
      return "/";
  }
};

const configureVapid = () => {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return false;
  if (!vapidConfigured) {
    webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    vapidConfigured = true;
  }
  return true;
};

const sendPushNotification = async (notification) => {
  try {
    if (!configureVapid()) return;
    const subscriptions = await PushSubscription.find({ user: notification.recipient })
      .select("+endpoint +keys.p256dh +keys.auth")
      .populate("user", "role")
      .lean();
    const uniqueSubscriptions = new Map(subscriptions.map((item) => [item.endpoint, item]));
    const recipientRole = subscriptions[0]?.user?.role;
    const payload = JSON.stringify({
      title: "EMS",
      body: "You have a new notification. Open EMS to view it.",
      url: getSafeNotificationPath(notification, recipientRole),
      tag: String(notification._id),
    });

    await Promise.all([...uniqueSubscriptions.values()].map(async (item) => {
      try {
        await webPush.sendNotification(
          { endpoint: item.endpoint, keys: item.keys },
          payload,
        );
      } catch (error) {
        if (error.statusCode === 404 || error.statusCode === 410) {
          await PushSubscription.deleteOne({ _id: item._id, user: notification.recipient }).catch(() => {});
          return;
        }
        console.error("Browser push delivery failed:", { statusCode: error.statusCode, code: error.code });
      }
    }));
  } catch (error) {
    // Push delivery is optional; persisted notifications and Socket.IO remain available.
    console.error("Browser push notification could not be sent:", { name: error.name, code: error.code });
  }
};

export default sendPushNotification;
