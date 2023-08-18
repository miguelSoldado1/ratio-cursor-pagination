import { Types } from "mongoose";
import { tablePagination, infinitePagination } from "../pagination";
import follow, { Follow } from "../models/follow";
import postLike, { type PostLike } from "../models/postLike";
import postRating, { type PostRating } from "../models/postRating";
import type { InfinitePaginationParams, TablePaginationParams } from "../pagination/types";

const POST_LIKES = "likes";

interface GetCommunityAlbumRatingsParams<T> extends Omit<TablePaginationParams<T>, "query" | "match"> {
  albumId: string;
  userId: string;
}

export async function newGetCommunityAlbumRatings(params: GetCommunityAlbumRatingsParams<PostRating>) {
  const { userId, albumId, ...rest } = params;

  const paginationParams: TablePaginationParams<PostRating> = {
    match: { album_id: albumId },
    query: [
      {
        $lookup: {
          from: postLike.collection.name,
          localField: "_id",
          foreignField: "post_id",
          as: POST_LIKES,
        },
      },
      {
        $addFields: {
          likes: { $size: `$${POST_LIKES}` },
          liked_by_user: {
            $gt: [
              { $size: { $filter: { input: `$${POST_LIKES}`, as: "like", cond: { $eq: ["$$like.user_id", userId] } } } },
              0,
            ],
          },
          // just added so the array comparer works ok
          _id: { $toString: "$_id" },
          createdAt: { $toString: "$createdAt" },
        },
      },
    ],
    ...rest,
  };

  return await tablePagination<PostRating>(paginationParams, postRating);
}

interface GetPostLikesParams<T> extends Omit<InfinitePaginationParams<T>, "query" | "match"> {
  postId: string;
  userId: string;
}

export async function newGetPostLikes(params: GetPostLikesParams<PostLike>) {
  const { postId, userId, next, ...rest } = params;

  if (!Types.ObjectId.isValid(postId)) throw new Error();

  const paginationParams: InfinitePaginationParams<PostLike> = {
    next: next,
    match: {
      post_id: new Types.ObjectId(postId),
      ...(next && {
        user_id: {
          $ne: userId,
        },
      }),
    },
    query: [
      {
        $lookup: {
          from: follow.collection.name,
          let: { userId: "$user_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$follower_id", userId] }, { $eq: ["$following_id", "$$userId"] }],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: "isFollowing",
        },
      },
      {
        $addFields: {
          isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] },
          priority: {
            $cond: {
              if: !next,
              then: { $eq: ["$user_id", userId] },
              else: false,
            },
          },
          // just added so the array comparer works ok
          _id: { $toString: "$_id" },
          createdAt: { $toString: "$createdAt" },
          post_id: { $toString: "$post_id" },
        },
      },
      {
        $sort: {
          priority: -1,
        },
      },
    ],
    ...rest,
  };

  return await infinitePagination<PostLike>(paginationParams, postLike);
}

interface GetUserFOllowersParams<T> extends Omit<InfinitePaginationParams<T>, "query" | "match"> {
  profileId: string;
  userId: string;
}

export async function newGetUserFollowers(params: GetUserFOllowersParams<Follow>) {
  const { profileId, userId, next, ...rest } = params;

  const paginationParams: InfinitePaginationParams<Follow> = {
    next: next,
    match: {
      following_id: profileId,
      ...(next && {
        user_id: {
          $ne: userId,
        },
      }),
    },
    query: [
      {
        $lookup: {
          from: follow.collection.name,
          let: { userId: "$follower_id" },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [{ $eq: ["$following_id", "$$userId"] }, { $eq: ["$follower_id", userId] }],
                },
              },
            },
            { $project: { _id: 1 } },
          ],
          as: "isFollowing",
        },
      },
      {
        $addFields: {
          isFollowing: { $gt: [{ $size: "$isFollowing" }, 0] },
          // if the user is a follower we want to return it at the top of the list.
          priority: {
            $cond: {
              if: !next,
              then: { $eq: ["$follower_id", userId] },
              else: false,
            },
          },
          // just added so the array comparer works ok
          _id: { $toString: "$_id" },
          createdAt: { $toString: "$createdAt" },
        },
      },
      {
        $sort: {
          priority: -1,
        },
      },
    ],
    ...rest,
  };

  return await infinitePagination<Follow>(paginationParams, follow);
}

interface GetUserRatingsParams<T> extends Omit<InfinitePaginationParams<T>, "query" | "match"> {
  userId: string;
  profileId: string;
}

export async function newGetUserRatings(params: GetUserRatingsParams<PostRating>) {
  const { profileId, userId, ...rest } = params;

  const paginationParams: InfinitePaginationParams<PostRating> = {
    match: { user_id: profileId },
    query: [
      {
        $lookup: {
          from: postLike.collection.name,
          localField: "_id",
          foreignField: "post_id",
          as: POST_LIKES,
        },
      },
      {
        $addFields: {
          likes: { $size: `$${POST_LIKES}` },
          liked_by_user: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: `$${POST_LIKES}`,
                    as: "like",
                    cond: { $eq: ["$$like.user_id", userId] },
                  },
                },
              },
              0,
            ],
          },
          // just added so the array comparer works ok
          _id: { $toString: "$_id" },
          createdAt: { $toString: "$createdAt" },
        },
      },
    ],
    ...rest,
  };

  return await infinitePagination<PostRating>(paginationParams, postRating);
}
