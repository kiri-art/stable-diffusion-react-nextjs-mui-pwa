export default function bananaUrl(provider_id: 1 | 2) {
  if (provider_id === 1) return "https://api.banana.dev";
  if (provider_id === 2) return "https://api.kiri.art/api";
  return "UNKNOWN PROVIDER " + provider_id;
}
