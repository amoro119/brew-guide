import { useCallback, type FC } from 'react';
import { Plus } from 'lucide-react';

interface CoffeeBeanCreateOptionProps {
  name: string;
  onCreate: (name: string) => void;
  className?: string;
}

const CoffeeBeanCreateOption: FC<CoffeeBeanCreateOptionProps> = ({
  name,
  onCreate,
  className = '',
}) => {
  const handleCreate = useCallback(() => {
    onCreate(name);
  }, [name, onCreate]);

  return (
    <button
      type="button"
      className={`group flex w-full cursor-pointer gap-3 text-left transition-colors ${className}`}
      onClick={handleCreate}
    >
      <div className="relative self-start">
        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded border border-neutral-200/50 bg-neutral-100 dark:border-neutral-800/50 dark:bg-neutral-800/20">
          <Plus className="h-5 w-5 text-neutral-400 dark:text-neutral-500" />
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col justify-center gap-y-1">
        <div className="line-clamp-2 text-xs leading-tight font-medium text-neutral-800 dark:text-neutral-100">
          {name}
        </div>
        <div className="text-xs leading-relaxed font-medium text-neutral-600 dark:text-neutral-400">
          <span className="inline whitespace-nowrap">新建咖啡豆</span>
        </div>
      </div>
    </button>
  );
};

export default CoffeeBeanCreateOption;
