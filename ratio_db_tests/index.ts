import { Types } from "mongoose";
import { compareFunctions } from "..";
import { newGetCommunityAlbumRatings, newGetPostLikes, newGetUserFollowers, newGetUserRatings } from "./new";
import { oldGetCommunityAlbumRatings, oldGetPostLikes, oldGetUserFollowers, oldGetUserRatings } from "./old";

export async function compareGetUserRating() {
  const profileId = "1191841097";
  const userId = "miguelsoldado_";
  const limit = 15;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newGetUserRatings({
        profileId,
        userId,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        limit,
        sortAscending: true,
      }),
    async () => await oldGetUserRatings({ profileId, userId, next: nextString, limit, filter: "oldest" })
  );
}

export async function compareGetUserFollowers() {
  const profileId = "1183596138";
  const userId = "miguelsoldado_";
  const limit = 12;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newGetUserFollowers({
        profileId,
        userId,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        limit,
      }),
    async () => await oldGetUserFollowers({ profileId, userId, next: nextString, limit })
  );
}

export async function comparePostLikes() {
  const postId = "645b66015886504c04cbb35c";
  const userId = "1183596138";
  const limit = 10;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newGetPostLikes({
        postId,
        userId,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        limit,
      }),
    async () => await oldGetPostLikes({ postId, userId, next: nextString, limit })
  );
}

export async function compareAlbumRatings() {
  const userId = "miguelsoldado_";
  const albumId = "4aW4iDepQUl5ZCHd1Gli68";
  const limit = 3;
  const nextString = null;

  await compareFunctions(
    async () =>
      await newGetCommunityAlbumRatings({
        userId,
        albumId,
        limit,
        next: Types.ObjectId.isValid(nextString) ? new Types.ObjectId(nextString) : null,
        previous: null,
      }),
    async () => await oldGetCommunityAlbumRatings({ userId, albumId, limit, pageNumber: 0 })
  );
}
