import { Worker, Queue } from "bullmq";
import IORedis from "ioredis";
import { runAuditPipeline } from "@/lib/audit/pipeline";
import type { AuditJobData } from "@/types/audit";

if (!process.env.REDIS_URL) {
  throw new Error("REDIS_URL environment variable is not set.");
}

const connection = new IORedis(process.env.REDIS_URL, {
  maxRetriesPerRequest: null, // Required by BullMQ
  retryStrategy: (times) => Math.min(times * 500, 5000), // Reconnect on disconnect
  reconnectOnError: () => true,
});

connection.on("error", (err) => {
  console.error("[worker] Redis error (will reconnect):", err.message);
});

export const AUDIT_QUEUE_NAME = "audit-jobs";

// ── Queue (used by API routes to enqueue jobs) ────────────────────────────────
export const auditQueue = new Queue<AuditJobData>(AUDIT_QUEUE_NAME, {
  connection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "exponential", delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 50 },
  },
});

// ── Worker (runs as a separate process) ───────────────────────────────────────
export function createAuditWorker(): Worker<AuditJobData> {
  const worker = new Worker<AuditJobData>(
    AUDIT_QUEUE_NAME,
    async (job) => {
      console.log(`[worker] Starting audit job ${job.id} for ${job.data.url}`);

      await runAuditPipeline(job.data.auditId, {
        url: job.data.url,
        maxPages: job.data.options.maxPages ?? 20,
        maxDepth: job.data.options.maxDepth ?? 3,
        respectRobotsTxt: job.data.options.respectRobotsTxt ?? false,
      });

      console.log(`[worker] Completed audit job ${job.id}`);
    },
    {
      connection,
      concurrency: 2,
      limiter: { max: 5, duration: 60_000 },
    }
  );

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  worker.on("error", (err) => {
    console.error("[worker] Worker error:", err.message);
  });

  return worker;
}

// ── Entry point when run directly ────────────────────────────────────────────
if (require.main === module) {
  process.on("unhandledRejection", (reason) => {
    console.error("[worker] Unhandled rejection:", reason);
  });

  process.on("uncaughtException", (err) => {
    console.error("[worker] Uncaught exception:", err);
  });

  process.on("exit", (code) => {
    console.log(`[worker] Process exiting with code ${code}`);
  });

  const worker = createAuditWorker();
  console.log("[worker] Audit worker started");

  // Keep event loop alive
  const keepAlive = setInterval(() => {}, 30_000);

  const shutdown = async () => {
    console.log("[worker] Shutting down...");
    clearInterval(keepAlive);
    await worker.close();
    await connection.quit();
    process.exit(0);
  };

  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}
