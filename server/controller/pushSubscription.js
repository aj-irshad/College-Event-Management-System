import PushSubscription from "../model/pushSubscription.js";

const isDeviceId = (value) =>
  typeof value === "string" && /^[a-z\d-]{16,128}$/i.test(value);

const validateSubscription = (subscription) => {
  if (!subscription || typeof subscription !== "object") return false;
  if (typeof subscription.endpoint !== "string" || subscription.endpoint.length > 2048) return false;
  try {
    const parsedEndpoint = new URL(subscription.endpoint);
    const host = parsedEndpoint.hostname.toLowerCase();
    const trustedPushHost = host === "fcm.googleapis.com" ||
      host === "web.push.apple.com" ||
      host.endsWith(".push.services.mozilla.com");
    if (parsedEndpoint.protocol !== "https:" || !trustedPushHost) return false;
  } catch {
    return false;
  }
  return typeof subscription.keys?.p256dh === "string" &&
    /^[A-Za-z0-9_-]{20,256}$/.test(subscription.keys.p256dh) &&
    typeof subscription.keys?.auth === "string" &&
    /^[A-Za-z0-9_-]{16,128}$/.test(subscription.keys.auth);
};

const subscribePushDevice = async (req, res) => {
  const { deviceId, subscription } = req.body || {};
  if (!isDeviceId(deviceId) || !validateSubscription(subscription)) {
    return res.status(400).json({ message: "Invalid browser push subscription" });
  }

  const values = {
    user: req.userId,
    deviceId,
    endpoint: subscription.endpoint,
    keys: { p256dh: subscription.keys.p256dh, auth: subscription.keys.auth },
  };

  try {
    try {
      await PushSubscription.findOneAndUpdate(
        { endpoint: subscription.endpoint },
        { $set: values },
        { upsert: true, returnDocument: "after", runValidators: true, setDefaultsOnInsert: true },
      );
    } catch (error) {
      // Concurrent first-time subscriptions can race on the unique endpoint.
      if (error.code !== 11000) throw error;
      const updated = await PushSubscription.updateOne(
        { endpoint: subscription.endpoint },
        { $set: values },
        { runValidators: true },
      );
      if (!updated.matchedCount) throw error;
    }

    await PushSubscription.deleteMany({
      user: req.userId,
      deviceId,
      endpoint: { $ne: subscription.endpoint },
    });
    return res.status(200).json({ message: "Browser notifications enabled for this device" });
  } catch (error) {
    console.error("Could not save browser push subscription:", { name: error.name, code: error.code });
    return res.status(500).json({ message: "Could not enable browser notifications" });
  }
};

const unsubscribePushDevice = async (req, res) => {
  const { deviceId, endpoint } = req.body || {};
  if (!isDeviceId(deviceId) && typeof endpoint !== "string") {
    return res.status(400).json({ message: "A valid device subscription is required" });
  }

  const deviceFilter = [];
  if (isDeviceId(deviceId)) deviceFilter.push({ deviceId });
  if (typeof endpoint === "string" && endpoint.length <= 2048) deviceFilter.push({ endpoint });
  if (!deviceFilter.length) return res.status(400).json({ message: "A valid device subscription is required" });

  try {
    await PushSubscription.deleteMany({ user: req.userId, $or: deviceFilter });
    return res.status(200).json({ message: "Browser notifications disabled for this device" });
  } catch (error) {
    console.error("Could not remove browser push subscription:", { name: error.name, code: error.code });
    return res.status(500).json({ message: "Could not disable browser notifications" });
  }
};

export { subscribePushDevice, unsubscribePushDevice };
