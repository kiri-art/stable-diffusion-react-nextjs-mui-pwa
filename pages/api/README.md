# api

Our (CPU) serverless funcs (nextjs backend).

- "exec" files spawn a local process.
  Uses `node` APIs.
- "fetch" files operate excluslively through HTTP Fetch.
  No node APIs, can run in e.g. V8 edge environment.

Important that these files are separate and not in the same important chain.
