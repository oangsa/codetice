# Deployment Sizing Notes

- Treat this app as a web service plus a background grading system, not a static or serverless-only Next.js deployment.
- Call out Docker as a hard runtime dependency for grading.
- For sizing, separate web load from grading load; grading dominates CPU and memory.
- Be explicit when throughput limits are architectural rather than purely hardware-related.
- For this repo, note that worker parallelism is the next bottleneck before recommending aggressive horizontal scaling.
