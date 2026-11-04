import "dotenv/config";
import crypto from "crypto";
import mongoose from "mongoose";

const DRY_RUN = !process.argv.includes("--apply");
const FIVE_DAYS_MS = 5 * 24 * 60 * 60 * 1000;
const FIVE_DAYS_SECONDS = FIVE_DAYS_MS / 1000;
const TYPES = new Set(["event", "blog", "poll", "feedback"]);
const NORMAL_TITLES = new Set([
  "New Event Added!",
  "New Blog Published!",
  "New Campus Poll Active",
  "New Feedback Form",
]);
const REMINDER_TITLES = new Map([
  ["event", "Event ending soon"],
  ["feedback", "Feedback form closing soon"],
]);

const classifyReminder = (record) => {
  if (typeof record.isExpiryReminder === "boolean") return record.isExpiryReminder;
  if (NORMAL_TITLES.has(record.title)) return false;
  if (REMINDER_TITLES.get(record.type) === record.title) return true;
  return null;
};

const deterministicId = (sourceId, recipientId, isExpiryReminder) =>
  crypto.createHash("sha256")
    .update(`${sourceId}:${recipientId}:${isExpiryReminder ? "expiry" : "normal"}`)
    .digest("hex")
    .slice(0, 24);

const asBsonObjectId = (value) => {
  if (value instanceof mongoose.Types.ObjectId) return value;
  if (typeof value === "string" && /^[a-f\d]{24}$/i.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }
  return null;
};

