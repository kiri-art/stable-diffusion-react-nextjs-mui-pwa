import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import hooks from "../hooks";
import "../../../src/hooks/providerFetch";
import ProviderFetchRequestBase, {
  ProviderFetchRequestObject,
} from "./ProviderFetchRequestBase";
import ProviderFetchRequestFromObject from "./ProviderFetchRequestFromObject";
import { updateFinishedStepFromResult } from ".";

export const runtime = "edge";

// Based on Example 2
// https://developer.mozilla.org/en-US/docs/Web/API/ReadableStreamDefaultReader/read
async function* streamLineIterator(body: ReadableStream) {
  const textDecoder = new TextDecoder("utf-8");
  const reader = body.getReader();

  let { value: chunk, done } = await reader.read();
  chunk = chunk ? textDecoder.decode(chunk, { stream: true }) : "";

  const re = /\r\n|\n|\r/gm;
  let startIndex = 0;

  for (;;) {
    const result = re.exec(chunk);
    if (!result) {
      if (done) {
        break;
      }
      const remainder = chunk.substr(startIndex);
      ({ value: chunk, done } = await reader.read());
      chunk =
        remainder + (chunk ? textDecoder.decode(chunk, { stream: true }) : "");
      startIndex = re.lastIndex = 0;
      continue;
    }
    yield chunk.substring(startIndex, result.index);
    startIndex = re.lastIndex;
  }
  if (startIndex < chunk.length) {
    // last line didn't end in a newline char
    yield chunk.substr(startIndex);
  }
}

class Watch {
  stream: ReadableStream;
  receivedFirstResult = false;
  events: Record<string, (data: Record<string, unknown>) => void> = {};

  constructor(body: ReadableStream) {
    this.stream = body;
  }

  on(event: string, callback: (data: Record<string, unknown>) => void) {
    this.events[event] = callback;
  }

  exec(event: string, data: Record<string, unknown>) {
    const callback = this.events[event];
    if (callback) callback(data);
  }

  async watch() {
    let json;
    for await (const text of streamLineIterator(this.stream)) {
      json = JSON.parse(text);
      if (json.modelOutputs) {
        const output = json.modelOutputs[0];
        if (output?.image_base64) output.image_base64 = "xxx";
      }
      // console.log(json);

      if (!this.receivedFirstResult) {
        this.receivedFirstResult = true;
        this.exec("firstResult", json);
      }
    }
    this.exec("finalResult", json);
  }
}

export default function createHandler(deps?: Record<string, unknown>) {
  return async function serverless(userRequest: NextRequest) {
    if (userRequest.method !== "POST")
      return new NextResponse(
        "Bad Request: Expected POST, not " + userRequest.method,
        { status: 400 }
      );

    const bodyText = await userRequest.text();
    const query = JSON.parse(bodyText);
    const type = query.type;
    if (type !== "start" && type != "check")
      return new NextResponse(
        `Bad Request: \`type\` should be "start" or "check", not "${type}"`,
        { status: 400 }
      );

    const providerRequest = ProviderFetchRequestFromObject(query.requestObject);

    if (providerRequest.apiInfo().startOnly)
      return new NextResponse("Bad Request: startOnly = true not implemented", {
        status: 400,
      });

    await providerRequest.checkInputs();

    const extraInfo = query.extraInfo;

    if (type === "start") {
      const preStartResult: Record<string, unknown> = await hooks.exec(
        "providerFetch.server.preStart",
        {
          request: providerRequest,
          extraInfo,
          deps,
          req: userRequest,
        }
      );

      const $response = preStartResult.$response as
        | undefined
        | Record<string, unknown>;
      if ($response)
        return new NextResponse($response.body as string, {
          status: $response.status as number,
          headers: $response.headers as undefined | Record<string, string>,
        });

      const $error = preStartResult.$error as
        | undefined
        | Record<string, unknown>;
      if ($error) return NextResponse.json($error);

      const $extra = preStartResult.$extra as
        | Record<string, unknown>
        | undefined;
      if ($extra) providerRequest.$extra = $extra;

      if (typeof preStartResult.queuePriority === "number")
        providerRequest.queuePriority = preStartResult.queuePriority;

      // try/catch?  handle non-200?
      // startResult: { statusCode: 413, code: 'FST_ERR_CTP_BODY_TOO_LARGE', error: 'Payload Too Large', message: 'Request body is too large' }
      /*
      const startResult = await providerRequest.fetchStart();

      */
      /// XX TODO startResult, need to stream it.

      const { url, payload } = providerRequest.prepareStart();

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
        cache: "no-store",
      });

      if (!response.body)
        return new NextResponse("Internal Error: no response body", {
          status: 500,
        });

      const [stream1, stream2] = response.body.tee();

      const watcher = new Watch(stream1);

      watcher.on(
        "firstResult",
        async (result: Partial<ProviderFetchRequestObject>) => {
          console.log("firstResult", result);
          if (result.callID) providerRequest.callID = result.callID;
          if (result.finished !== undefined)
            providerRequest.finished = result.finished;
          if (result.modelOutputs !== undefined)
            providerRequest.modelOutputs == result.modelOutputs;
          if (result.message !== undefined)
            providerRequest.message = result.message;

          await hooks.exec("providerFetch.server.postStart", {
            request: providerRequest,
            extraInfo,
            deps,
            preStartResult,
            startResult: result,
          });
        }
      );

      // Note, previously this was sent by the client, so we could measure network
      // transfer times too.  Should perhaps consider that again too.  TODO?
      watcher.on("finalResult", async (result: Record<string, unknown>) => {
        console.log("finalResult, result");
        await updateFinishedStepFromResult(
          result as unknown as ProviderFetchRequestBase
        );
      });

      watcher.watch();

      return new NextResponse(stream2, {
        headers: response.headers,
      });
    } else {
      return new NextResponse("Bad Request: CHECK not implemented yet", {
        status: 400,
      });
    }
  };
}
