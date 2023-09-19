import { NextApiRequest, NextApiResponse } from "next";

import hooks from "../hooks";
import "../../../src/hooks/providerFetch";
import ProviderFetchRequestFromObject from "./ProviderFetchRequestFromObject";

export default function createHandler(deps?: Record<string, unknown>) {
  return async function serverless(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== "POST")
      return res
        .status(400)
        .end("Bad Request: Expected POST, not " + req.method);

    const type = req.body.type;
    if (type !== "start" && type != "check")
      return res
        .status(400)
        .end(
          `Bad Request: \`type\` should be "start" or "check", not "${type}"`
        );

    const request = ProviderFetchRequestFromObject(req.body.requestObject);

    await request.checkInputs();

    const extraInfo = req.body.extraInfo;
    // console.log("req.body", req.body);
    // console.log("request", request);

    if (type === "start") {
      const preStartResult: Record<string, unknown> = await hooks.exec(
        "providerFetch.server.preStart",
        {
          request,
          extraInfo,
          deps,
          req,
        }
      );

      const $response = preStartResult.$response as
        | undefined
        | Record<string, unknown>;
      if ($response)
        return res.status($response.status as number).end($response.body);

      const $error = preStartResult.$error as
        | undefined
        | Record<string, unknown>;
      if ($error) return res.status(200).end({ $error });

      const $extra = preStartResult.$extra as
        | Record<string, unknown>
        | undefined;
      if ($extra) request.$extra = $extra;

      if (typeof preStartResult.queuePriority === "number")
        request.queuePriority = preStartResult.queuePriority;

      // try/catch?  handle non-200?
      // startResult: { statusCode: 413, code: 'FST_ERR_CTP_BODY_TOO_LARGE', error: 'Payload Too Large', message: 'Request body is too large' }
      const startResult = await request.fetchStart();

      await hooks.exec("providerFetch.server.postStart", {
        request,
        extraInfo,
        deps,
        preStartResult,
        startResult,
      });

      return res.status(200).end(JSON.stringify(request.toObject()));
    } else {
      return res.status(400).end("Bad Request: CHECK not implemented yet");
    }
  };
}
