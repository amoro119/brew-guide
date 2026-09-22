'use client';

import React, { useRef, useEffect } from 'react';
import { CoffeeBean } from '@/types/app';
import HighlightText from '@/components/common/ui/HighlightText';
import { normalizeDelimitedTextList } from '@/lib/utils/coffeeBeanUtils';
import TagListField from './TagListField';
import { useFlavorSuggestions } from '@/components/coffee-bean/Form/hooks/useCoffeeBeanFieldSuggestions';

interface FlavorNotesSectionProps {
  bean: CoffeeBean | null;
  tempBean: Partial<CoffeeBean>;
  isAddMode: boolean;
  searchQuery: string;
  handleUpdateField: (updates: Partial<CoffeeBean>) => Promise<void>;
}

const FlavorNotesSection: React.FC<FlavorNotesSectionProps> = ({
  bean,
  tempBean,
  isAddMode,
  searchQuery,
  handleUpdateField,
}) => {
  const notesRef = useRef<HTMLDivElement>(null);

  const currentFlavors = isAddMode ? tempBean.flavor || [] : bean?.flavor || [];
  const currentNotes = isAddMode ? tempBean.notes : bean?.notes;
  const flavorSuggestions = useFlavorSuggestions();

  // 初始化备注值
  useEffect(() => {
    if (bean?.notes && notesRef.current) {
      notesRef.current.innerText = bean.notes;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bean?.id]);

  // 处理备注内容变化
  const handleNotesInput = () => {
    if (notesRef.current) {
      const newContent = notesRef.current.innerText || '';
      handleUpdateField({ notes: newContent.trim() });
    }
  };

  const appendFlavors = (value: string) => {
    const nextItems = normalizeDelimitedTextList(value);
    if (nextItems.length === 0) return false;

    handleUpdateField({
      flavor: Array.from(new Set([...currentFlavors, ...nextItems])),
    });
    return true;
  };

  const replaceFlavor = (index: number, value: string) => {
    const remainingFlavors = currentFlavors.filter((_, i) => i !== index);
    const nextItems = normalizeDelimitedTextList(value).filter(
      item => !remainingFlavors.includes(item)
    );
    const nextFlavors = [...remainingFlavors];
    nextFlavors.splice(index, 0, ...nextItems);
    handleUpdateField({ flavor: nextFlavors });
  };

  return (
    <>
      {/* 风味 */}
      {(isAddMode || (bean?.flavor && bean.flavor.length > 0)) && (
        <div className="flex items-start">
          <div className="w-16 shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            风味
          </div>
          <TagListField
            items={currentFlavors.map((value, index) => ({ id: index, value }))}
            label="风味"
            suggestions={flavorSuggestions.suggestions}
            onAdd={appendFlavors}
            onUpdate={(id, value) => replaceFlavor(Number(id), value)}
            onRemove={id => {
              handleUpdateField({
                flavor: currentFlavors.filter(
                  (_, index) => index !== Number(id)
                ),
              });
            }}
            isCustomPreset={flavorSuggestions.isRemovableSuggestion}
            onRemovePreset={flavorSuggestions.removeSuggestion}
            showInput={isAddMode}
          />
        </div>
      )}

      {/* 备注 */}
      {(isAddMode || bean?.notes) && (
        <div className="flex items-start">
          <div className="w-16 shrink-0 text-xs font-medium text-neutral-500 dark:text-neutral-400">
            备注
          </div>
          <div className="relative flex-1">
            {isAddMode && !tempBean.notes && (
              <span
                className="pointer-events-none absolute top-0 left-0 text-xs font-medium text-neutral-400 dark:text-neutral-500"
                data-placeholder="notes"
              >
                输入备注
              </span>
            )}
            <div
              ref={notesRef}
              contentEditable
              suppressContentEditableWarning
              onInput={e => {
                const placeholder =
                  e.currentTarget.parentElement?.querySelector(
                    '[data-placeholder="notes"]'
                  ) as HTMLElement;
                if (placeholder) {
                  placeholder.style.display = e.currentTarget.textContent
                    ? 'none'
                    : '';
                }
              }}
              onBlur={handleNotesInput}
              className="cursor-text text-xs font-medium whitespace-pre-wrap text-neutral-800 outline-none dark:text-neutral-100"
              style={{
                minHeight: '1.5em',
                wordBreak: 'break-word',
              }}
            >
              {(() => {
                if (!currentNotes) return '';
                if (searchQuery) {
                  return (
                    <HighlightText
                      text={currentNotes || ''}
                      highlight={searchQuery}
                      className="text-neutral-700 dark:text-neutral-300"
                    />
                  );
                }
                return currentNotes;
              })()}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FlavorNotesSection;
