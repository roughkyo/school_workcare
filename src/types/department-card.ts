export type NodeType = 'center' | 'department' | 'link';

export interface MindMapNode {
  id: string;
  type: NodeType;
  label: string;         // 표시 텍스트 (예: '광양고' / '교무부' / '나이스')
  url?: string;          // link 노드일 때 필수
  description?: string;  // link 노드일 때 필수
  parentId?: string;     // department는 'center' 고정, link는 소속 department.id 지정, center는 없음
  position: {
    x: number;
    y: number;
  };
}
