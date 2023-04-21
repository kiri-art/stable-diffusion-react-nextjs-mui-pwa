import hooks from "../../src/lib/hooks";
import { db } from "gongo-client-react";
import { BananaRequest } from "../schemas";

hooks.register("providerFetch.browser.extraInfoToSend");
hooks.register("providerFetch.server.preStart");
hooks.register("providerFetch.server.postStart");

hooks.on("providerFetch.browser.extraInfoToSend", (data, result) => {
  // @ts-expect-error: TODO
  result.auth = db.auth.authInfoToSend();
});

hooks.on("providerFetch.server.preStart", async (data, hookResult) => {
  console.log("providerFetch.server.preStart", data, hookResult);
  console.log({ data });
  // @ts-expect-error: TODO
  const { request, extraInfo, deps } = data;
  const { gs, Auth } = deps;

  // docker-diffusers-api specific
  const callInputs = request.inputs.callInputs || {};
  const modelInputs = request.inputs.modelInputs || {};

  const res = {
    status(code: number) {
      if (!hookResult.$response) hookResult.$response = {};
      // @ts-expect-error: TODO
      hookResult.$response.status = code;
      return this;
    },
    send(body: string) {
      if (!hookResult.$response) hookResult.$response = {};
      // @ts-expect-error: TODO
      hookResult.$response.body = body;
      return this;
    },
    end(body: string) {
      if (!hookResult.$response) hookResult.$response = {};
      // @ts-expect-error: TODO
      hookResult.$response.body = body;
      return this;
    },
  };

  // --- LOAD USER --- //

  const auth = new Auth(gs.dba, extraInfo.auth);
  console.log({ sessionData: await auth.getSessionData() });
  const userId = await auth.userId();
  console.log({ userId });

  if (!userId) return res.status(403).end("Forbidden, no userId");

  const user = await gs.dba.collection("users").findOne({ _id: userId });
  if (!user) return res.status(500).end("Server error");

  // --- CHECK AND MODIFY CREDITS --- //

  const chargedCredits = { credits: 0, paid: false };

  let CREDIT_COST = 1;
  if (request.inputs.callInputs.PROVIDER_ID === 2) CREDIT_COST = 0.25;
  if (request.model.id === "upsample") CREDIT_COST = 0.2;

  if (!(user.credits.free >= CREDIT_COST || user.credits.paid >= CREDIT_COST))
    return res.status(403).send("Out of credits");

  if (user.credits.free >= CREDIT_COST) {
    user.credits.free -= CREDIT_COST;
    chargedCredits.credits = CREDIT_COST;
    await gs.dba
      .collection("users")
      .updateOne({ _id: userId }, { $inc: { "credits.free": -CREDIT_COST } });
  } else {
    user.credits.paid -= CREDIT_COST;
    chargedCredits.credits = CREDIT_COST;
    chargedCredits.paid = true;
    await gs.dba
      .collection("users")
      .updateOne({ _id: userId }, { $inc: { "credits.paid": -CREDIT_COST } });
  }

  // --- SAVE REQUESTS --- //

  const userRequest = {
    userId,
    date: new Date(),
    ...chargedCredits,
    callInputs,
    modelInputs: {
      ...modelInputs,
    },
    ...chargedCredits,
  };
  delete userRequest.modelInputs.prompt;
  delete userRequest.modelInputs.negative_prompt;
  delete userRequest.modelInputs.image;
  delete userRequest.modelInputs.mask_image;
  delete userRequest.modelInputs.init_image;
  await gs.dba.collection("userRequests").insertOne(userRequest);

  hookResult.credits = user.credits;
  hookResult.chargedCredits = chargedCredits;
});

hooks.on("providerFetch.server.postStart", async (data, hookResult) => {
  console.log("providerFetch.server.postStart", data, hookResult);
  console.log({ data });
  // @ts-expect-error: TODO
  const { request, /* extraInfo, */ deps, preStartResult, startResult } = data;
  const { gs } = deps;

  const bananaRequest: BananaRequest = {
    // bananaId: result.id,
    modelKey: "TODO modelKey",
    callID: request.callID,
    startRequestId: request.id,
    createdAt: new Date(),
    apiVersion: startResult.apiVersion,
    message: startResult.message,
    finished: startResult.finished,
    modelInputs: request.inputs.modelInputs,
    callInputs: request.inputs.callInputs,
    steps: {},
    ...preStartResult.chargedCredits,
  };

  if (gs && gs.dba)
    await gs.dba.collection("bananaRequests").insertOne(bananaRequest);
});
