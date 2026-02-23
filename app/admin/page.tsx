'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';

interface Stats {
  videos: number;
  users: number;
  activationCodes: number;
  usedCodes: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (!response.ok) throw new Error('获取数据失败');
      const data = await response.json();
      setStats(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const statsData = [
    {
      name: '视频总数',
      value: stats?.videos || 0,
      icon: 'video',
      color: 'purple',
      link: '/admin/videos',
    },
    {
      name: '用户总数',
      value: stats?.users || 0,
      icon: 'users',
      color: 'blue',
      link: '/admin/users',
    },
    {
      name: '激活码总数',
      value: stats?.activationCodes || 0,
      icon: 'code',
      color: 'green',
      link: '/admin/activation-codes',
    },
    {
      name: '已使用激活码',
      value: stats?.usedCodes || 0,
      icon: 'check',
      color: 'pink',
      link: '/admin/activation-codes',
    },
  ];

  const quickActions = [
    {
      name: '添加视频',
      description: '上传新的学习视频',
      icon: 'plus',
      link: '/admin/videos/new',
      color: 'purple',
    },
    {
      name: '生成激活码',
      description: '批量生成新的激活码',
      icon: 'code',
      link: '/admin/activation-codes',
      color: 'blue',
    },
    {
      name: '管理字幕',
      description: '上传和编辑视频字幕',
      icon: 'subtitle',
      link: '/admin/subtitles',
      color: 'green',
    },
    {
      name: '试用页管理',
      description: '配置试用提示与试用视频',
      icon: 'trial',
      link: '/admin/trial',
      color: 'purple',
    },
    {
      name: '标注管理',
      description: '为字幕标注学习点（下划线 + 单词卡 + 填空练习）',
      icon: 'annotation',
      link: '/admin/annotations',
      color: 'purple',
    },
    {
      name: '用户管理',
      description: '查看和管理用户权限',
      icon: 'users',
      link: '/admin/users',
      color: 'pink',
    },
  ];

  if (loading) {
    return (
      <div className="space-y-8">
        <div>
          <div className="h-9 w-48 bg-gray-200 rounded animate-pulse"></div>
          <div className="mt-2 h-6 w-64 bg-gray-200 rounded animate-pulse"></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
              <div className="mt-2 h-9 w-16 bg-gray-200 rounded animate-pulse"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">加载失败: {error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* 页面标题 */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">管理后台概览</h1>
        <p className="mt-2 text-gray-600">欢迎回来，这是您的管理控制面板</p>
      </div>

      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsData.map((stat) => (
          <Link
            key={stat.name}
            href={stat.link}
            className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">{stat.name}</p>
                <p className="mt-2 text-3xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`w-12 h-12 bg-${stat.color}-100 rounded-lg flex items-center justify-center`}>
                <StatIcon icon={stat.icon} color={stat.color} />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 快捷操作 */}
      <div>
        <h2 className="text-xl font-bold text-gray-900 mb-4">快捷操作</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
          {quickActions.map((action) => (
            <Link
              key={action.name}
              href={action.link}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-200 hover:shadow-md transition-all hover:scale-105"
            >
              <div className={`w-10 h-10 bg-${action.color}-100 rounded-lg flex items-center justify-center mb-4`}>
                <ActionIcon icon={action.icon} color={action.color} />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">{action.name}</h3>
              <p className="text-sm text-gray-600">{action.description}</p>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatIcon({ icon, color }: { icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    pink: 'text-pink-600',
  };

  const icons: Record<string, React.ReactNode> = {
    video: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
    code: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    ),
    check: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    ),
  };

  return (
    <svg className={`w-6 h-6 ${colorMap[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[icon]}
    </svg>
  );
}

function ActionIcon({ icon, color }: { icon: string; color: string }) {
  const colorMap: Record<string, string> = {
    purple: 'text-purple-600',
    blue: 'text-blue-600',
    green: 'text-green-600',
    pink: 'text-pink-600',
  };

  const icons: Record<string, React.ReactNode> = {
    plus: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    ),
    code: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
    ),
    subtitle: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
    ),
    trial: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h12a2 2 0 012 2v3a2 2 0 010 4v3a2 2 0 01-2 2H6a2 2 0 01-2-2v-3a2 2 0 010-4V6zm4 1h4m-4 4h8m-8 4h4" />
    ),
    annotation: (
      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5h6a2 2 0 012 2v10a2 2 0 01-2 2H9a2 2 0 01-2-2V7a2 2 0 012-2zm2 3h4m-4 4h4m-6 7l-3 3m3-3l3 3' />
    ),
    users: (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    ),
  };

  return (
    <svg className={`w-5 h-5 ${colorMap[color]}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      {icons[icon]}
    </svg>
  );
}
