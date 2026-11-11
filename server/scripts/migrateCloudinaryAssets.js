import "dotenv/config";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import mongoose from "mongoose";
import { getUploadDirectory } from "../utils/uploadPaths.js";
import {
  getCloudinaryAsset,
  uploadToCloudinary,
} from "../utils/cloudinary.js";

const args = process.argv.slice(2);
const apply = args.length === 1 && args[0] === "--apply";
const dryRun = args.length === 0 || (args.length === 1 && args[0] === "--dry-run");
if (!apply && !dryRun) {
  console.error("Usage: node scripts/migrateCloudinaryAssets.js [--dry-run | --apply]");
  process.exit(2);
}

mongoose.set("autoIndex", false);
mongoose.set("autoCreate", false);

const definitions = [
  {
    name: "Users",
    load: async () => (await import("../model/user.js")).default,
    imageField: "profileImage",
    publicIdField: "profileImagePublicId",
    diskFolder: "profiles",
    cloudFolder: "profiles",
  },
  {
    name: "PendingUsers",
    load: async () => (await import("../model/pendingUser.js")).default,
    imageField: "profileImage",
    publicIdField: "profileImagePublicId",
    diskFolder: "profiles",
    cloudFolder: "profiles",
  },
  {
    name: "Blogs",
    load: async () => (await import("../model/blogs.js")).default,
    imageField: "blogImage",
    publicIdField: "blogImagePublicId",
    diskFolder: "blogs",
    cloudFolder: "blogs",
  },
  {
    name: "Payments",
    load: async () => (await import("../model/payment.js")).default,
    imageField: "proofFilename",
    publicIdField: "proofPublicId",
    urlField: "proofUrl",
    resourceTypeField: "proofResourceType",
    mimeField: "proofMimeType",
    diskFolder: "payments/proofs",
    cloudFolder: "payment-proofs",
  },
];

const isHttpUrl = (value) => typeof value === "string" && /^https?:\/\//i.test(value);
const isSafeLocalFilename = (value) =>
  typeof value === "string" &&
  value.length > 0 &&
  path.basename(value) === value &&
  !value.includes("\\") &&
  !value.includes("\0");

const getReferencedLocalAsset = (record, definition) => {
  const value = record[definition.imageField];
  const publicId = record[definition.publicIdField];
  const url = definition.urlField ? record[definition.urlField] : value;

  if (publicId && isHttpUrl(url)) return { state: "migrated" };
  if (isHttpUrl(value) || (definition.urlField && isHttpUrl(url))) {
    return { state: "conflict", reason: "URL exists without a complete Cloudinary reference" };
  }
  if (!value) return { state: "empty" };
  if (publicId) return { state: "conflict", reason: "Local value already has a Cloudinary public ID" };
  if (!isSafeLocalFilename(value)) {
    return { state: "invalid", reason: "Value is not a safe local filename" };
  }
  return { state: "local", filename: value };
};

const fileHash = (buffer) => crypto.createHash("sha256").update(buffer).digest("hex");

const makeUpdateFilter = (record, definition, filename) => ({
  _id: record._id,
  [definition.imageField]: filename,
  $or: [
    { [definition.publicIdField]: { $exists: false } },
    { [definition.publicIdField]: "" },
    { [definition.publicIdField]: null },
  ],
});

