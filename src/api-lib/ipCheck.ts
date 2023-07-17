import IPData from "ipdata";
import { NextApiRequest } from "next";

let ipdata: IPData | null = null;
if (typeof window !== "object") {
  if (!process.env.IPDATA_API_KEY)
    throw new Error("IPDATA_API_KEY not set in env");

  ipdata = new IPData(process.env.IPDATA_API_KEY);
}

// taken from gongo;
// TODO: export a method like this from gongo-server, that accepts x-fw number.
function ipFromReq(req: NextApiRequest) {
  let ip;
  if (req.headers["x-forwarded-for"]) {
    if (typeof req.headers["x-forwarded-for"] === "string")
      ip = req.headers["x-forwarded-for"].split(",")[0].trim();
    else ip = req.headers["x-forwarded-for"][0];
  } else {
    ip = (req.socket || req.connection)?.remoteAddress;
  }
  if (!ip)
    throw new Error("Could not get IP from req.{headers,socket,connection}");
  return ip;
}

async function ipPass(ip: string) {
  if (!ipdata) return false;
  const data = await ipdata.lookup(ip);
  console.log(data.threat);
  // < 40 high risk, 40-60 medium, > 60 low
  // @ts-expect-error: does exist
  return data.threat.scores.trust_score > 60;
}

export { ipFromReq, ipPass };
