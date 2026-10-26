export function createApiMetrics() {
  const state = { requests: 0, errors: 0, totalDurationMs: 0 };

  return {
    middleware(req, res, next) {
      const start = process.hrtime.bigint();
      res.once('finish', () => {
        state.requests += 1;
        if (res.statusCode >= 500) state.errors += 1;
        state.totalDurationMs += Number(process.hrtime.bigint() - start) / 1_000_000;
      });
      next();
    },
    snapshot() {
      return {
        requests: state.requests,
        serverErrors: state.errors,
        averageRequestDurationMs: state.requests
          ? Number((state.totalDurationMs / state.requests).toFixed(2))
          : 0,
        uptimeSeconds: Math.floor(process.uptime()),
        memoryUsageBytes: process.memoryUsage().heapUsed,
      };
    },
  };
}
