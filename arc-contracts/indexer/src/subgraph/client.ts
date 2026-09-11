/** Minimal GraphQL POST helper for The Graph Studio / graph-node endpoints. */

export async function subgraphQuery<T>(
  endpoint: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {"content-type": "application/json"},
    body: JSON.stringify({query, variables}),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Subgraph HTTP ${res.status}: ${body.slice(0, 200) || res.statusText}`
    );
  }
  const json = (await res.json()) as {
    data?: T;
    errors?: Array<{message: string}>;
  };
  if (json.errors?.length) {
    throw new Error(
      `Subgraph GraphQL: ${json.errors.map((e) => e.message).join("; ")}`
    );
  }
  if (!json.data) {
    throw new Error("Subgraph GraphQL: empty data");
  }
  return json.data;
}
