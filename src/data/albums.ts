export interface Track {
  title: string;
  artist: string;
  src: string;
  lrc: string;
  krc?: string;
}

export interface Album {
  id: string;
  name: string;
  cover: string;
  tracks: Track[];
}

export const albums: Album[] = [
  {
    id: 'tyzz',
    name: '听你周周',
    cover: '/musics/tyzz/cover.jpg',
    tracks: [
      { title: '太阳之子', artist: '周杰伦', src: '/musics/tyzz/太阳之子.mp3', lrc: '/musics/tyzz/太阳之子.lrc', krc: '/musics/tyzz/太阳之子.krc' },
      { title: '西西里', artist: '周杰伦', src: '/musics/tyzz/西西里.mp3', lrc: '/musics/tyzz/西西里.lrc', krc: '/musics/tyzz/西西里.krc' },
      { title: '那天下雨了', artist: '周杰伦', src: '/musics/tyzz/那天下雨了.mp3', lrc: '/musics/tyzz/那天下雨了.lrc', krc: '/musics/tyzz/那天下雨了.krc' },
      { title: '湘女多情', artist: '周杰伦', src: '/musics/tyzz/湘女多情.mp3', lrc: '/musics/tyzz/湘女多情.lrc', krc: '/musics/tyzz/湘女多情.krc' },
      { title: '谁稀罕', artist: '周杰伦', src: '/musics/tyzz/谁稀罕.mp3', lrc: '/musics/tyzz/谁稀罕.lrc', krc: '/musics/tyzz/谁稀罕.krc' },
      { title: '七月的极光', artist: '周杰伦', src: '/musics/tyzz/七月的极光.mp3', lrc: '/musics/tyzz/七月的极光.lrc', krc: '/musics/tyzz/七月的极光.krc' },
      { title: '爱琴海', artist: '周杰伦', src: '/musics/tyzz/爱琴海.mp3', lrc: '/musics/tyzz/爱琴海.lrc', krc: '/musics/tyzz/爱琴海.krc' },
      { title: 'I Do', artist: '周杰伦', src: '/musics/tyzz/I Do.mp3', lrc: '/musics/tyzz/I Do.lrc', krc: '/musics/tyzz/I Do.krc' },
      { title: '圣徒', artist: '周杰伦', src: '/musics/tyzz/圣徒.mp3', lrc: '/musics/tyzz/圣徒.lrc', krc: '/musics/tyzz/圣徒.krc' },
      { title: '女儿殿下', artist: '周杰伦', src: '/musics/tyzz/女儿殿下.mp3', lrc: '/musics/tyzz/女儿殿下.lrc', krc: '/musics/tyzz/女儿殿下.krc' },
      { title: '淘金小镇', artist: '周杰伦', src: '/musics/tyzz/淘金小镇.mp3', lrc: '/musics/tyzz/淘金小镇.lrc', krc: '/musics/tyzz/淘金小镇.krc' },
      { title: '乡间的路', artist: '周杰伦', src: '/musics/tyzz/乡间的路.mp3', lrc: '/musics/tyzz/乡间的路.lrc', krc: '/musics/tyzz/乡间的路.krc' },
      { title: '圣诞星', artist: '周杰伦', src: '/musics/tyzz/圣诞星 (feat. 杨瑞代).mp3', lrc: '/musics/tyzz/圣诞星 (feat. 杨瑞代).lrc', krc: '/musics/tyzz/圣诞星 (feat. 杨瑞代).krc' },
    ],
  },
];

export const playlist = albums.flatMap((album) =>
  album.tracks.map((track) => ({ ...track, cover: album.cover, albumName: album.name }))
);
