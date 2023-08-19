import { FilterQuery, Model, PipelineStage } from "mongoose";
import type { InfinitePaginationParams } from "./types";

export default async function infinitePagination<T>(params: InfinitePaginationParams<T>, model: Model<T>) {
  const match = await generateCursorQuery<T>(params, model);
  const sort = generateSort(params);
  const limit = params.limit + 1;

  const pipelineStage: PipelineStage[] = [
    { $match: { ...params.match, ...match } },
    { $sort: sort },
    { $limit: limit },
    ...(params.query || []),
  ];

  const response = await model.aggregate(pipelineStage);
  return generateResponse(response, params);
}

async function generateCursorQuery<T>(params: InfinitePaginationParams<T>, model: Model<T>): Promise<FilterQuery<T>> {
  if (!params.next) return {};

  const sortAsc = params.sortAscending;
  const cursor = params.next;

  if (!params.paginatedField || params.paginatedField == "_id") {
    if (params.sortAscending) return { _id: { $gt: cursor } };
    return { _id: { $lt: cursor } };
  }

  const field = params.paginatedField;

  const notUndefined = { [field]: { $exists: true } };
  const onlyUndefs = { [field]: { $exists: false } };
  const notNullNorUndefined = { [field]: { $ne: null } };
  const nullOrUndefined = { [field]: null };
  const onlyNulls = { $and: [{ [field]: { $exists: true } }, { [field]: null }] };

  const doc = await model.findById(cursor);

  switch (doc?.[params.paginatedField]) {
    case null:
      if (sortAsc) {
        return {
          $or: [
            notNullNorUndefined,
            {
              ...onlyNulls,
              _id: { $gt: cursor },
            },
          ],
        } as FilterQuery<T>;
      } else {
        return {
          $or: [
            onlyUndefs,
            {
              ...onlyNulls,
              _id: { $lt: cursor },
            },
          ],
        } as FilterQuery<T>;
      }
    case undefined:
      if (sortAsc) {
        return {
          $or: [
            notUndefined,
            {
              ...onlyUndefs,
              _id: { $gt: cursor },
            },
          ],
        } as FilterQuery<T>;
      } else {
        return {
          ...onlyUndefs,
          _id: { $lt: cursor },
        };
      }
    default:
      if (sortAsc) {
        return {
          $or: [
            { [field]: { $gt: doc[params.paginatedField] } },
            {
              [field]: { $eq: doc[params.paginatedField] },
              _id: { $gt: cursor },
            },
          ],
        } as FilterQuery<T>;
      } else {
        return {
          $or: [
            { [field]: { $lt: doc[params.paginatedField] } },
            nullOrUndefined,
            {
              [field]: { $eq: doc[params.paginatedField] },
              _id: { $lt: cursor },
            },
          ],
        } as FilterQuery<T>;
      }
  }
}

function generateSort<T>(params: InfinitePaginationParams<T>): FilterQuery<T> {
  const sortDir = params.sortAscending ? 1 : -1;

  if (params.paginatedField === "_id" || !params.paginatedField) {
    return { _id: sortDir };
  }

  return { [params.paginatedField]: sortDir, _id: sortDir };
}

function generateResponse<T>(results: any[], params: InfinitePaginationParams<T>) {
  const hasMore = results.length > params.limit;
  if (hasMore) results.pop();

  return {
    next: hasMore ? results[results.length - 1]?._id : null,
    results,
  };
}
