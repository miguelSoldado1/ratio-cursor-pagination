import { Types } from "mongoose";
import { compareFunctions } from "..";
import * as newFunctions from "./new";
import * as oldFunctions from "./old";

export async function compareGetUserRating() {
  const profileId = "1191841097";
  const userId = "miguelsoldado_";
  const limit = 15;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newFunctions.newGetUserRatings({
        profileId,
        userId,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        limit,
        sortAscending: true,
      }),
    async () => await oldFunctions.oldGetUserRatings({ profileId, userId, next: nextString, limit, filter: "oldest" })
  );
}

export async function compareGetUserFollowers() {
  const profileId = "1183596138";
  const userId = "miguelsoldado_";
  const limit = 12;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newFunctions.newGetUserFollowers({
        profileId,
        userId,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        limit,
      }),
    async () => await oldFunctions.oldGetUserFollowers({ profileId, userId, next: nextString, limit })
  );
}

export async function comparePostLikes() {
  const postId = "645b66015886504c04cbb35c";
  const userId = "1183596138";
  const limit = 10;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newFunctions.newGetPostLikes({
        postId,
        userId,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        limit,
      }),
    async () => await oldFunctions.oldGetPostLikes({ postId, userId, next: nextString, limit })
  );
}

export async function compareAlbumRatings() {
  const userId = "miguelsoldado_";
  const albumId = "4aW4iDepQUl5ZCHd1Gli68";
  const limit = 3;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newFunctions.newGetCommunityAlbumRatings({
        userId,
        albumId,
        limit,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        previous: null,
      }),
    async () => await oldFunctions.oldGetCommunityAlbumRatings({ userId, albumId, limit, pageNumber: 0 })
  );
}

export async function compareGetFollowingRatings() {
  const userId = "miguelsoldado_";
  const limit = 10;
  const nextString = "63d83f441c37207fa0a89f76";

  await compareFunctions(
    async () =>
      await newFunctions.newGetFollowingRatings({
        userId,
        limit,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
      }),
    async () => await oldFunctions.oldGetFollowingRatings({ userId, limit, next: nextString })
  );
}
