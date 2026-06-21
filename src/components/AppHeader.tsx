'use client';

import React from 'react';
import { School, LogIn, LogOut, Plus, RefreshCw, Undo } from 'lucide-react';

interface AppHeaderProps {
  isLoggedIn: boolean;
  userName: string | null;
  onLoginClick: () => void;
  onLogoutClick: () => void;
  onAddCardClick: () => void;
  isSyncing?: boolean;
  hasApi?: boolean;
  onUndo?: () => void;
  canUndo?: boolean;
}

export default function AppHeader({
  isLoggedIn,
  userName,
  onLoginClick,
  onLogoutClick,
  onAddCardClick,
  isSyncing = false,
  hasApi = false,
  onUndo,
  canUndo = false,
}: AppHeaderProps) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-slate-800/80 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* 로고 영역 */}
        <div className="flex items-center gap-2.5">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-md shadow-indigo-200 dark:shadow-none">
            <School className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-white sm:text-xl">
              광양고 업무 Link Hub
            </h1>
            <p className="hidden text-xs text-slate-500 dark:text-slate-400 sm:block">
              부서별 주요 시스템 및 업무 바로가기 맵
            </p>
          </div>
        </div>

        {/* 제어 영역 */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 구글 시트 실시간 연동 상태 표시 */}
          {hasApi && (
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100/80 border border-slate-200/50 dark:bg-slate-800/50 dark:border-slate-700/50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              <span className={`h-1.5 w-1.5 rounded-full ${isSyncing ? 'bg-indigo-500 animate-ping' : 'bg-emerald-500 animate-pulse'}`} />
              <span className="hidden sm:inline">
                {isSyncing ? '스프레드시트 동기화 중...' : '구글 스프레드시트 연동'}
              </span>
              <span className="sm:hidden">
                {isSyncing ? '동기화 중...' : '구글시트'}
              </span>
            </div>
          )}

          {/* 되돌리기 (Undo) 버튼 */}
          <button
            onClick={onUndo}
            disabled={!canUndo}
            title={canUndo ? "작업 되돌리기 (Undo)" : "되돌릴 작업이 없습니다"}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-600 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
          >
            <Undo className="h-4 w-4" />
          </button>

          {isLoggedIn ? (
            <>
              {/* 로그인 정보 표시 */}
              <div className="hidden items-center gap-2 text-sm sm:flex">
                <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {userName} 선생님
                </span>
              </div>

              {/* 카드 추가 버튼 */}
              <button
                onClick={onAddCardClick}
                className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-indigo-500 hover:shadow-indigo-100 active:scale-95 dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:shadow-none"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">부서 카드 추가</span>
                <span className="sm:hidden">추가</span>
              </button>

              {/* 로그아웃 버튼 */}
              <button
                onClick={onLogoutClick}
                className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm font-semibold text-slate-700 transition-all hover:bg-slate-50 hover:text-slate-900 active:scale-95 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">로그아웃</span>
              </button>
            </>
          ) : (
            /* 로그인 버튼 */
            <button
              onClick={onLoginClick}
              className="flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-slate-800 active:scale-95 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-100"
            >
              <LogIn className="h-4 w-4" />
              <span>교사 로그인</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
