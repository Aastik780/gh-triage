const API = 'https://api.github.com';
const API_VERSION = '2022-11-28';

export interface GhIssue {
  number: number;
  title: string;
  body: string | null;
  state: string;
  labels: string[];
  comments: number;
  createdAt: string;
}

export interface GhLabel {
  name: string;
  color: string;
  description: string | null;
}

export class GitHubClient {
  constructor(private readonly token: string) {}

  private async request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const res = await fetch(`${API}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': API_VERSION,
        'User-Agent': 'gh-triage',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers ?? {}),
      },
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error(`GitHub API ${init.method ?? 'GET'} ${path} → ${res.status} ${text.slice(0, 300)}`);
    }

    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  }

  async listIssues(repo: string, state: 'open' | 'closed' | 'all', limit: number): Promise<GhIssue[]> {
    const out: GhIssue[] = [];
    for (let page = 1; page <= 3 && out.length < limit; page++) {
      const batch = await this.request<Array<Record<string, any>>>(
        `/repos/${repo}/issues?state=${state}&per_page=100&page=${page}&sort=created&direction=desc`,
      );
      // The issues endpoint also returns pull requests — skip them.
      const issues = batch.filter((it) => !it.pull_request);
      for (const it of issues) {
        if (out.length >= limit) break;
        out.push({
          number: it.number,
          title: it.title ?? '',
          body: it.body ?? '',
          state: it.state,
          labels: (it.labels ?? []).map((l: any) => (typeof l === 'string' ? l : l.name)).filter(Boolean),
          comments: it.comments ?? 0,
          createdAt: it.created_at ?? '',
        });
      }
      if (batch.length < 100) break;
    }
    return out;
  }

  async ensureLabel(repo: string, def: GhLabel): Promise<void> {
    try {
      await this.request(`/repos/${repo}/labels/${encodeURIComponent(def.name)}`);
    } catch {
      await this.request(`/repos/${repo}/labels`, {
        method: 'POST',
        body: JSON.stringify({ name: def.name, color: def.color, description: def.description }),
      });
    }
  }

  async addLabels(repo: string, issueNumber: number, labels: string[]): Promise<void> {
    await this.request(`/repos/${repo}/issues/${issueNumber}/labels`, {
      method: 'POST',
      body: JSON.stringify({ labels }),
    });
  }

  async postComment(repo: string, issueNumber: number, body: string): Promise<void> {
    await this.request(`/repos/${repo}/issues/${issueNumber}/comments`, {
      method: 'POST',
      body: JSON.stringify({ body }),
    });
  }
}
