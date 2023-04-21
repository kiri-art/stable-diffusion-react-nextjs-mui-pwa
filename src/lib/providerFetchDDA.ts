import providerFetch from "./providerFetch";

/*
 * ddaFetch - wrapper over providerFetch for docker-diffusers-api specifics
 *
 *   1) Adjust model name for server/serverless
 *   2) Handle types and validation
 */

export default function providerFetchDDA(providerId: string) {
  throw new Error("not implemented yet");
}