const main = async () => {
  const summary = {
    mode: DRY_RUN ? "dry-run" : "apply",
    legacyFound: 0,
    eligibleUsers: 0,
    wouldCreate: 0,
    created: 0,
    alreadyMigrated: 0,
    normalizedRecipientRecords: 0,
    conflicts: 0,
    skippedInvalidReference: 0,
    skippedExpired: 0,
    skippedUnclassifiable: 0,
    errors: 0,
    invalidRecipients: 0,
    retentionTtlIndexFound: false,
    retentionBlockedWrites: 0,
  };

  try {
    if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
    await mongoose.connect(process.env.MONGO_URI, { autoIndex: false });
    const notifications = mongoose.connection.collection("notifications");
    const usersCollection = mongoose.connection.collection("users");
    const [legacy, users, indexes] = await Promise.all([
      notifications.find({ recipient: { $exists: false } }).toArray(),
      usersCollection.find({}, { projection: { _id: 1 } }).toArray(),
      notifications.listIndexes().toArray(),
    ]);
    summary.retentionTtlIndexFound = indexes.some((index) =>
      index.key?.createdAt === 1 && index.expireAfterSeconds === FIVE_DAYS_SECONDS,
    );
    if (!summary.retentionTtlIndexFound) {
      console.error("Required existing five-day createdAt TTL index was not found; apply mode will not write migrated records.");
      summary.errors += 1;
    }
    summary.legacyFound = legacy.length;
    const eligibleUsers = [];
    for (const user of users) {
      if (asBsonObjectId(user._id)) eligibleUsers.push(user);
      else {
        summary.invalidRecipients += 1;
        console.warn(`SKIP invalid recipient user ID: ${String(user._id)}`);
      }
    }
    summary.eligibleUsers = eligibleUsers.length;
    const cutoff = new Date(Date.now() - FIVE_DAYS_MS);

    for (const source of legacy) {
      const linkId = asBsonObjectId(source.linkId);
      if (!linkId || !TYPES.has(source.type)) {
        summary.skippedInvalidReference += 1;
        console.warn(`SKIP invalid/missing reference: ${source._id}`);
        continue;
      }
      if (!(source.createdAt instanceof Date) || source.createdAt <= cutoff) {
        summary.skippedExpired += 1;
        continue;
      }
      const isExpiryReminder = classifyReminder(source);
      if (isExpiryReminder === null) {
        summary.skippedUnclassifiable += 1;
        console.warn(`SKIP unknown reminder kind: ${source._id} (${source.title})`);
        continue;
      }
      const readBy = Array.isArray(source.readBy)
        ? source.readBy.map(asBsonObjectId).filter(Boolean).map(String)
        : [];

      for (const user of eligibleUsers) {
        const recipient = asBsonObjectId(user._id);
        const identity = {
          recipient,
          type: source.type,
        };
        const matches = await notifications.find({
          ...identity,
          linkId: { $in: [linkId, linkId.toHexString()] },
        }).toArray();
        const malformedReference = matches.some((item) =>
          !(item.linkId instanceof mongoose.Types.ObjectId),
        );
        if (malformedReference) {
          summary.conflicts += 1;
          console.warn(`CONFLICT non-BSON recipient reference: source=${source._id}, user=${recipient}`);
          continue;
        }
        const classified = matches.map((item) => ({ item, kind: classifyReminder(item) }));
        const ambiguous = classified.some(({ kind }) => kind === null);
        const conflictingKind = classified.some(({ kind }) => kind !== null && kind !== isExpiryReminder);
        const expected = classified.filter(({ kind }) => kind === isExpiryReminder);
        if (ambiguous || conflictingKind || expected.length > 1) {
          summary.conflicts += 1;
          console.warn(`CONFLICT recipient records: source=${source._id}, user=${recipient}`);
          continue;
        }
        if (expected.length === 1) {
          const existing = expected[0].item;
          if (Object.hasOwn(existing, "isExpiryReminder")) {
            summary.alreadyMigrated += 1;
            continue;
          }
          summary.normalizedRecipientRecords += 1;
          if (!DRY_RUN && !summary.retentionTtlIndexFound) {
            summary.retentionBlockedWrites += 1;
            continue;
          }
          if (!DRY_RUN && summary.retentionTtlIndexFound) {
            try {
              await notifications.updateOne(
                { _id: existing._id, recipient, type: source.type, linkId, isExpiryReminder: { $exists: false } },
                { $set: { isExpiryReminder } },
              );
              const verified = await notifications.findOne({ _id: existing._id });
              if (!verified || verified.isExpiryReminder !== isExpiryReminder) {
                summary.conflicts += 1;
                console.warn(`CONFLICT normalization not applied: ${existing._id}`);
              }
            } catch (error) {
              if (error.code === 11000) {
                summary.conflicts += 1;
                console.warn(`CONFLICT unique index while normalizing ${existing._id}`);
              } else {
                summary.errors += 1;
                console.error(`ERROR normalizing ${existing._id}: ${error.message}`);
              }
            }
          }
          continue;
        }

        summary.wouldCreate += 1;
        if (!DRY_RUN && !summary.retentionTtlIndexFound) {
          summary.retentionBlockedWrites += 1;
          continue;
        }
        if (!DRY_RUN && summary.retentionTtlIndexFound) {
          const migrated = {
            _id: new mongoose.Types.ObjectId(deterministicId(source._id, recipient, isExpiryReminder)),
            recipient,
            title: source.title,
            message: source.message,
            type: source.type,
            linkId,
            read: readBy.includes(String(recipient)),
            isExpiryReminder,
            createdAt: source.createdAt,
            ...(source.updatedAt ? { updatedAt: source.updatedAt } : {}),
          };
          try {
            await notifications.insertOne(migrated);
            summary.created += 1;
          } catch (error) {
            if (error.code === 11000) {
              const collision = await notifications.findOne({
                _id: migrated._id,
                recipient,
                type: source.type,
                linkId,
                isExpiryReminder,
              });
              if (collision) summary.alreadyMigrated += 1;
              else {
                summary.conflicts += 1;
                console.warn(`CONFLICT duplicate key for source=${source._id}, user=${recipient}`);
              }
            } else {
              summary.errors += 1;
              console.error(`ERROR migrating source=${source._id}, user=${recipient}: ${error.message}`);
            }
          }
        }
      }
    }
  } catch (error) {
    summary.errors += 1;
    console.error(`Migration failed: ${error.message}`);
  } finally {
    console.log("Notification migration summary:", JSON.stringify(summary, null, 2));
    if (mongoose.connection.readyState) await mongoose.disconnect();
  }
  if (summary.errors) process.exitCode = 1;
};

main();
