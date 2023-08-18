import mongoose, { FilterQuery, ObjectId, PipelineStage } from "mongoose";

export type TablePaginationParams<T> = {
  next: mongoose.Types.ObjectId | null;
  previous: mongoose.Types.ObjectId | null;
  limit: number;
  sortAscending?: boolean;
  paginatedField?: keyof T;
  query?: PipelineStage[];
  match?: FilterQuery<T>;
};

export type InfinitePaginationParams<T> = {
  next: mongoose.Types.ObjectId | null;
  limit: number;
  sortAscending?: boolean;
  paginatedField?: keyof T;
  query?: PipelineStage[];
  match?: FilterQuery<T>;
};

export type TablePaginationResult = {
  next: string | null;
  previous: string | null;
  results: any[];
};
