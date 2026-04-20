interface VercelProject {
  latestDeployments?: Array<{ url?: string }>;
  domains?: string[];
}

interface VercelProjectsResponse {
  projects?: VercelProject[];
}

export async function fetchVercelProjectUrls(token?: string): Promise<string[]> {
  const apiToken = token || process.env.VERCEL_API_TOKEN;
  if (!apiToken) {
    throw new Error("Vercel token missing. Set VERCEL_API_TOKEN or provide one in the dashboard.");
  }

  const response = await fetch("https://api.vercel.com/v9/projects?limit=100", {
    headers: {
      Authorization: `Bearer ${apiToken}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Vercel API error: ${response.status} ${response.statusText}`);
  }

  const data = (await response.json()) as VercelProjectsResponse;
  const output = new Set<string>();

  for (const project of data.projects ?? []) {
    for (const domain of project.domains ?? []) {
      output.add(normalizeHttps(domain));
    }

    for (const deployment of project.latestDeployments ?? []) {
      if (deployment.url) {
        output.add(normalizeHttps(deployment.url));
      }
    }
  }

  return [...output];
}

function normalizeHttps(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    return value;
  }

  return `https://${value}`;
}
