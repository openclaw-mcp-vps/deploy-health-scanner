interface NetlifySite {
  url?: string;
  ssl_url?: string;
}

export async function fetchNetlifySiteUrls(token?: string): Promise<string[]> {
  const apiToken = token || process.env.NETLIFY_API_TOKEN;
  if (!apiToken) {
    throw new Error("Netlify token missing. Set NETLIFY_API_TOKEN or provide one in the dashboard.");
  }

  const response = await fetch("https://api.netlify.com/api/v1/sites", {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Netlify API error: ${response.status} ${response.statusText}`);
  }

  const sites = (await response.json()) as NetlifySite[];
  const output = new Set<string>();

  for (const site of sites) {
    const preferred = site.ssl_url || site.url;
    if (!preferred) {
      continue;
    }
    output.add(preferred);
  }

  return [...output];
}
