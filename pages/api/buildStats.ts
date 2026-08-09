// import * as banana from "@banana-dev/banana-dev";

import { addDays, endOfDay, startOfDay } from "date-fns";
import type { Collection, Document } from "mongodb";
import type { NextApiRequest, NextApiResponse } from "next";

import gs from "../../src/api-lib/db-full";

const db = gs.dba;
const REQUESTS_BY_USER_CUTOFF = 10;

type DayWindow = {
  date: Date;
  dayStart: Date;
  dayEnd: Date;
};

type DailyCount = {
  dayIndex: number;
  total: number;
};

type DailyModelCount = {
  dayIndex: number;
  model: unknown;
  requests: number;
};

type RequestsByUser = {
  userId: unknown;
  requests: number;
};

type DailyRequestsByUser = RequestsByUser & {
  dayIndex: number;
};

type DailyStats = {
  date: Date;
  newUsers: number;
  totalUsers: number;
  newRequests: number;
  totalRequests: number;
  requestsByModel: Array<{ model: unknown; requests: number }>;
  requestsByUser: RequestsByUser[];
  __updatedAt: number;
};

type PreviousDailyStats = Partial<
  Pick<DailyStats, "totalUsers" | "totalRequests" | "requestsByModel">
>;

type HourlyAgg = {
  _id: {
    year: number;
    month: number;
    day: number;
    hour: number;
  };
  total: number;
};

function buildDayWindows() {
  const windows: DayWindow[] = [];
  const now = new Date();

  for (
    let date = addDays(new Date().setHours(0, 0, 0, 0), -1);
    date <= now;
    date = addDays(date, 1)
  ) {
    const dayStart = startOfDay(date);
    windows.push({
      date: dayStart,
      dayStart,
      dayEnd: endOfDay(date),
    });
  }

  return windows;
}

function firstDayStart(windows: DayWindow[]) {
  return windows[0].dayStart;
}

function lastDayEnd(windows: DayWindow[]) {
  return windows[windows.length - 1].dayEnd;
}

function dateRangeMatch(fieldName: string, windows: DayWindow[]) {
  return {
    [fieldName]: {
      $gt: firstDayStart(windows),
      $lt: lastDayEnd(windows),
    },
  };
}

function dayIndexExpression(fieldPath: string, windows: DayWindow[]) {
  return {
    $switch: {
      branches: windows.map((window, index) => ({
        case: {
          $and: [
            { $gt: [fieldPath, window.dayStart] },
            { $lt: [fieldPath, window.dayEnd] },
          ],
        },
        then: index,
      })),
      default: null,
    },
  };
}

function modelKey(model: unknown) {
  return JSON.stringify(model ?? "unknown");
}

function addKnownModel(knownModels: Map<string, unknown>, model: unknown) {
  const normalizedModel = model ?? "unknown";
  knownModels.set(modelKey(normalizedModel), normalizedModel);
}

async function countByDay(
  collection: Collection<Document>,
  fieldName: string,
  windows: DayWindow[],
) {
  const docs = await collection
    .aggregate<DailyCount>([
      { $match: dateRangeMatch(fieldName, windows) },
      {
        $project: {
          dayIndex: dayIndexExpression(`$${fieldName}`, windows),
        },
      },
      { $match: { dayIndex: { $gte: 0 } } },
      { $group: { _id: "$dayIndex", total: { $sum: 1 } } },
      { $project: { _id: 0, dayIndex: "$_id", total: 1 } },
    ])
    .toArray();

  return new Map(docs.map((doc) => [doc.dayIndex, doc.total]));
}

async function requestsByModelByDay(
  requests: Collection<Document>,
  windows: DayWindow[],
) {
  const knownModels = new Map<string, unknown>();
  const byDay = new Map<number, Map<string, number>>();
  const docs = await requests
    .aggregate<DailyModelCount>([
      { $match: dateRangeMatch("createdAt", windows) },
      {
        $project: {
          dayIndex: dayIndexExpression("$createdAt", windows),
          model: "$callInputs.MODEL_ID",
        },
      },
      { $match: { dayIndex: { $gte: 0 } } },
      {
        $group: {
          _id: { dayIndex: "$dayIndex", model: "$model" },
          requests: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          dayIndex: "$_id.dayIndex",
          model: "$_id.model",
          requests: 1,
        },
      },
      { $sort: { dayIndex: 1, requests: -1 } },
    ])
    .toArray();

  for (const doc of docs) {
    const dayIndex = Number(doc.dayIndex);
    const key = modelKey(doc.model);
    const dayModels = byDay.get(dayIndex) || new Map<string, number>();

    addKnownModel(knownModels, doc.model);
    dayModels.set(key, doc.requests);
    byDay.set(dayIndex, dayModels);
  }

  return { byDay, knownModels };
}

async function requestsByUserByDay(
  userRequests: Collection<Document>,
  windows: DayWindow[],
) {
  const byDay = new Map<number, RequestsByUser[]>();
  const docs = await userRequests
    .aggregate<DailyRequestsByUser>([
      { $match: dateRangeMatch("date", windows) },
      {
        $project: {
          dayIndex: dayIndexExpression("$date", windows),
          userId: 1,
        },
      },
      { $match: { dayIndex: { $gte: 0 } } },
      {
        $group: {
          _id: { dayIndex: "$dayIndex", userId: "$userId" },
          requests: {
            $sum: {
              $cond: [{ $isNumber: "$requests" }, "$requests", 1],
            },
          },
        },
      },
      {
        $project: {
          _id: 0,
          dayIndex: "$_id.dayIndex",
          userId: "$_id.userId",
          requests: 1,
        },
      },
      { $sort: { dayIndex: 1, requests: -1 } },
    ])
    .toArray();

  for (const doc of docs) {
    const dayIndex = Number(doc.dayIndex);
    const users = byDay.get(dayIndex) || [];

    users.push({ userId: doc.userId, requests: doc.requests });
    byDay.set(dayIndex, users);
  }

  return byDay;
}

