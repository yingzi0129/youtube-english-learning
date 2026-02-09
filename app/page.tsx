import Header from './components/Header';
import LearningStats from './components/LearningStats';
import Calendar from './components/Calendar';
import LearningNotifications from './components/LearningNotifications';
import SearchFilters from './components/SearchFilters';
import VideoCard from './components/VideoCard';

// 示例视频数据
const videos = [
  {
    id: '1',
    title: '制作午餐沙拉',
    description: 'Birta Hlin在做一周饮食里的午餐沙拉，主要聊...',
    thumbnail: '/placeholder-video-1.jpg',
    duration: '2分钟',
    creator: 'Birta Hlin',
    tags: ['日常生活', '健康养生'],
    difficulty: '中级' as const,
    date: '2026/1/26',
  },
  {
    id: '2',
    title: '偶遇美味小酒馆',
    description: '没有计划的旅行到底该不该？博主在这段视频中...',
    thumbnail: '/placeholder-video-2.jpg',
    duration: '2分钟',
    creator: 'Birta Hlin',
    tags: ['城市旅行', '美食配送'],
    difficulty: '初级' as const,
    date: '2026/1/23',
  },
  {
    id: '3',
    title: '巴黎下午的小计划',
    description: 'Birta聊在巴黎下午的小计划，书店找书、超市...',
    thumbnail: '/placeholder-video-3.jpg',
    duration: '2分钟',
    creator: 'Birta Hlin',
    tags: ['城市旅行', '日常生活'],
    difficulty: '初级' as const,
    date: '2026/1/23',
  },
  {
    id: '4',
    title: '今日美妆和OOTD',
    description: '怎么用英语分享美妆和穿搭？Birta Hlin在这段...',
    thumbnail: '/placeholder-video-4.jpg',
    duration: '2分钟',
    creator: 'Birta Hlin',
    tags: ['美妆护肤', '日常生活'],
    difficulty: '初级' as const,
    date: '2026/1/20',
  },
  {
    id: '5',
    title: '超好吃的可颂',
    description: '旅行早上起床吃了1块可颂，结果被到别人生气好...',
    thumbnail: '/placeholder-video-5.jpg',
    duration: '1分钟',
    creator: 'Birta Hlin',
    tags: ['城市旅行', '美食配送'],
    difficulty: '初级' as const,
    date: '2026/1/10',
  },
  {
    id: '6',
    title: '期待已久的巴黎行',
    description: 'Birta Hlin 和朋友小唐最喜欢去飞去巴黎，聊聊为...',
    thumbnail: '/placeholder-video-6.jpg',
    duration: '2分钟',
    creator: 'Birta Hlin',
    tags: ['城市旅行', '观点表达'],
    difficulty: '初级' as const,
    date: '2026/1/9',
  },
];

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <Header />

      {/* 居中容器 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="flex flex-col lg:flex-row gap-6">
          {/* 左侧边栏 - 在移动端显示在顶部 */}
          <aside className="w-full lg:w-72 flex-shrink-0 space-y-4">
            <LearningStats />
            <div className="hidden lg:block">
              <Calendar />
            </div>
            <div className="hidden lg:block">
              <LearningNotifications />
            </div>
          </aside>

          {/* 主内容区 */}
          <main className="flex-1 min-w-0">
            <SearchFilters />

            {/* 视频网格 - 响应式布局 */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-5">
              {videos.map((video) => (
                <VideoCard key={video.id} {...video} />
              ))}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
