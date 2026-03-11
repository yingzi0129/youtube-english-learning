export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50 flex items-center justify-center">
      <div className="relative">
        {/* 旋转的圆环 */}
        <div className="w-24 h-24 border-4 border-purple-200 border-t-purple-500 rounded-full animate-spin"></div>
        {/* 中心的播放图标 */}
        <div className="absolute inset-0 flex items-center justify-center">
          <svg className="w-10 h-10 text-purple-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
      </div>
    </div>
  );
}
