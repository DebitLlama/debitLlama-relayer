import QueryBuilder from "../db/queryBuilder.ts";

export type ProcessHandler = (
  queryBuilder: QueryBuilder,
  job: any,
) => Promise<void>;

export async function processJobs(
  jobs: Array<any>,
  queryBuilder: QueryBuilder,
  handler: ProcessHandler,
) {
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log("GOT JOB ", i);
    console.log(job);
    await handler(queryBuilder, job).catch((err) => {
      console.log("Job Handler Errorer");
      console.log(err);
    });
  }
}
