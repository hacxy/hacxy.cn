import { useEffect, useState } from 'react';
import { Icon } from '@iconify/react';
import { fetchGitHubStats } from '../../utils/github';
import styles from './index.module.scss';

interface StatsCardsProps {
  postCount: number;
}

interface GitHubStats {
  stars: number;
  repos: number;
}

export default function StatsCards({ postCount }: StatsCardsProps) {
  const [githubStats, setGithubStats] = useState<GitHubStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const stats = await fetchGitHubStats();
        setGithubStats(stats);
      } catch (err) {
        console.error('Failed to load GitHub stats:', err);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Icon icon="lucide:file-text" width={20} height={20} />
        </div>
        <div className={styles.content}>
          <span className={styles.value}>{postCount}</span>
          <span className={styles.label}>文章</span>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.iconWrapper}>
          <Icon icon="lucide:star" width={20} height={20} />
        </div>
        <div className={styles.content}>
          <span className={styles.value}>
            {loading ? '...' : githubStats?.stars ?? 0}
          </span>
          <span className={styles.label}>Stars</span>
        </div>
      </div>
    </div>
  );
}