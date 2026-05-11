import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Icon } from '@iconify/react';
import classNames from 'classnames';
import { playlist } from '../../data/albums';
import { parseLrc, type LrcLine } from '../../utils/lrc';
import { parseKrc, type KrcLine } from '../../utils/krc';
import styles from './index.module.scss';

function formatTime(t: number) {
  const m = Math.floor(t / 60).toString().padStart(2, '0');
  const s = Math.floor(t % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

interface BarLyricProps {
  text: string;
  lyricKey: number;
  krcLine?: KrcLine;
  activationTime?: number | null;
}

function BarLyric({ text, lyricKey, krcLine, activationTime }: BarLyricProps) {
  const chars = useMemo(
    () => [...text].map((ch, i) => ({ ch, id: `${i}-${ch}`, delay: i * 30 })),
    [text]
  );

  if (krcLine && activationTime != null) {
    return (
      <span key={lyricKey} className={styles.barLyric}>
        {krcLine.chars.map((c) => {
          const charRelStart = c.offset / 1000;
          const charDur = Math.max(c.duration / 1000, 0.05);
          const elapsed = activationTime - krcLine.time;
          const delay = charRelStart - elapsed;
          const fillStyle: React.CSSProperties = {
            animationDuration: `${charDur}s`,
            animationDelay: `${delay}s`,
          };
          return (
            <span key={c.offset} className={styles.barKrcChar}>
              <span className={styles.barKrcCharFill} style={fillStyle}>{c.char}</span>
              <span className={styles.barKrcCharBase}>{c.char}</span>
            </span>
          );
        })}
      </span>
    );
  }

  return (
    <span key={lyricKey} className={styles.barLyric}>
      {chars.map(({ ch, id, delay }) => (
        <span
          key={id}
          className={styles.barLyricChar}
          style={{ animationDelay: `${delay}ms` }}
        >
          {ch}
        </span>
      ))}
    </span>
  );
}

interface KrcLineViewProps {
  line: KrcLine;
  activationTime: number | null;
}

function KrcLineView({ line, activationTime }: KrcLineViewProps) {
  return (
    <span className={styles.krcLine}>
      {line.chars.map((c) => {
        if (activationTime === null) {
          return (
            <span key={c.offset} className={styles.krcChar}>
              <span className={styles.krcCharBase}>{c.char}</span>
            </span>
          );
        }
        const charRelStart = c.offset / 1000;
        const charDur = Math.max(c.duration / 1000, 0.05);
        const elapsed = activationTime - line.time;
        const delay = charRelStart - elapsed;
        const fillStyle: React.CSSProperties = {
          animationDuration: `${charDur}s`,
          animationDelay: `${delay}s`,
        };
        return (
          <span key={c.offset} className={styles.krcChar}>
            <span className={styles.krcCharFill} style={fillStyle}>{c.char}</span>
            <span className={styles.krcCharBase}>{c.char}</span>
          </span>
        );
      })}
    </span>
  );
}

export default function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const lyricsRef = useRef<HTMLDivElement>(null);
  const lineItemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const playingRef = useRef(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  const [trackIndex, setTrackIndex] = useState(() => Math.floor(Math.random() * playlist.length));
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [lrcLines, setLrcLines] = useState<LrcLine[]>([]);
  const [krcLines, setKrcLines] = useState<KrcLine[] | null>(null);
  const [activeLrcIndex, setActiveLrcIndex] = useState(-1);
  const [lineActivationTimes, setLineActivationTimes] = useState<Record<number, number>>({});
  const prevActiveIndexRef = useRef(-1);

  const track = playlist[trackIndex];
  const useKrc = krcLines !== null && krcLines.length > 0;

  useEffect(() => {
    playingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.src = track.src;
    audio.load();
    if (playingRef.current) {
      audio.play().catch(() => setIsPlaying(false));
    }
  }, [trackIndex, track.src]);

  useEffect(() => {
    const controller = new AbortController();
    let cancelled = false;

    function loadLrc() {
      fetch(track.lrc, { signal: controller.signal })
        .then((r) => r.text())
        .then((text) => { if (!cancelled) setLrcLines(parseLrc(text)); })
        .catch((err: unknown) => {
          if (!cancelled && err instanceof Error && err.name !== 'AbortError') setLrcLines([]);
        });
    }

    if (track.krc) {
      fetch(track.krc, { signal: controller.signal })
        .then((r) => r.text())
        .then((text) => {
          if (cancelled) return;
          const lines = parseKrc(text);
          if (lines.length > 0) {
            setKrcLines(lines);
            setLrcLines([]);
          } else {
            setKrcLines([]);
            loadLrc();
          }
        })
        .catch((err: unknown) => {
          if (cancelled) return;
          if (err instanceof Error && err.name === 'AbortError') return;
          setKrcLines([]);
          loadLrc();
        });
    } else {
      loadLrc();
    }

    return () => {
      cancelled = true;
      controller.abort();
      if (!track.krc) setKrcLines(null);
    };
  }, [track.krc, track.lrc]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadStart = () => {
      setCurrentTime(0);
      setDuration(0);
      setActiveLrcIndex(-1);
      setLineActivationTimes({});
      prevActiveIndexRef.current = -1;
    };

    const onTimeUpdate = () => {
      const t = audio.currentTime;
      setCurrentTime(t);
      const lines = useKrc ? krcLines! : lrcLines;
      let idx = -1;
      for (let i = lines.length - 1; i >= 0; i--) {
        if (lines[i].time <= t) {
          idx = i;
          break;
        }
      }
      if (idx !== prevActiveIndexRef.current) {
        prevActiveIndexRef.current = idx;
        setActiveLrcIndex(idx);
        if (useKrc && idx >= 0) {
          setLineActivationTimes((prev) => ({ ...prev, [idx]: t }));
        }
      }
    };

    const onEnded = () => setTrackIndex((i) => (i + 1) % playlist.length);
    const onLoadedMetadata = () => setDuration(audio.duration);

    audio.addEventListener('loadstart', onLoadStart);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);

    return () => {
      audio.removeEventListener('loadstart', onLoadStart);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
    };
  }, [lrcLines, krcLines, useKrc]);

  useEffect(() => {
    const container = lyricsRef.current;
    const line = lineItemsRef.current[activeLrcIndex];
    if (!container || !line || activeLrcIndex < 0) return;
    const containerH = container.clientHeight;
    const lineTop = line.offsetTop;
    const lineH = line.clientHeight;
    container.scrollTop = lineTop - containerH / 2 + lineH / 2;
  }, [activeLrcIndex]);

  useEffect(() => {
    document.documentElement.style.setProperty('--music-player-h', '56px');
    return () => { document.documentElement.style.removeProperty('--music-player-h'); };
  }, []);

  useEffect(() => {
    if (!isExpanded) return;
    const onPointerDown = (e: PointerEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setIsExpanded(false);
      }
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [isExpanded]);

  const togglePlay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      audio.play().catch(() => setIsPlaying(false));
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const prev = useCallback(
    () => setTrackIndex((i) => (i - 1 + playlist.length) % playlist.length),
    []
  );
  const next = useCallback(() => setTrackIndex((i) => (i + 1) % playlist.length), []);

  const seek = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRef.current;
    if (!audio) return;
    const t = Number(e.target.value);
    audio.currentTime = t;
    setCurrentTime(t);
    setLineActivationTimes({});
    prevActiveIndexRef.current = -1;
  }, []);

  const activeLine = activeLrcIndex >= 0
    ? (useKrc ? krcLines![activeLrcIndex] : lrcLines[activeLrcIndex])
    : null;

  const renderLines = useKrc ? krcLines! : lrcLines;
  const hasLyrics = renderLines.length > 0;

  return (
    <>
      <audio ref={audioRef} />
      <div className={styles.wrap} ref={wrapRef}>
        <div className={classNames(styles.panel, { [styles.panelVisible]: isExpanded })}>
          <button
            className={styles.closeBtn}
            onClick={() => setIsExpanded(false)}
            aria-label="收起播放器"
          >
            <Icon icon="lucide:chevron-down" width={16} height={16} />
          </button>

          <div className={styles.panelInner}>
            <div className={styles.panelLeft}>
              <img
                className={styles.panelCover}
                src={track.cover}
                alt={track.albumName}
                draggable={false}
              />
              <div className={styles.panelInfo}>
                <div className={styles.panelTitle}>{track.title}</div>
                <div className={styles.panelArtist}>{track.artist}</div>
              </div>
              <div className={styles.panelControls}>
                <button className={styles.ctrlBtn} onClick={prev} aria-label="上一首">
                  <Icon icon="lucide:skip-back" width={18} height={18} />
                </button>
                <button
                  className={classNames(styles.ctrlBtn, styles.playBtn)}
                  onClick={togglePlay}
                  aria-label={isPlaying ? '暂停' : '播放'}
                >
                  <Icon
                    icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                    width={20}
                    height={20}
                  />
                </button>
                <button className={styles.ctrlBtn} onClick={next} aria-label="下一首">
                  <Icon icon="lucide:skip-forward" width={18} height={18} />
                </button>
              </div>
              <div className={styles.progress}>
                <span className={styles.time}>{formatTime(currentTime)}</span>
                <input
                  className={styles.seek}
                  type="range"
                  min={0}
                  max={duration || 1}
                  step={0.5}
                  value={currentTime}
                  onChange={seek}
                />
                <span className={styles.time}>{formatTime(duration)}</span>
              </div>
            </div>

            <div className={styles.panelRight}>
              <div className={styles.lyrics} ref={lyricsRef}>
                <div className={styles.lyricsTopPad} />
                {!hasLyrics ? (
                  <div className={styles.noLyrics}>暂无歌词</div>
                ) : useKrc ? (
                  krcLines!.map((line, i) => (
                    <div
                      key={line.id}
                      ref={(el) => { lineItemsRef.current[i] = el; }}
                      className={classNames(styles.lyricLine, {
                        [styles.lyricActive]: i === activeLrcIndex,
                      })}
                    >
                      <KrcLineView
                        line={line}
                        activationTime={lineActivationTimes[i] ?? null}
                      />
                    </div>
                  ))
                ) : (
                  lrcLines.map((line, i) => (
                    <div
                      key={line.id}
                      ref={(el) => { lineItemsRef.current[i] = el; }}
                      className={classNames(styles.lyricLine, {
                        [styles.lyricActive]: i === activeLrcIndex,
                      })}
                    >
                      {line.text}
                    </div>
                  ))
                )}
                <div className={styles.lyricsBottomPad} />
              </div>
            </div>
          </div>

          <div className={styles.mobileFooter}>
            <div className={styles.panelControls}>
              <button className={styles.ctrlBtn} onClick={prev} aria-label="上一首">
                <Icon icon="lucide:skip-back" width={20} height={20} />
              </button>
              <button
                className={classNames(styles.ctrlBtn, styles.playBtn)}
                onClick={togglePlay}
                aria-label={isPlaying ? '暂停' : '播放'}
              >
                <Icon
                  icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                  width={24}
                  height={24}
                />
              </button>
              <button className={styles.ctrlBtn} onClick={next} aria-label="下一首">
                <Icon icon="lucide:skip-forward" width={20} height={20} />
              </button>
            </div>
            <div className={styles.progress}>
              <span className={styles.time}>{formatTime(currentTime)}</span>
              <input
                className={styles.seek}
                type="range"
                min={0}
                max={duration || 1}
                step={0.5}
                value={currentTime}
                onChange={seek}
              />
              <span className={styles.time}>{formatTime(duration)}</span>
            </div>
          </div>
        </div>

        <div className={styles.bar} onClick={() => !isExpanded && setIsExpanded(true)}>
          <div className={styles.barLeft}>
            <img
              className={classNames(styles.barCover, { [styles.playing]: isPlaying })}
              src={track.cover}
              alt={track.albumName}
              draggable={false}
            />
            <div className={styles.barInfo}>
              <span className={styles.barTitle}>{track.title}</span>
              <BarLyric
                text={activeLine ? activeLine.text : track.artist}
                lyricKey={activeLrcIndex}
                krcLine={useKrc && activeLrcIndex >= 0 ? krcLines![activeLrcIndex] : undefined}
                activationTime={useKrc && activeLrcIndex >= 0 ? (lineActivationTimes[activeLrcIndex] ?? null) : null}
              />
            </div>
          </div>

          <div className={styles.barControls} onClick={(e) => e.stopPropagation()}>
            <button className={styles.ctrlBtn} onClick={prev} aria-label="上一首">
              <Icon icon="lucide:skip-back" width={16} height={16} />
            </button>
            <button
              className={classNames(styles.ctrlBtn, styles.playBtn)}
              onClick={togglePlay}
              aria-label={isPlaying ? '暂停' : '播放'}
            >
              <Icon
                icon={isPlaying ? 'lucide:pause' : 'lucide:play'}
                width={18}
                height={18}
              />
            </button>
            <button className={styles.ctrlBtn} onClick={next} aria-label="下一首">
              <Icon icon="lucide:skip-forward" width={16} height={16} />
            </button>
          </div>

          <button
            className={classNames(styles.ctrlBtn, styles.expandBtn)}
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((v) => !v);
            }}
            aria-label={isExpanded ? '收起' : '展开'}
          >
            <Icon
              icon={isExpanded ? 'lucide:chevron-down' : 'lucide:chevron-up'}
              width={16}
              height={16}
            />
          </button>

          <div className={styles.barProgress}>
            <div
              className={styles.barProgressFill}
              style={{ width: duration > 0 ? `${(currentTime / duration) * 100}%` : '0%' }}
            />
          </div>
        </div>
      </div>
    </>
  );
}
