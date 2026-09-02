-- supabase/seed.sql
-- Seed initial curated learning resources for RAG retrieval

INSERT INTO public.learning_resources (topic, title, content, url, resource_type) VALUES
('Data Structures & Algorithms', 'Dynamic Programming Patterns', 'Mastering memoization, tabulation, state transitions for knapsack, LCS, and LIS problems.', 'https://leetcode.com/discuss/general-discussion/458695/dynamic-programming-patterns', 'article'),
('System Design', 'System Design Primer', 'An organized collection of system design topics including scalability, microservices, caching with Redis, message queues like Kafka, and database sharding.', 'https://github.com/donnemartin/system-design-primer', 'course'),
('React & Next.js', 'Next.js App Router & Server Components', 'Deep dive into React Server Components, server actions, caching semantics, suspense streaming, and edge runtimes in Next.js 14.', 'https://nextjs.org/docs/app', 'documentation'),
('TypeScript', 'Advanced TypeScript Types & Utility Patterns', 'Generics, conditional types, mapped types, template literal types, and type narrowing in production code.', 'https://www.typescriptlang.org/docs/handbook/2/types-from-types.html', 'documentation'),
('Node.js & Backend', 'Node.js Event Loop & Concurrency', 'Understanding libuv, the microtask queue, thread pool, async I/O, and CPU-intensive offloading.', 'https://nodejs.org/en/docs/guides/event-loop-timers-and-nexttick', 'article'),
('PostgreSQL & Databases', 'PostgreSQL Indexing & Query Optimization', 'B-Tree, GIN, GiST, HNSW vector indexes, EXPLAIN ANALYZE, query planner optimization, and connection pooling.', 'https://www.postgresql.org/docs/current/indexes.html', 'documentation'),
('Cloud & DevOps', 'Docker & Kubernetes Fundamentals', 'Containerization, multi-stage Docker builds, pod orchestration, services, ingress, and configmaps.', 'https://kubernetes.io/docs/concepts/', 'documentation'),
('Python', 'Python Concurrency with Asyncio & Multiprocessing', 'Coroutines, event loops, GIL workarounds, tasks, and asynchronous networking.', 'https://docs.python.org/3/library/asyncio.html', 'documentation');
