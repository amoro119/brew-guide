import { Preferences } from '@capacitor/preferences';
import { APP_VERSION } from '@/lib/core/config';

const DIRECT_LEGACY_PREFERENCE_KEYS = [
  'coffeeBeans',
  'brewingNotes',
  'customEquipments',
  'customMethods',
  'grinders',
  'brewGuideSettings',
  'brewingNotesVersion',
  'equipmentOrder',
  'onboardingCompleted',
  'backupReminderSettings',
  'roasterConfigs',
] as const;

const LEGACY_PREFERENCE_KEY_PREFIXES = [
  'customMethods_',
  'brew-guide:custom-presets:',
] as const;

const MAX_PARSE_CHARS = 2_000_000;

type LegacyPreferenceParsedSummary =
  | {
      status: 'parsed';
      type: 'array';
      itemCount: number;
    }
  | {
      status: 'parsed';
      type: 'object';
      fieldCount: number;
    }
  | {
      status: 'parsed';
      type: 'string' | 'number' | 'boolean' | 'null';
    }
  | {
      status: 'skipped-large-value';
      maxParseChars: number;
    }
  | {
      status: 'invalid-json';
      error: string;
    };

export interface LegacyPreferenceEntry {
  key: string;
  rawValue: string;
  charLength: number;
  byteLength: number;
  byteLengthApproximate: boolean;
  parsedSummary: LegacyPreferenceParsedSummary;
}

export interface LegacyPreferencesSnapshot {
  source: 'capacitor-preferences';
  exportedAt: string;
  scannedKeys: string[];
  matchedKeys: string[];
  entries: Record<string, LegacyPreferenceEntry>;
}

interface LegacyPreferencesRescueExportData {
  exportDate: string;
  appVersion: string;
  timeZone: string;
  data: {
    legacyPreferences: LegacyPreferencesSnapshot;
  };
}

const formatDateWithTimezone = (date: Date): string => {
  const pad = (num: number) => num.toString().padStart(2, '0');
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const offsetHours = pad(Math.floor(Math.abs(offset) / 60));
  const offsetMinutes = pad(Math.abs(offset) % 60);

  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}.${date.getMilliseconds().toString().padStart(3, '0')}${sign}${offsetHours}:${offsetMinutes}`;
};

const matchesLegacyPreferenceKey = (key: string): boolean =>
  (DIRECT_LEGACY_PREFERENCE_KEYS as readonly string[]).includes(key) ||
  LEGACY_PREFERENCE_KEY_PREFIXES.some(prefix => key.startsWith(prefix));

const getByteLength = (value: string): number => {
  if (value.length > MAX_PARSE_CHARS) {
    return value.length;
  }

  if (typeof TextEncoder === 'undefined') {
    return value.length;
  }

  return new TextEncoder().encode(value).length;
};

const getParsedSummary = (value: string): LegacyPreferenceParsedSummary => {
  if (value.length > MAX_PARSE_CHARS) {
    return {
      status: 'skipped-large-value',
      maxParseChars: MAX_PARSE_CHARS,
    };
  }

  try {
    const parsed = JSON.parse(value) as unknown;

    if (Array.isArray(parsed)) {
      return {
        status: 'parsed',
        type: 'array',
        itemCount: parsed.length,
      };
    }

    if (parsed === null) {
      return {
        status: 'parsed',
        type: 'null',
      };
    }

    if (typeof parsed === 'object') {
      return {
        status: 'parsed',
        type: 'object',
        fieldCount: Object.keys(parsed).length,
      };
    }

    if (typeof parsed === 'string') {
      return {
        status: 'parsed',
        type: 'string',
      };
    }

    if (typeof parsed === 'number') {
      return {
        status: 'parsed',
        type: 'number',
      };
    }

    if (typeof parsed === 'boolean') {
      return {
        status: 'parsed',
        type: 'boolean',
      };
    }

    return {
      status: 'invalid-json',
      error: 'Unsupported JSON value',
    };
  } catch (error) {
    return {
      status: 'invalid-json',
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

const createEntry = (key: string, rawValue: string): LegacyPreferenceEntry => ({
  key,
  rawValue,
  charLength: rawValue.length,
  byteLength: getByteLength(rawValue),
  byteLengthApproximate: rawValue.length > MAX_PARSE_CHARS,
  parsedSummary: getParsedSummary(rawValue),
});

export async function collectLegacyPreferencesSnapshot(): Promise<LegacyPreferencesSnapshot> {
  const { keys } = await Preferences.keys();
  const matchedKeys = keys.filter(matchesLegacyPreferenceKey).sort();
  const entries: Record<string, LegacyPreferenceEntry> = {};

  for (const key of matchedKeys) {
    const { value } = await Preferences.get({ key });
    if (value === null) continue;

    entries[key] = createEntry(key, value);
  }

  return {
    source: 'capacitor-preferences',
    exportedAt: formatDateWithTimezone(new Date()),
    scannedKeys: keys,
    matchedKeys: Object.keys(entries),
    entries,
  };
}

export async function exportLegacyPreferencesRescueData(): Promise<string> {
  const exportData: LegacyPreferencesRescueExportData = {
    exportDate: formatDateWithTimezone(new Date()),
    appVersion: APP_VERSION,
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    data: {
      legacyPreferences: await collectLegacyPreferencesSnapshot(),
    },
  };

  return JSON.stringify(exportData);
}