const run = async () => {
  if (!process.env.MONGO_URI) throw new Error("MONGO_URI is not configured");
  await mongoose.connect(process.env.MONGO_URI, {
    autoIndex: false,
    autoCreate: false,
  });

  const models = await Promise.all(definitions.map(async (definition) => ({
    definition,
    Model: await definition.load(),
  })));

  const report = {
    mode: apply ? "apply" : "dry-run",
    database: mongoose.connection.name,
    recordsScanned: 0,
    alreadyMigrated: 0,
    localReferences: 0,
    matchingLocalFiles: 0,
    missingLocalFiles: 0,
    invalidReferences: 0,
    conflicts: 0,
    uploadPreviews: 0,
    uploadedOrReusedAssets: 0,
    databaseUpdates: 0,
    writeConflicts: 0,
    errors: 0,
    localFilesPreserved: true,
    folders: {},
  };

  const assetCache = new Map();
  const candidates = [];
  const inventoryByFolder = new Map();
  for (const folder of new Set(definitions.map((definition) => definition.diskFolder))) {
    const directory = getUploadDirectory(folder);
    try {
      const entries = await fs.readdir(directory, { withFileTypes: true });
      inventoryByFolder.set(folder, new Set(entries.filter((entry) => entry.isFile()).map((entry) => entry.name)));
    } catch (error) {
      if (error.code === "ENOENT") inventoryByFolder.set(folder, new Set());
      else throw error;
    }
  }

  for (const { definition, Model } of models) {
    const projection = {
      _id: 1,
      [definition.imageField]: 1,
      [definition.publicIdField]: 1,
      ...(definition.urlField ? { [definition.urlField]: 1 } : {}),
      ...(definition.mimeField ? { [definition.mimeField]: 1 } : {}),
      ...(definition.resourceTypeField ? { [definition.resourceTypeField]: 1 } : {}),
    };
    const records = await Model.find({}, projection).lean();
    const folderSummary = report.folders[definition.name] = {
      records: records.length,
      localFilesInInventory: inventoryByFolder.get(definition.diskFolder)?.size || 0,
      alreadyMigrated: 0,
      localReferences: 0,
      matchingFiles: 0,
      missingFiles: 0,
      invalidReferences: 0,
      conflicts: 0,
      unreferencedLocalFiles: 0,
    };
    report.recordsScanned += records.length;

    const referencedNames = new Set();
    const inventory = inventoryByFolder.get(definition.diskFolder) || new Set();
    for (const record of records) {
      const reference = getReferencedLocalAsset(record, definition);
      if (reference.state === "migrated") {
        folderSummary.alreadyMigrated += 1;
        report.alreadyMigrated += 1;
        continue;
      }
      if (reference.state === "empty") continue;
      if (reference.state === "invalid") {
        folderSummary.invalidReferences += 1;
        report.invalidReferences += 1;
        console.log(`SKIP invalid ${definition.name} record ${record._id}: ${reference.reason}`);
        continue;
      }
      if (reference.state === "conflict") {
        folderSummary.conflicts += 1;
        report.conflicts += 1;
        console.log(`CONFLICT ${definition.name} record ${record._id}: ${reference.reason}`);
        continue;
      }

      folderSummary.localReferences += 1;
      report.localReferences += 1;
      referencedNames.add(reference.filename);
      if (!inventory.has(reference.filename)) {
        folderSummary.missingFiles += 1;
        report.missingLocalFiles += 1;
        console.log(`SKIP missing file for ${definition.name} record ${record._id}`);
        continue;
      }

      folderSummary.matchingFiles += 1;
      report.matchingLocalFiles += 1;
      candidates.push({ definition, Model, record, filename: reference.filename });
      report.uploadPreviews += 1;
      const updates = definition.urlField
        ? `${definition.urlField}, ${definition.publicIdField}, ${definition.resourceTypeField}`
        : `${definition.imageField}, ${definition.publicIdField}`;
      console.log(`PREVIEW ${definition.name} record ${record._id}: ${definition.diskFolder}/${reference.filename} -> ems/${definition.cloudFolder}; set ${updates}`);
    }

    folderSummary.unreferencedLocalFiles = [...inventory].filter((name) => !referencedNames.has(name)).length;
  }

  if (apply) {
    for (const candidate of candidates) {
      const { definition, Model, record, filename } = candidate;
      const filePath = path.resolve(getUploadDirectory(definition.diskFolder), filename);
      const allowedPrefix = `${getUploadDirectory(definition.diskFolder)}${path.sep}`;
      if (!filePath.startsWith(allowedPrefix)) {
        report.invalidReferences += 1;
        report.errors += 1;
        console.log(`ERROR refused unsafe path for ${definition.name} record ${record._id}`);
        continue;
      }

      try {
        const content = await fs.readFile(filePath);
        const contentHash = fileHash(content);
        const cacheKey = `${definition.cloudFolder}:${contentHash}`;
        let asset = assetCache.get(cacheKey);
        if (!asset) {
          const resourceType = definition.mimeField && record[definition.mimeField] === "application/pdf"
            ? "raw"
            : "image";
          const deterministicId = `legacy-${contentHash}${resourceType === "raw" ? ".pdf" : ""}`;
          const fullPublicId = `ems/${definition.cloudFolder}/${deterministicId}`;
          asset = await getCloudinaryAsset(fullPublicId, resourceType);
          if (!asset) {
            try {
              asset = await uploadToCloudinary(filePath, definition.cloudFolder, {
                resourceType,
                publicId: deterministicId,
                overwrite: false,
              });
            } catch {
              // An earlier interrupted run or a concurrent run may have completed the upload.
              asset = await getCloudinaryAsset(fullPublicId, resourceType);
              if (!asset) throw new Error("Cloudinary upload failed and recovery lookup found no asset");
            }
          }
          assetCache.set(cacheKey, asset);
        }

        report.uploadedOrReusedAssets += 1;
        const fields = definition.urlField
          ? {
              [definition.urlField]: asset.url,
              [definition.publicIdField]: asset.publicId,
              [definition.resourceTypeField]: asset.resourceType,
            }
          : {
              [definition.imageField]: asset.url,
              [definition.publicIdField]: asset.publicId,
            };
        const result = await Model.collection.updateOne(
          makeUpdateFilter(record, definition, filename),
          { $set: fields },
        );
        if (!result.matchedCount) {
          report.writeConflicts += 1;
          console.log(`CONFLICT record changed during migration: ${definition.name} ${record._id}`);
          continue;
        }
        report.databaseUpdates += 1;
      } catch (error) {
        report.errors += 1;
        console.log(`ERROR migrating ${definition.name} record ${record._id}: ${error.message}`);
      }
    }
  }

  console.log("Migration summary:");
  console.log(JSON.stringify(report, null, 2));
  if (report.errors > 0) process.exitCode = 1;
};

run()
  .catch((error) => {
    console.error("Cloudinary migration preparation failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect().catch(() => {});
  });