function cutoffRequestsByUser(requestsByUser: RequestsByUser[]) {
  if (requestsByUser.length <= REQUESTS_BY_USER_CUTOFF) return requestsByUser;

  const requestByUserCutoff = requestsByUser.slice(0, REQUESTS_BY_USER_CUTOFF);
  const other = { requests: 0, userId: "other" };

  for (const entry of requestsByUser.slice(REQUESTS_BY_USER_CUTOFF)) {
    other.requests += entry.requests;
  }

  requestByUserCutoff.push(other);
  return requestByUserCutoff;
}

function knownModelsFromPreviousStats(
  knownModels: Map<string, unknown>,
  previousStats: PreviousDailyStats | undefined,
) {
  for (const entry of previousStats?.requestsByModel || []) {
    addKnownModel(knownModels, entry.model);
  }
}

function requestsByModelForDay(
  knownModels: Map<string, unknown>,
  dailyModelCounts: Map<string, number> | undefined,
) {
  return Array.from(knownModels.entries())
    .sort(([, left], [, right]) => String(left).localeCompare(String(right)))
    .map(([key, model]) => ({
      model,
      requests: dailyModelCounts?.get(key) || 0,
    }));
}

async function computeHourlyStats({
  requests,
  statsHourly,
  windows,
}: {
  requests: Collection<Document>;
  statsHourly: Collection<Document>;
  windows: DayWindow[];
}) {
  const hourlyStats = (
    await requests
      .aggregate<HourlyAgg>([
        { $match: dateRangeMatch("createdAt", windows) },
        {
          $project: {
            year: { $year: "$createdAt" },
            month: { $month: "$createdAt" },
            day: { $dayOfMonth: "$createdAt" },
            hour: { $hour: "$createdAt" },
          },
        },
        {
          $group: {
            _id: { year: "$year", month: "$month", day: "$day", hour: "$hour" },
            total: { $sum: 1 },
          },
        },
      ])
      .toArray()
  ).map((doc) => {
    const { year, month, day, hour } = doc._id;
    return {
      date: new Date(Date.UTC(year, month - 1, day, hour)),
      total: doc.total,
      __updatedAt: Date.now(),
    };
  });

  if (!hourlyStats.length) return;

  await statsHourly.bulkWrite(
    hourlyStats.map((hourlyStats) => ({
      replaceOne: {
        filter: { date: hourlyStats.date },
        replacement: hourlyStats,
        upsert: true,
      },
    })),
  );
}

export default async function buildStats(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  // const day = req.query.day;
  // if (typeof day !== "string") return res.status(500).end("Invalid 'date' arg");

  const windows = buildDayWindows();

  if (!db) return res.status(500).end();

  const [users, requests, userRequests, statsDaily, statsHourly] =
    await Promise.all([
      db.collection("users").getReal(),
      db.collection("bananaRequests").getReal(),
      db.collection("userRequests").getReal(),
      db.collection("statsDaily").getReal(),
      db.collection("statsHourly").getReal(),
    ]);

  const previousDailyStats = (
    await statsDaily
      .find({ date: { $lt: firstDayStart(windows) } })
      .sort({ date: -1 })
      .limit(1)
      .toArray()
  )[0] as PreviousDailyStats | undefined;

  const [newUsersByDay, newRequestsByDay, modelCounts, dailyRequestsByUser] =
    await Promise.all([
      countByDay(users, "createdAt", windows),
      countByDay(requests, "createdAt", windows),
      requestsByModelByDay(requests, windows),
      requestsByUserByDay(userRequests, windows),
    ]);

  knownModelsFromPreviousStats(modelCounts.knownModels, previousDailyStats);

  let [totalUsers, totalRequests] =
    previousDailyStats?.totalUsers !== undefined &&
    previousDailyStats.totalRequests !== undefined
      ? [previousDailyStats.totalUsers, previousDailyStats.totalRequests]
      : await Promise.all([
          users.countDocuments({ createdAt: { $lt: firstDayStart(windows) } }),
          requests.countDocuments({
            createdAt: { $lt: firstDayStart(windows) },
          }),
        ]);

  const updatedAt = Date.now();
  const dailyStats: DailyStats[] = windows.map((window, dayIndex) => {
    const newUsers = newUsersByDay.get(dayIndex) || 0;
    const newRequests = newRequestsByDay.get(dayIndex) || 0;

    totalUsers += newUsers;
    totalRequests += newRequests;

    return {
      date: window.date,
      newUsers,
      totalUsers,
      newRequests,
      totalRequests,
      requestsByModel: requestsByModelForDay(
        modelCounts.knownModels,
        modelCounts.byDay.get(dayIndex),
      ),
      requestsByUser: cutoffRequestsByUser(
        dailyRequestsByUser.get(dayIndex) || [],
      ),
      __updatedAt: updatedAt,
    };
  });

  if (dailyStats.length) {
    await statsDaily.bulkWrite(
      dailyStats.map((dayStats) => ({
        replaceOne: {
          filter: { date: dayStats.date },
          replacement: dayStats,
          upsert: true,
        },
      })),
    );
  }

  await computeHourlyStats({ requests, statsHourly, windows });

  res.status(200).end("OK");
}
