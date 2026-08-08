import { type ChildProcess, spawn } from "node:child_process";
import { randomUUID } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

import { type Db, MongoClient } from "mongodb";

const TEST_DATABASE_PREFIX = "kiri_account_data_test_";
const TEST_DIRECTORY_PREFIX = "kiri-mongo-replica-set-";

export interface TestMongoReplicaSet {
  client: MongoClient;
  databaseName: string;
  db: Db;
  uri: string;
  stop: () => Promise<void>;
}

interface StartedMongod {
  dbPath: string;
  process: ChildProcess;
  recentOutput: () => string;
}

function wait(milliseconds: number) {
  return new Promise((resolvePromise) =>
    setTimeout(resolvePromise, milliseconds),
  );
}

async function availablePort() {
  return await new Promise<number>((resolvePromise, reject) => {
    const server = createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not allocate a MongoDB test port"));
        return;
      }

      server.close((error) => {
        if (error) reject(error);
        else resolvePromise(address.port);
      });
    });
  });
}

function captureOutput(process: ChildProcess) {
  const chunks: string[] = [];
  const append = (chunk: Buffer | string) => {
    chunks.push(chunk.toString());
    if (chunks.length > 100) chunks.splice(0, chunks.length - 100);
  };

  process.stdout?.on("data", append);
  process.stderr?.on("data", append);

  return () => chunks.join("").slice(-16_000);
}

async function startMongod({
  mongodPath,
  port,
  replicaSetName,
}: {
  mongodPath: string;
  port: number;
  replicaSetName: string;
}): Promise<StartedMongod> {
  const dbPath = await mkdtemp(join(tmpdir(), TEST_DIRECTORY_PREFIX));
  const process = spawn(
    mongodPath,
    [
      "--bind_ip",
      "127.0.0.1",
      "--dbpath",
      dbPath,
      "--nounixsocket",
      "--port",
      String(port),
      "--replSet",
      replicaSetName,
    ],
    { stdio: ["ignore", "pipe", "pipe"] },
  );

  return { dbPath, process, recentOutput: captureOutput(process) };
}

async function waitForMongod(
  uri: string,
  mongod: StartedMongod,
  timeoutMilliseconds: number,
) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastError: unknown;

  while (Date.now() < deadline) {
    if (mongod.process.exitCode !== null) {
      throw new Error(
        `mongod exited with code ${mongod.process.exitCode}\n${mongod.recentOutput()}`,
      );
    }

    const client = new MongoClient(uri, {
      connectTimeoutMS: 250,
      serverSelectionTimeoutMS: 250,
    });

    try {
      await client.connect();
      await client.db("admin").command({ ping: 1 });
      return client;
    } catch (error) {
      lastError = error;
      await client.close().catch(() => undefined);
      await wait(50);
    }
  }

  throw new Error(
    `mongod did not become available: ${String(lastError)}\n${mongod.recentOutput()}`,
  );
}

async function waitForPrimary(
  client: MongoClient,
  mongod: StartedMongod,
  timeoutMilliseconds: number,
) {
  const deadline = Date.now() + timeoutMilliseconds;
  let lastHello: Record<string, unknown> | undefined;

  while (Date.now() < deadline) {
    if (mongod.process.exitCode !== null) {
      throw new Error(
        `mongod exited before becoming primary with code ${mongod.process.exitCode}\n${mongod.recentOutput()}`,
      );
    }

    try {
      lastHello = await client.db("admin").command({ hello: 1 });
      if (lastHello.isWritablePrimary === true) return;
    } catch {
      // The server briefly rejects commands while the replica set initializes.
    }

    await wait(50);
  }

  throw new Error(
    `MongoDB replica set did not elect a primary: ${JSON.stringify(lastHello)}\n${mongod.recentOutput()}`,
  );
}

async function waitForExit(process: ChildProcess, timeoutMilliseconds: number) {
  if (process.exitCode !== null) return true;

  return await new Promise<boolean>((resolvePromise) => {
    const timeout = setTimeout(() => {
      process.off("exit", exited);
      resolvePromise(false);
    }, timeoutMilliseconds);
    const exited = () => {
      clearTimeout(timeout);
      resolvePromise(true);
    };

    process.once("exit", exited);
  });
}

async function stopMongod(mongod: StartedMongod) {
  if (mongod.process.exitCode === null) {
    mongod.process.kill("SIGTERM");
    if (!(await waitForExit(mongod.process, 5_000))) {
      mongod.process.kill("SIGKILL");
      await waitForExit(mongod.process, 5_000);
    }
  }

  const resolvedDbPath = resolve(mongod.dbPath);
  const expectedPrefix = resolve(tmpdir(), TEST_DIRECTORY_PREFIX);
  if (!resolvedDbPath.startsWith(expectedPrefix)) {
    throw new Error(
      `Refusing to remove unexpected MongoDB path: ${resolvedDbPath}`,
    );
  }

  await rm(resolvedDbPath, { force: true, recursive: true });
}

export async function startMongoReplicaSet({
  mongodPath = "mongod",
  startupTimeoutMilliseconds = 20_000,
}: {
  mongodPath?: string;
  startupTimeoutMilliseconds?: number;
} = {}): Promise<TestMongoReplicaSet> {
  const suffix = randomUUID().replaceAll("-", "");
  const databaseName = `${TEST_DATABASE_PREFIX}${suffix}`;
  const replicaSetName = `kiri_test_${suffix}`;
  const port = await availablePort();
  const directUri = `mongodb://127.0.0.1:${port}/?directConnection=true`;
  const uri = `mongodb://127.0.0.1:${port}/?replicaSet=${replicaSetName}`;
  const mongod = await startMongod({ mongodPath, port, replicaSetName });
  const startupDeadline = Date.now() + startupTimeoutMilliseconds;
  let bootstrapClient: MongoClient | undefined;
  let client: MongoClient | undefined;
  let stopped = false;

  const stop = async () => {
    if (stopped) return;
    stopped = true;

    if (client) {
      if (!databaseName.startsWith(TEST_DATABASE_PREFIX)) {
        throw new Error(
          `Refusing to drop unexpected MongoDB database: ${databaseName}`,
        );
      }
      await client
        .db(databaseName)
        .dropDatabase()
        .catch(() => undefined);
      await client.close().catch(() => undefined);
    }
    await bootstrapClient?.close().catch(() => undefined);
    await stopMongod(mongod);
  };

  try {
    bootstrapClient = await waitForMongod(
      directUri,
      mongod,
      Math.max(1, startupDeadline - Date.now()),
    );
    await bootstrapClient.db("admin").command({
      replSetInitiate: {
        _id: replicaSetName,
        members: [{ _id: 0, host: `127.0.0.1:${port}` }],
      },
    });
    await waitForPrimary(
      bootstrapClient,
      mongod,
      Math.max(1, startupDeadline - Date.now()),
    );
    await bootstrapClient.close();
    bootstrapClient = undefined;

    client = new MongoClient(uri, {
      retryReads: true,
      retryWrites: true,
      serverSelectionTimeoutMS: 5_000,
    });
    await client.connect();

    return {
      client,
      databaseName,
      db: client.db(databaseName),
      uri,
      stop,
    };
  } catch (error) {
    await stop();
    throw error;
  }
}
