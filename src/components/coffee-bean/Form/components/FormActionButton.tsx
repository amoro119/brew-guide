import React from 'react';
import { CornerDownRight } from 'lucide-react';
import { useSettingPageLayoutMode } from '@/components/settings/atomic/SettingPageLayoutContext';
import { cn } from '@/lib/utils/classNameUtils';

const FormActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement>
> = ({ className, children, ...props }) => (
  <button
    type="button"
    className={cn(
      'inline-flex cursor-pointer items-center gap-1.5 text-sm leading-none font-medium text-neutral-600 transition active:opacity-60 dark:text-neutral-300',
      className
    )}
    {...props}
  >
    <CornerDownRight
      className="size-4 shrink-0"
      strokeWidth={1.8}
      aria-hidden="true"
    />
    {children}
  </button>
);

interface FormActionRowProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export const FormActionRow: React.FC<FormActionRowProps> = ({
  className,
  children,
  ...props
}) => {
  const layoutMode = useSettingPageLayoutMode();
  const sectionPaddingClass = layoutMode === 'embedded' ? 'pl-3 pr-6' : 'px-6';

  return (
    <div className={sectionPaddingClass}>
      <div
        className={cn(
          'flex flex-wrap items-center gap-x-5 gap-y-3 pt-0 pb-5 pl-3.5',
          className
        )}
        {...props}
      >
        {children}
      </div>
    </div>
  );
};

export default FormActionButton;
