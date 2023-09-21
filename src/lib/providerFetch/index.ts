/*
 * Isomorphic abstraction around various providers and browser/server.
 *
 * A single async call can be made on the browser to return the result.
 * Depending on the Provider API selected, this may involve transparently
 * passing the request to a serverless API to execute the request, and
 * start/check(status) requests, and user-defined hooks, in the interim.
 */

import "../../../src/hooks/providerFetch";
import ProviderFetchRequestFromObject from "./ProviderFetchRequestFromObject";

// TODO, make this all internal to providerFetch
async function updateFinishedStep(
  callID: string,
  timestampMs: number,
  value: Record<string, unknown>
) {
  await fetch("/api/bananaUpdate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      callID,
      step: {
        name: "finished",
        date: timestampMs,
        value: value,
      },
    }),
  });
}

export default async function providerFetch(
  providerId: string,
  modelId: string,
  inputs: Record<string, unknown>,
  callback?: (result: Record<string, unknown>) => void
) {
  const obj = { providerId, modelId, inputs };
  const request = ProviderFetchRequestFromObject(obj, true);
  // console.log(obj);
  // console.log(request);

  // TODO, dda specific... need to refactor
  // @ts-expect-error: TODO
  if (inputs.callInputs) inputs.callInputs.startRequestId = request.id;

  if (typeof window === "object") {
    if (request.apiInfo().oneshot) {
      let result;
      try {
        result = await request.fetchSingle(callback);
      } catch (error) {
        if (error instanceof Error) {
          return {
            message: "error",
            $error: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
          };
        } else {
          return {
            message: "error",
            error: JSON.stringify(error),
          };
        }
      }
      return {
        message: "success",
        modelOutputs: [result],
      };
    } else {
      const startResult = await request.browserStart(callback);
      if (!request.apiInfo().startOnly) return startResult;

      if (!startResult.callID || startResult.message) {
        return {
          message: startResult.message,
        };
      }
      // console.log(request);

      const result = await request.checkUntilResult(callback);
      console.log("providerFetch result", result);

      if (!request.apiInfo().checkViaServer) {
        const callID = result.callID;
        const now = Date.now(); // result.created * 1000
        if (result.modelOutputs?.length) {
          updateFinishedStep(callID, now, { $success: true });
        } else {
          updateFinishedStep(callID, now, {
            $error: {
              message: result.message,
              modelOutputs: result.modelOutputs,
            },
          });
        }
      }

      return result;
    }
  } else {
    // untested
    // const start = await request.fetchStart();
    // console.log(start);
    throw new Error("calling providerFetch from server not implemented yet");
  }
}
