import { ProviderFetchServerless } from "../../src/lib/providerFetch";

const serverless = new ProviderFetchServerless();

const express = serverless.express();

export default express;
