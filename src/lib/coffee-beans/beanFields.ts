import type { BlendComponent, CoffeeBean } from '@/types/app';
import type { AppSettings } from '@/lib/core/db';

export type BeanFieldId =
  | 'origin'
  | 'country'
  | 'region'
  | 'estate'
  | 'altitude'
  | 'process'
  | 'batch'
  | 'variety';

export interface BeanFieldConfigItem {
  id: BeanFieldId;
  enabled: boolean;
  order: number;
}

export interface BeanFieldConfig {
  version: 1;
  fields: BeanFieldConfigItem[];
}

export type BeanFieldGroupId = 'origin' | 'processing' | 'variety';

export interface BeanFieldDefinition {
  id: BeanFieldId;
  label: string;
  noteLabel: string;
  group: BeanFieldGroupId;
  legacy?: boolean;
}

export const BEAN_FIELD_DEFINITIONS: BeanFieldDefinition[] = [
  {
    id: 'origin',
    label: '产地',
    noteLabel: '产地',
    group: 'origin',
    legacy: true,
  },
  { id: 'country', label: '产国', noteLabel: '产国', group: 'origin' },
  { id: 'region', label: '产区', noteLabel: '产区', group: 'origin' },
  { id: 'estate', label: '庄园', noteLabel: '庄园', group: 'origin' },
  { id: 'altitude', label: '海拔', noteLabel: '海拔', group: 'origin' },
  { id: 'process', label: '处理法', noteLabel: '处理法', group: 'processing' },
  { id: 'batch', label: '批次', noteLabel: '批次', group: 'processing' },
  { id: 'variety', label: '品种', noteLabel: '品种', group: 'variety' },
];

export const BEAN_FIELD_GROUP_LABELS: Record<BeanFieldGroupId, string> = {
  origin: '产地',
  processing: '处理法',
  variety: '品种',
};

const FIELD_ORDER = new Map(
  BEAN_FIELD_DEFINITIONS.map((definition, index) => [definition.id, index])
);

const FIELD_DEFINITION_BY_ID = new Map(
  BEAN_FIELD_DEFINITIONS.map(definition => [definition.id, definition])
);

const TEXT_FIELD_IDS: BeanFieldId[] = [
  'origin',
  'country',
  'region',
  'estate',
  'altitude',
  'process',
  'batch',
  'variety',
];

export const BEAN_COMPONENT_TEXT_FIELD_IDS: readonly BeanFieldId[] =
  TEXT_FIELD_IDS;

const STRUCTURED_ORIGIN_FIELD_IDS: BeanFieldId[] = [
  'country',
  'region',
  'estate',
  'altitude',
];

const DEFAULT_ENABLED_FIELD_IDS: BeanFieldId[] = [
  'origin',
  'process',
  'variety',
];

const stringifyFieldValue = (value: unknown): string => {
  if (typeof value === 'string') return value.replace(/\s+/g, ' ').trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return '';
};

const normalizeNoteParts = (
  notes: unknown
): { text: string; parts: string[] } => {
  if (Array.isArray(notes)) {
    const parts = notes
      .map(item => stringifyFieldValue(item))
      .filter(Boolean);
    return { text: parts.join(' / '), parts };
  }

  const text = stringifyFieldValue(notes);
  return {
    text,
    parts: text
      ? text
          .split(/\s*\/\s*/)
          .map(part => part.trim())
          .filter(Boolean)
      : [],
  };
};

export function resolveBeanFieldConfig(
  settings?: Pick<AppSettings, 'beanFieldConfig' | 'showEstateField'> | null
): BeanFieldConfig {
  const configuredFields = settings?.beanFieldConfig?.fields;

  if (Array.isArray(configuredFields) && configuredFields.length > 0) {
    const enabledById = new Map<BeanFieldId, boolean>();
    configuredFields.forEach(field => {
      if (FIELD_DEFINITION_BY_ID.has(field.id)) {
        enabledById.set(field.id, field.enabled !== false);
      }
    });

    return {
      version: 1,
      fields: BEAN_FIELD_DEFINITIONS.map((definition, index) => ({
        id: definition.id,
        enabled: enabledById.get(definition.id) ?? false,
        order:
          configuredFields.find(field => field.id === definition.id)?.order ??
          index,
      })).sort((left, right) => left.order - right.order),
    };
  }

  const enabledFields = new Set(DEFAULT_ENABLED_FIELD_IDS);
  if (settings?.showEstateField === true) {
    enabledFields.add('estate');
  }

  return {
    version: 1,
    fields: BEAN_FIELD_DEFINITIONS.map((definition, index) => ({
      id: definition.id,
      enabled: enabledFields.has(definition.id),
      order: index,
    })),
  };
}

export function normalizeBeanFieldConfig(
  config?: Partial<BeanFieldConfig> | null
): BeanFieldConfig | undefined {
  if (!config || !Array.isArray(config.fields)) return undefined;

  const fieldById = new Map<BeanFieldId, BeanFieldConfigItem>();
  config.fields.forEach(field => {
    if (FIELD_DEFINITION_BY_ID.has(field.id)) {
      fieldById.set(field.id, {
        id: field.id,
        enabled: field.enabled !== false,
        order:
          typeof field.order === 'number'
            ? field.order
            : (FIELD_ORDER.get(field.id) ?? 0),
      });
    }
  });

  if (fieldById.size === 0) return undefined;

  return {
    version: 1,
    fields: BEAN_FIELD_DEFINITIONS.map((definition, index) => ({
      id: definition.id,
      enabled: fieldById.get(definition.id)?.enabled ?? false,
      order: fieldById.get(definition.id)?.order ?? index,
    })).sort((left, right) => left.order - right.order),
  };
}

