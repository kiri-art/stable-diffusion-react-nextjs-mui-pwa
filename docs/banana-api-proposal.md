# Banana streaming status proposal

## Rationale

Requests can take a long time and it would be nice to know what's going on and create a good UX around it.

## Proposal

Instead of a single long-poll request, we can use chunked transfer encoding to send multiple JSON objects back until the request finishes. I can think of two good sources:

From **Banana.Dev Infrastructure** giving status to run container:

```js
{ $banana: "COLD_START", timestamp: 1662900847 }
{ $banana: "WARM_START", 1662900942 }
{ $banana: "QUEUED", position: 1, timestamp, 1662900242 }
```

From **our containers** giving status on the inference:

```python
// Server
def init(sendStatus):
  sendStatus({ $model: "INIT", timestamp: 1662900847 });

def inference(model_inputs:dict, sendStatus) -> dict:
  # ...
  sendStatus({ $model: "PROGRESS", progress: 0.8, timestamp: 1662900847 })
  # ...
```

## Client library

Could remain the same without a breaking API change. The existence of an extra `statusCallback` argument could opt into status updates from the server.

```js
// Client
function statusCallback(status) {}
const out = await banana.run(apiKey, modelKey, modelOpts, statusCallback);
```
