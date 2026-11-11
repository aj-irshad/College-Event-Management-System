import fs from "fs/promises";
import path from "path";

import Users from "../model/user.js";
import PendingUser from "../model/pendingUser.js";
import { deleteFromCloudinary } from "./cloudinary.js";
import { getUploadDirectory } from "./uploadPaths.js";

export const removePendingProfileImageIfUnused = async (
  pendingUser,
  { writeDefinitelyDidNotCommit = true } = {},
) => {
  const image = pendingUser?.profileImage;
  if (!image) return;

  if (pendingUser.profileImagePublicId) {
    const [userReference, pendingReference] = await Promise.all([
      Users.exists({
        $or: [
          { profileImagePublicId: pendingUser.profileImagePublicId },
          { profileImage: image },
        ],
      }),
      PendingUser.exists({
        $or: [
          { profileImagePublicId: pendingUser.profileImagePublicId },
          { profileImage: image },
        ],
      }),
    ]);
    if (!userReference && !pendingReference) {
      if (!writeDefinitelyDidNotCommit) {
        console.error("Pending signup write outcome is uncertain; retaining profile image");
        return;
      }
      await deleteFromCloudinary(pendingUser.profileImagePublicId);
    }
    return;
  }

  if (/^https?:\/\//i.test(image)) return;
  const filename = path.basename(image);
  if (!filename || filename !== image || filename.includes("\\")) return;

  const [userReference, pendingReference] = await Promise.all([
    Users.exists({ profileImage: image }),
    PendingUser.exists({ profileImage: image }),
  ]);
  if (userReference || pendingReference) return;
  if (!writeDefinitelyDidNotCommit) {
    console.error("Pending signup write outcome is uncertain; retaining profile image");
    return;
  }

  await fs.unlink(path.join(getUploadDirectory("profiles"), filename)).catch((error) => {
    if (error.code !== "ENOENT") throw error;
  });
};
