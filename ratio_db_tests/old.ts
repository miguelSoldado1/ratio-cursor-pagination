import { PipelineStage, Types } from "mongoose";
import postLike from "../models/postLike";
import postRating from "../models/postRating";
import follow from "../models/follow";

const POST_LIKES = "likes";

interface GetCommunityAlbumRatingsParams {
  userId: string;
  albumId: string;
  limit: number;
  pageNumber: number;
}

export async function oldGetCommunityAlbumRatings({ userId, albumId, limit, pageNumber }: GetCommunityAlbumRatingsParams) {
  const pipelineStage: PipelineStage[] = [
    { $match: { album_id: albumId } },
    { $sort: { _id: -1 } },
    { $skip: pageNumber * limit },
    { $limit: limit },
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
  ];

  const result = await postRating.aggregate(pipelineStage);
  return { results: result, next: result[limit - 1]?._id ?? null };
}

interface GetPostLikesParams {
  postId: string;
  userId: string;
  next: string;
  limit: number;
}

export async function oldGetPostLikes({ postId, userId, next, limit }: GetPostLikesParams) {
  const pipelineStage: PipelineStage[] = [
    {
      $match: {
        post_id: new Types.ObjectId(postId),
        ...(next &&
          Types.ObjectId.isValid(next) && {
            _id: {
              $lt: new Types.ObjectId(next),
            },
            // Need to ignore the userId because we are returning it as the first element whenever it exists
            user_id: {
              $ne: userId,
            },
          }),
      },
    },
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
    { $sort: { priority: -1, _id: -1 } },
    { $limit: limit },
  ];

  const result = await postLike.aggregate(pipelineStage);

  return { results: result, next: result[limit - 1]?._id ?? null };
}

interface GetUserFollowersParams {
  profileId: string;
  userId: string;
  next: string;
  limit: number;
}

export async function oldGetUserFollowers({ profileId, userId, next, limit }: GetUserFollowersParams) {
  const pipelineStage: PipelineStage[] = [
    {
      $match: {
        following_id: profileId,
        ...(next &&
          Types.ObjectId.isValid(next) && {
            _id: {
              $lt: new Types.ObjectId(next),
            },
            // Need to ignore the userId because we are returning it as the first element whenever it exists
            follower_id: {
              $ne: userId,
            },
          }),
      },
    },
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
        _id: -1,
      },
    },
    { $limit: limit },
  ];

  const result = await follow.aggregate(pipelineStage);

  return { results: result, next: result[limit - 1]?._id ?? null };
}

interface GetUserRatingsParams {
  userId: string;
  profileId: string;
  filter: "oldest" | "latest" | "top_rated";
  next: string;
  limit: number;
}

export async function oldGetUserRatings({ userId, profileId, filter, next, limit }: GetUserRatingsParams) {
  let pipelineStage: PipelineStage[] = await handleCursorFilters(filter, profileId, next);
  pipelineStage.push(
    {
      $limit: limit,
    },
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
    }
  );

  const result = await postRating.aggregate(pipelineStage);

  return { results: result, next: result[limit - 1]?._id ?? null };
}

const handleCursorFilters = async (
  filter: string | undefined,
  user_id: string,
  cursor: string | undefined
): Promise<PipelineStage[]> => {
  switch (filter) {
    case "oldest":
      return [
        {
          $match: {
            user_id: user_id,
            ...(cursor &&
              Types.ObjectId.isValid(cursor) && {
                _id: {
                  $gt: new Types.ObjectId(cursor),
                },
              }),
          },
        },
        {
          $sort: {
            createdAt: 1,
            _id: 1,
          },
        },
      ];
    case "top_rated":
      const post = await postRating.findById(cursor);
      return [
        {
          $match: {
            user_id: user_id,
            ...(cursor &&
              post &&
              Types.ObjectId.isValid(cursor) && {
                $and: [
                  {
                    rating: {
                      $lte: post.rating ?? 10,
                    },
                  },
                  {
                    $or: [
                      { rating: { $lt: post.rating ?? 10 } },
                      {
                        $and: [{ rating: post.rating ?? 10 }, { _id: { $lt: new Types.ObjectId(cursor) } }],
                      },
                    ],
                  },
                ],
              }),
          },
        },
        {
          $sort: {
            rating: -1,
            createdAt: -1,
            _id: 1,
          },
        },
      ];
    default:
    case "latest":
      return [
        {
          $match: {
            user_id: user_id,
            ...(cursor &&
              Types.ObjectId.isValid(cursor) && {
                _id: {
                  $lt: new Types.ObjectId(cursor),
                },
              }),
          },
        },
        {
          $sort: {
            createdAt: -1,
            _id: -1,
          },
        },
      ];
  }
};
