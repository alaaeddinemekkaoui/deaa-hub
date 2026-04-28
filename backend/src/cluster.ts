import cluster from 'cluster';
import { cpus } from 'os';

const NUM_WORKERS = parseInt(process.env.WORKERS ?? '0', 10) || cpus().length;

if (cluster.isPrimary) {
  console.log(
    `[Cluster] Primary ${process.pid} — spawning ${NUM_WORKERS} workers`,
  );

  for (let i = 0; i < NUM_WORKERS; i++) {
    cluster.fork({ NODE_CLUSTER_WORKER: '1', WORKER_ID: String(i + 1) });
  }

  cluster.on('exit', (worker, code) => {
    if (code !== 0) {
      console.warn(
        `[Cluster] Worker ${worker.process.pid} died (code ${code}) — restarting`,
      );
      cluster.fork();
    }
  });
} else {
  // Each worker runs the full NestJS app
  void import('./main.js');
}
