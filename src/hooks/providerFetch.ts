import hooks from "../../src/lib/hooks";
import { db } from "gongo-client-react";
import { BananaRequest } from "../schemas";
// import { ipPass, ipFromReq } from "../api-lib/ipCheck";
import ProviderFetchRequestBase from "../lib/providerFetch/ProviderFetchRequestBase";
import calculateCredits from "../calculateCredits";

hooks.register("providerFetch.browser.extraInfoToSend");
hooks.register("providerFetch.server.preStart");
hooks.register("providerFetch.server.postStart");
hooks.register("providerFetch.browser.postStart");

hooks.on("providerFetch.browser.extraInfoToSend", () => {
  return { auth: db.auth?.authInfoToSend() };
});

hooks.on("providerFetch.server.preStart", async (data) => {
  // console.log("providerFetch.server.preStart", data, hookResult);
  // @ts-expect-error: TODO
  const { extraInfo, deps, req } = data;
  // @ts-expect-error: TODO
  const { request }: { request: ProviderFetchRequestBase } = data;
  const { gs, Auth } = deps;

  // docker-diffusers-api specific
  const callInputs =
    (request.inputs.callInputs as Record<string, unknown>) || {};
  const modelInputs =
    (request.inputs.modelInputs as Record<string, unknown>) || {};

  const result: Record<string, unknown> = {};

  const res = {
    status(code: number) {
      if (!result.$response) result.$response = {};
      // @ts-expect-error: TODO
      result.$response.status = code;
      return this;
    },
    send(body: string) {
      if (!result.$response) result.$response = {};
      // @ts-expect-error: TODO
      result.$response.body = body;
      return this;
    },
    end(body: string) {
      if (!result.$response) result.$response = {};
      // @ts-expect-error: TODO
      result.$response.body = body;
      // return this;
      return result;
    },
  };

  // --- LOAD USER --- //

  const cookie = req.headers.get
    ? req.headers.get("cookie")
    : req.headers.cookie;
  const nextAuthSessionToken = (function () {
    // next-auth.session-token=45df020e-1424-4d13-8bd5-5bd59851c774
    const match = cookie && cookie.match(/\bnext-auth\.session-token=([^;]+)/);
    return match && match[1];
  })();
  extraInfo.auth.nextAuthSessionToken = nextAuthSessionToken;

  const auth = new Auth(gs.dba, extraInfo.auth);
  // console.log({ sessionData: await auth.getSessionData() });
  const userId = await auth.userId();
  // console.log({ userId });

  if (!userId) return res.status(403).end("Forbidden, no userId");

  const user = await gs.dba.collection("users").findOne({ _id: userId });
  if (!user) return res.status(500).end("Server error");

  // --- TEMPORARY BAN --- //

  /*
  if (
    request.model.id === "upsample" &&
    user.createdAt > new Date("2023-07-16")
  )
    return res
      .status(403)
      .end(
        "Forbidden; all accounts created after 2023-07-16 are temporarily banned from using the API."
      );
  */

  /*
  if (
    process.env.NODE_ENV === "production" &&
    !(await ipPass(ipFromReq(req)))
  ) {
    res.status(403).end("Forbidden; IP not allowed");
    return;
  }
  */

  // --- CHECK AND MODIFY CREDITS --- //

  const chargedCredits = { credits: 0, paid: false };

  const CREDIT_COST = calculateCredits(callInputs, modelInputs);

  if (!(user.credits.free >= CREDIT_COST || user.credits.paid >= CREDIT_COST))
    return res.status(403).send("Out of credits");

  if (user.credits.free >= CREDIT_COST) {
    user.credits.free -= CREDIT_COST;
    chargedCredits.credits = CREDIT_COST;
    await gs.dba
      .collection("users")
      .updateOne({ _id: userId }, { $inc: { "credits.free": -CREDIT_COST } });
    // Higher priority if they have a good paid credit balance (if if using free)
    result.queuePriority = user.credits.paid > 5 ? 1 : 2;
  } else {
    user.credits.paid -= CREDIT_COST;
    chargedCredits.credits = CREDIT_COST;
    chargedCredits.paid = true;
    await gs.dba
      .collection("users")
      .updateOne({ _id: userId }, { $inc: { "credits.paid": -CREDIT_COST } });
    result.queuePriority = 0;
  }

  // --- SAVE REQUESTS --- //

  const userModelInputs = { ...modelInputs };

  for (const key of [
    "prompt",
    "negative_prompt",
    "image",
    "init_image",
    "input_image",
    "mask_image",
  ])
    if (userModelInputs[key]) userModelInputs[key] = "[redacted]";

  const userRequest = {
    userId,
    date: new Date(),
    ...chargedCredits,
    callInputs,
    modelInputs: userModelInputs,
    ...chargedCredits,
  };

  await gs.dba.collection("userRequests").insertOne(userRequest);

  result.$extra = {
    credits: user.credits,
    chargedCredits: chargedCredits,
  };

  return result;
});

hooks.on("providerFetch.server.postStart", async (data) => {
  // console.log("providerFetch.server.postStart", data, hookResult);
  // @ts-expect-error: TODO
  const { request, /* extraInfo, */ deps, preStartResult, startResult } = data;
  const { gs } = deps;

  const requestModelInputs = { ...request.inputs.modelInputs };
  for (const key of [
    // UserRequests don't contain "prompt" or "negative_prompt", but BananaRequests do.
    // BananaRequests don't store userId, UserRequests do.
    "image",
    "init_image",
    "input_image",
    "mask_image",
  ])
    if (requestModelInputs[key]) requestModelInputs[key] = "[truncated]";

  const bananaRequest: BananaRequest = {
    // bananaId: result.id,
    modelKey: "TODO modelKey",
    callID: request.callID,
    startRequestId: request.id,
    createdAt: new Date(),
    apiVersion: startResult.apiVersion,
    message: startResult.message,
    finished: startResult.finished,
    modelInputs: requestModelInputs,
    callInputs: request.inputs.callInputs,
    steps: {},
    ...preStartResult.chargedCredits,
  };

  if (gs && gs.dba)
    await gs.dba.collection("bananaRequests").insertOne(bananaRequest);
});

hooks.on("providerFetch.browser.postStart", async (data) => {
  // console.log("providerFetch.browser.postStart", data);
  if (typeof data === "object") {
    // @ts-expect-error: TODO
    const { request } = data;
    const existing = db.collection("users").findOne({ _id: db?.auth?.userId });
    if (existing)
      db.collection("users")._update(db?.auth?.userId, {
        ...existing,
        credits: request.$extra.credits,
      });
  }
});
