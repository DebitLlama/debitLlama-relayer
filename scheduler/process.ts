export type ProcessHandler = (
  job: any,
) => Promise<void>;

export async function processJobs(
  jobs: Array<any>,
  handler: ProcessHandler,
) {
  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    console.log("GOT JOB ", i);
    console.log(job);
    await handler(job).catch((err) => {
      console.log("Job Handler Errorer");
      console.log(err);
    });
  }
}