export function getEnabledBeanFieldIds(config: BeanFieldConfig): BeanFieldId[] {
  return config.fields
    .filter(field => field.enabled)
    .map(field => field.id)
    .filter(id => FIELD_DEFINITION_BY_ID.has(id));
}

export function getBeanFieldDefinition(
  id: BeanFieldId
): BeanFieldDefinition {
  return FIELD_DEFINITION_BY_ID.get(id)!;
}

export function getComponentFieldValue(
  component: BlendComponent | undefined,
  fieldId: BeanFieldId
): string {
  if (!component) return '';
  return stringifyFieldValue(component[fieldId]);
}

export function hasStructuredOriginFields(
  component: BlendComponent | undefined
): boolean {
  return STRUCTURED_ORIGIN_FIELD_IDS.some(fieldId =>
    Boolean(getComponentFieldValue(component, fieldId))
  );
}

export function getComponentOriginDisplay(
  component: BlendComponent | undefined
): string {
  if (!component) return '';

  if (hasStructuredOriginFields(component)) {
    return STRUCTURED_ORIGIN_FIELD_IDS.map(fieldId =>
      getComponentFieldValue(component, fieldId)
    )
      .filter(Boolean)
      .join(' · ');
  }

  return getComponentFieldValue(component, 'origin');
}

export function getComponentSearchText(
  component: BlendComponent | undefined
): string {
  if (!component) return '';

  return [
    component.percentage,
    ...TEXT_FIELD_IDS.map(fieldId => getComponentFieldValue(component, fieldId)),
  ]
    .map(value => stringifyFieldValue(value))
    .filter(Boolean)
    .join(' ');
}

export function getComponentConfiguredValues(
  component: BlendComponent | undefined,
  fieldIds: BeanFieldId[]
): Array<{ id: BeanFieldId; label: string; value: string }> {
  if (!component) return [];

  return fieldIds
    .map(id => ({
      id,
      label: getBeanFieldDefinition(id).label,
      value: getComponentFieldValue(component, id),
    }))
    .filter(entry => entry.value);
}

const appendNotePart = (parts: string[], nextPart: string) => {
  const trimmed = nextPart.trim();
  if (!trimmed || parts.includes(trimmed)) return;
  parts.push(trimmed);
};

const shouldKeepPercentage = (component: BlendComponent): boolean =>
  component.percentage !== undefined && component.percentage !== null;

export function normalizeCoffeeBeanForFieldConfig<T extends Partial<CoffeeBean>>(
  bean: T,
  settings?: Pick<AppSettings, 'beanFieldConfig' | 'showEstateField'> | null
): T {
  const config = resolveBeanFieldConfig(settings);
  const enabledFieldIds = new Set(getEnabledBeanFieldIds(config));
  const noteParts = normalizeNoteParts(bean.notes).parts;

  if (!Array.isArray(bean.blendComponents)) {
    return {
      ...bean,
      notes: noteParts.length > 0 ? noteParts.join(' / ') : undefined,
    };
  }

  const normalizedComponents = bean.blendComponents
    .map((component, componentIndex) => {
      const nextComponent: BlendComponent = {};

      if (shouldKeepPercentage(component)) {
        nextComponent.percentage = component.percentage;
      }

      TEXT_FIELD_IDS.forEach(fieldId => {
        const value = getComponentFieldValue(component, fieldId);
        if (!value) return;

        if (enabledFieldIds.has(fieldId)) {
          nextComponent[fieldId] = value;
          return;
        }

        const definition = getBeanFieldDefinition(fieldId);
        const prefix =
          bean.blendComponents && bean.blendComponents.length > 1
            ? `成分${componentIndex + 1} `
            : '';
        appendNotePart(noteParts, `${prefix}${definition.noteLabel}：${value}`);
      });

      return nextComponent;
    })
    .filter(
      component =>
        shouldKeepPercentage(component) ||
        TEXT_FIELD_IDS.some(fieldId => getComponentFieldValue(component, fieldId))
    );

  return {
    ...bean,
    blendComponents:
      normalizedComponents.length > 0 ? normalizedComponents : undefined,
    notes: noteParts.length > 0 ? noteParts.join(' / ') : undefined,
  };
}

export function normalizeCoffeeBeanPayloadForFieldConfig(
  payload: unknown,
  settings?: Pick<AppSettings, 'beanFieldConfig' | 'showEstateField'> | null
): unknown {
  if (Array.isArray(payload)) {
    return payload.map(item =>
      item && typeof item === 'object'
        ? normalizeCoffeeBeanForFieldConfig(
            item as Partial<CoffeeBean>,
            settings
          )
        : item
    );
  }

  if (payload && typeof payload === 'object') {
    return normalizeCoffeeBeanForFieldConfig(
      payload as Partial<CoffeeBean>,
      settings
    );
  }

  return payload;
}
