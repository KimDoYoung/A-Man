import React from 'react';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  id: number;
  name: string;
  nums?: string;
}

interface Props {
  folderHierarchy: BreadcrumbItem[];
}

const FolderBreadcrumbs: React.FC<Props> = ({ folderHierarchy }) => {
  return (
    <nav className="flex items-center space-x-2 text-[11px] text-gray-400 font-medium mb-2.5 shrink-0">
      {folderHierarchy.length > 0 ? (
        folderHierarchy.map((item, idx) => (
          <React.Fragment key={item.id}>
            {idx > 0 && <ChevronRight className="w-3 h-3 text-gray-500" />}
            <span
              className={
                idx === folderHierarchy.length - 1
                  ? 'text-indigo-600 font-semibold'
                  : 'text-gray-400 font-medium'
              }
            >
              {item.name}
              {item.nums ? `(${item.nums})` : ''}
            </span>
          </React.Fragment>
        ))
      ) : (
        <>
          <span className="hover:text-gray-600 cursor-pointer">시스템 설정</span>
          <ChevronRight className="w-3 h-3 text-gray-300" />
          <span className="text-gray-400 font-medium">도움말</span>
        </>
      )}
    </nav>
  );
};

export default FolderBreadcrumbs;
