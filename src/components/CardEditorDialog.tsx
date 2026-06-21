'use client';

import React, { useState, useEffect } from 'react';
import { X, Info, Link as LinkIcon, FileText, Check, LayoutGrid } from 'lucide-react';
import { MindMapNode, NodeType } from '@/types/department-card';
import { DEFAULT_DEPARTMENTS } from '@/lib/card-data';

interface CardEditorDialogProps {
  isOpen: boolean;
  onClose: () => void;
  card: MindMapNode | null; // null이면 신규 생성, 값이 있으면 수정
  existingCards: MindMapNode[];
  customDepartments: string[];
  onAddCustomDepartment: (name: string) => void;
  onSave: (card: MindMapNode) => void;
}

export default function CardEditorDialog({
  isOpen,
  onClose,
  card,
  existingCards,
  customDepartments,
  onAddCustomDepartment,
  onSave,
}: CardEditorDialogProps) {
  // 모드 설정
  const [nodeType, setNodeType] = useState<NodeType>('department');
  
  // 1단계 부서 추가 관련 상태
  const [departmentName, setDepartmentName] = useState('');
  const [isCustomMode, setIsCustomMode] = useState(false);
  const [customName, setCustomName] = useState('');

  // 2단계 업무카드 추가 관련 상태
  const [parentId, setParentId] = useState(''); // 소속 부서 ID
  const [linkLabel, setLinkLabel] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [description, setDescription] = useState('');

  const [error, setError] = useState<string | null>(null);

  // 모든 부서명 목록 결합
  const allDepartments = Array.from(new Set([...DEFAULT_DEPARTMENTS, ...customDepartments]));

  // 현재 등록된 1단계 부서 노드들 목록 추출
  const existingDepts = existingCards.filter((c) => c.type === 'department');

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (card && card.id) {
        // 수정 모드
        setNodeType(card.type);
        if (card.type === 'department') {
          if (allDepartments.includes(card.label)) {
            setDepartmentName(card.label);
            setIsCustomMode(false);
          } else {
            setDepartmentName('__custom__');
            setIsCustomMode(true);
            setCustomName(card.label);
          }
        } else if (card.type === 'link') {
          setParentId(card.parentId || '');
          setLinkLabel(card.label);
          setLinkUrl(card.url || '');
          setDescription(card.description || '');
        }
      } else {
        // 신규 생성 모드 (더블클릭 등으로 빈 임시 카드 객체가 전송된 경우 포함)
        setNodeType(card ? card.type : 'department');
        setDepartmentName(allDepartments[0] || '');
        setIsCustomMode(false);
        setCustomName('');

        setParentId(card?.parentId || existingDepts[0]?.id || '');
        setLinkLabel('');
        setLinkUrl('');
        setDescription('');
      }
    }
  }, [isOpen, card, customDepartments, existingCards]);

  if (!isOpen) return null;

  const handleDeptSelectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setDepartmentName(val);
    if (val === '__custom__') {
      setIsCustomMode(true);
    } else {
      setIsCustomMode(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (nodeType === 'department') {
      // 1단계 부서 노드 저장
      let finalDeptName = departmentName;
      if (isCustomMode) {
        const trimmedCustom = customName.trim();
        if (!trimmedCustom) {
          setError('새 부서명을 입력해 주세요.');
          return;
        }
        finalDeptName = trimmedCustom;
        if (!allDepartments.includes(trimmedCustom)) {
          onAddCustomDepartment(trimmedCustom);
        }
      }

      if (!finalDeptName) {
        setError('부서명을 선택하거나 입력해 주세요.');
        return;
      }

      // 부서명 중복 방지 (단, 수정 모드이고 기존 이름과 같은 경우는 허용)
      const isDuplicate = existingDepts.some(
        (d) => d.label === finalDeptName && (!card || card.id !== d.id)
      );
      if (isDuplicate) {
        setError('이미 등록되어 있는 부서입니다.');
        return;
      }

      const updatedNode: MindMapNode = {
        id: (card && card.id) ? card.id : `dept-${Date.now()}`,
        type: 'department',
        label: finalDeptName,
        parentId: 'center-gwangyang',
        position: (card && card.id) ? card.position : { x: 0, y: 0 }, // 신규 부서: spawn 로직이 덮어씀
      };

      onSave(updatedNode);
      onClose();
    } else {
      // 2단계 업무 링크 카드 저장
      const trimmedLabel = linkLabel.trim();
      const trimmedUrl = linkUrl.trim();
      const trimmedDesc = description.trim();

      if (!parentId) {
        setError('소속할 상위 부서(1단계)를 선택해 주세요. 부서가 없다면 먼저 부서를 추가하세요.');
        return;
      }

      if (!trimmedLabel) {
        setError('업무명을 입력해 주세요.');
        return;
      }

      if (!trimmedUrl) {
        setError('바로가기 링크 URL을 입력해 주세요.');
        return;
      }

      if (!trimmedUrl.startsWith('http://') && !trimmedUrl.startsWith('https://')) {
        setError('URL은 http:// 또는 https:// 로 시작해야 합니다.');
        return;
      }

      if (!trimmedDesc) {
        setError('업무에 대한 한 줄 설명을 입력해 주세요.');
        return;
      }

      const updatedNode: MindMapNode = {
        id: (card && card.id) ? card.id : `link-${Date.now()}`,
        type: 'link',
        label: trimmedLabel,
        url: trimmedUrl,
        description: trimmedDesc,
        parentId: parentId,
        position: (card && card.id) ? card.position : { x: 0, y: 0 }, // 신규 카드: spawn 로직이 덮어씀
      };

      onSave(updatedNode);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="absolute inset-0" onClick={onClose} />

      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl transition-all dark:border-slate-800 dark:bg-slate-900 animate-scale-in">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
        >
          <X className="h-5 w-5" />
        </button>

        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
          {card ? '마인드맵 노드 수정' : '새 마인드맵 노드 추가'}
        </h2>

        {/* 1단계 / 2단계 종류 선택 탭 (신규 생성 시에만 활성화) */}
        {!card && (
          <div className="flex rounded-lg bg-slate-100 p-1 mb-5 dark:bg-slate-950">
            <button
              type="button"
              onClick={() => setNodeType('department')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                nodeType === 'department'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-white'
              }`}
            >
              <LayoutGrid className="h-4 w-4" />
              <span>1단계 부서 추가</span>
            </button>
            <button
              type="button"
              onClick={() => setNodeType('link')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 text-xs sm:text-sm font-semibold rounded-md transition-all ${
                nodeType === 'link'
                  ? 'bg-white text-indigo-600 shadow-sm dark:bg-slate-900 dark:text-indigo-400'
                  : 'text-slate-500 hover:text-slate-900 dark:text-slate-450 dark:hover:text-white'
              }`}
            >
              <LinkIcon className="h-4 w-4" />
              <span>2단계 업무링크 카드 추가</span>
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-rose-50 p-3 text-sm text-rose-600 dark:bg-rose-950/20 dark:text-rose-400">
              <Info className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* ================ 1단계 부서 추가 양식 ================ */}
          {nodeType === 'department' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  부서명 선택
                </label>
                <select
                  value={departmentName}
                  onChange={handleDeptSelectChange}
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500"
                >
                  {allDepartments.map((dept) => (
                    <option key={dept} value={dept}>
                      {dept}
                    </option>
                  ))}
                  <option value="__custom__">+ 직접 입력하여 새 부서 추가...</option>
                </select>
              </div>

              {isCustomMode && (
                <div className="p-3 bg-slate-50 rounded-lg dark:bg-slate-950/50 border border-dashed border-slate-200 dark:border-slate-800 animate-fade-in">
                  <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1.5">
                    새 부서명 직접 입력
                  </label>
                  <input
                    type="text"
                    value={customName}
                    onChange={(e) => setCustomName(e.target.value)}
                    placeholder="예: 교육과정부, 문화체육실"
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* ================ 2단계 업무카드 추가 양식 ================ */}
          {nodeType === 'link' && (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  소속 부서 (1단계) 선택
                </label>
                {existingDepts.length === 0 ? (
                  <p className="text-xs text-rose-500 bg-rose-50 dark:bg-rose-950/20 p-3 rounded-lg">
                    ⚠️ 먼저 1단계 부서를 하나 이상 생성해야 업무 카드를 추가할 수 있습니다.
                  </p>
                ) : (
                  <select
                    value={parentId}
                    onChange={(e) => setParentId(e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500"
                  >
                    {existingDepts.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  업무명
                </label>
                <input
                  type="text"
                  required
                  value={linkLabel}
                  onChange={(e) => setLinkLabel(e.target.value)}
                  placeholder="예: 학사일정 조회 시스템"
                  className="w-full rounded-lg border border-slate-200 bg-white py-2 px-3 text-sm outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  바로가기 URL
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                    <LinkIcon className="h-4 w-4" />
                  </span>
                  <input
                    type="text"
                    required
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  업무 한 줄 설명
                </label>
                <div className="relative">
                  <span className="absolute top-2.5 left-3 text-slate-400">
                    <FileText className="h-4 w-4" />
                  </span>
                  <textarea
                    required
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="업무 링크에 대한 주요 역할이나 안내를 작성해 주세요."
                    className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm outline-none transition-all focus:border-indigo-500 dark:border-slate-800 dark:bg-slate-950 dark:focus:border-indigo-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 작업 제어 */}
          <div className="flex justify-end gap-2 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={nodeType === 'link' && existingDepts.length === 0}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-md hover:bg-indigo-500 disabled:opacity-50 dark:bg-indigo-500 dark:hover:bg-indigo-400"
            >
              저장
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
