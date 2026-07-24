interface GitHubUser {
  public_repos: number;
  public_gists: number;
  followers: number;
  following: number;
}

interface ContributionDay {
  date: string;
  count: number;
  level: 0 | 1 | 2 | 3 | 4;
}

interface GitHubContribution {
  total: {
    [year: string]: number;
  };
  contributions: ContributionDay[];
}

interface RepoData {
  stargazers_count: number;
}

const GITHUB_USERNAME = 'hacxy';

export async function fetchGitHubStats(): Promise<{ stars: number; repos: number }> {
  try {
    const response = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}`);
    if (!response.ok) throw new Error('Failed to fetch GitHub user data');
    const user: GitHubUser = await response.json();
    
    const reposResponse = await fetch(`https://api.github.com/users/${GITHUB_USERNAME}/repos?per_page=100`);
    if (!reposResponse.ok) throw new Error('Failed to fetch GitHub repos');
    const repos: RepoData[] = await reposResponse.json();
    
    const totalStars = repos.reduce((sum, repo) => sum + repo.stargazers_count, 0);
    
    return {
      stars: totalStars,
      repos: user.public_repos,
    };
  } catch (error) {
    console.error('Error fetching GitHub stats:', error);
    return { stars: 0, repos: 0 };
  }
}

export async function fetchGitHubContributions(): Promise<ContributionDay[]> {
  try {
    const response = await fetch(
      `https://github-contributions-api.jogruber.de/v4/${GITHUB_USERNAME}?y=last`
    );
    if (!response.ok) throw new Error('Failed to fetch contributions');
    const data: GitHubContribution = await response.json();
    return data.contributions;
  } catch (error) {
    console.error('Error fetching GitHub contributions:', error);
    return [];
  }
}

export function transformContributionsForCalendar(contributions: ContributionDay[]) {
  return contributions.map(day => ({
    date: day.date,
    count: day.count,
    level: day.level,
  }));
}