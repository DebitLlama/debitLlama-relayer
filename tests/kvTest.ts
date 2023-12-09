export const kv = await Deno.openKv();

// Listen to the enqueued jobs
kv.listenQueue(async (msg: any) => {
  console.log(msg);
  setTimeout(() => {
    console.log(new Date().getSeconds());
  }, 2000);
});

async function triggerQueue() {
  await kv.atomic().enqueue("listenQueue Triggered").commit();
}

async function benchmark_queue() {
  console.time("queueTime");
  for (let i = 0; i < 1000000; i++) {
    await triggerQueue();
  }
  console.timeEnd("queueTime");
}

// await benchmark_queue();

//Around 55 Tps
