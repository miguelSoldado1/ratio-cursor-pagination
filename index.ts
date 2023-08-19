import mongoose from "mongoose";
import dotenv from "dotenv";
import postRating, { PostRating } from "./models/postRating";
import postLike from "./models/postLike";
import { tablePagination, infinitePagination } from "./pagination";
import { compareAlbumRatings, compareGetUserFollowers, compareGetUserRating, comparePostLikes } from "./ratio_db_tests";
import { arraysEqual } from "./utils";
import type { InfinitePaginationParams, TablePaginationParams } from "./pagination/types";

dotenv.config();

async function main() {
  await mongoose.connect(process.env.DATABASE_URL);

  console.log("user ratings:");
  await compareGetUserRating();
  console.log("user followers:");
  await compareGetUserFollowers();
  console.log("post likes:");
  await comparePostLikes();
  console.log("album ratings:");
  await compareAlbumRatings();
}

type FunctionType = () => Promise<{ results: any[]; next: any }>;
// function comparer so I can check if the result of the previous aggregation is the same using the helper + check performance
export async function compareFunctions(newFunction: FunctionType, oldFunction: FunctionType) {
  // warmup the db
  await postLike.find({ user_id: "miguelsoldado_" });

  const newStartTime = performance.now();
  const newResult = await newFunction();
  const newEndTime = performance.now();
  const newDuration = newEndTime - newStartTime;

  const oldStartTime = performance.now();
  const oldResult = await oldFunction();
  const oldEndTime = performance.now();
  const oldDuration = oldEndTime - oldStartTime;

  console.log("new_function:", newDuration);
  console.log("old_function:", oldDuration);

  const performanceImprovement = ((oldDuration - newDuration) / oldDuration) * 100;
  console.log(`performance improvement: ${performanceImprovement.toFixed(2)}%`);

  if (!arraysEqual(newResult.results, oldResult.results)) {
    console.error("error");
  } else {
    console.log("success");
  }
}

// validates if the pagination is fine on backwards and forwards
async function validateTablePaginationAccuracy() {
  const params: TablePaginationParams<PostRating> = {
    next: null,
    previous: null,
    limit: 5,
    match: { user_id: "miguelsoldado_" },
    // the compare functions i have don't really like ObjectId's or Dates.
    query: [{ $addFields: { _id: { $toString: "$_id" }, createdAt: { $toString: "$createdAt" } } }],
  };

  const firstPage = await tablePagination(params, postRating);
  const secondPage = await tablePagination({ ...params, next: new mongoose.Types.ObjectId(firstPage.next) }, postRating);
  const thirdPage = await tablePagination({ ...params, next: new mongoose.Types.ObjectId(secondPage.next) }, postRating);
  const forthPage = await tablePagination({ ...params, next: new mongoose.Types.ObjectId(thirdPage.next) }, postRating);
  const newThirdPage = await tablePagination(
    { ...params, previous: new mongoose.Types.ObjectId(forthPage.previous) },
    postRating
  );
  const newSecondPage = await tablePagination(
    { ...params, previous: new mongoose.Types.ObjectId(newThirdPage.previous) },
    postRating
  );
  const newFirstPage = await tablePagination(
    { ...params, previous: new mongoose.Types.ObjectId(newSecondPage.previous) },
    postRating
  );

  return {
    firstPage: arraysEqual(firstPage.results, newFirstPage.results),
    secondPage: arraysEqual(secondPage.results, newSecondPage.results),
    thirdPage: arraysEqual(thirdPage.results, newThirdPage.results),
  };
}

// validates if the table and infinite pagination return the same values when passed the exact same params.
async function validateStrategiesAccuracy() {
  for (let i = 0; i < 6; i++) {
    const params: InfinitePaginationParams<PostRating> = {
      next: null,
      limit: 2,
      paginatedField: "rating",
      match: { user_id: "miguelsoldado_" },
      // the compare functions i have don't really like ObjectId's or Dates.
      query: [
        {
          $addFields: {
            _id: {
              $toString: "$_id",
            },
            createdAt: {
              $toString: "$createdAt",
            },
          },
        },
      ],
    };

    const tableResponse = await tablePagination<PostRating>({ ...params, previous: null }, postRating);
    const infiniteResponse = await infinitePagination<PostRating>(params, postRating);

    if (!arraysEqual(tableResponse.results, infiniteResponse.results) || tableResponse.next !== infiniteResponse.next) {
      console.log({ table: tableResponse.results, infinite: infiniteResponse.results });
      break;
    }

    params.next = infiniteResponse.next;
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error.stack);
    process.exit(1);
  });
