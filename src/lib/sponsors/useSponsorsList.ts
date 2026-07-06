'use client';

import { useEffect, useState } from 'react';
import { API_CONFIG } from '@/lib/api/shared/config';
import { Storage } from '@/lib/core/storage';
import { sponsorsList as fallbackSponsorsList } from '@/lib/core/config';

const SPONSORS_CACHE_KEY = 'remoteSponsorsList';

interface CachedSponsorsList {
  names: string[];
}

interface RemoteSponsorsResponse {
  success?: boolean;
  names?: unknown;
}

const normalizeSponsorsList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];

  const names = value
    .filter((item): item is string => typeof item === 'string')
    .map(item => item.trim())
    .filter(Boolean);

  return Array.from(new Set(names));
};

const readCachedSponsorsList = async (): Promise<string[] | null> => {
  try {
    const raw = await Storage.get(SPONSORS_CACHE_KEY);
    if (!raw) return null;

    const cached = JSON.parse(raw) as CachedSponsorsList;
    const names = normalizeSponsorsList(cached.names);
    return names.length > 0 ? names : null;
  } catch {
    return null;
  }
};

const saveCachedSponsorsList = async (names: string[]): Promise<void> => {
  try {
    await Storage.set(
      SPONSORS_CACHE_KEY,
      JSON.stringify({
        names,
        cachedAt: new Date().toISOString(),
      })
    );
  } catch {
    // Remote sponsor names are cosmetic; cache failures should not affect settings.
  }
};

const fetchSponsorsList = async (): Promise<CachedSponsorsList | null> => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/api/sponsors`, {
      headers: { Accept: 'application/json' },
      cache: 'no-cache',
    });

    if (!response.ok) return null;

    const data = (await response.json()) as RemoteSponsorsResponse;
    const names = normalizeSponsorsList(data.names);
    if (names.length === 0) return null;

    return {
      names,
    };
  } catch {
    return null;
  }
};

export function useSponsorsList(): string[] {
  const [names, setNames] = useState<string[]>(fallbackSponsorsList);

  useEffect(() => {
    let isActive = true;

    const refresh = async () => {
      const cachedNames = await readCachedSponsorsList();
      if (isActive && cachedNames) {
        setNames(cachedNames);
      }

      const remoteList = await fetchSponsorsList();
      if (!isActive || !remoteList) return;

      setNames(remoteList.names);
      await saveCachedSponsorsList(remoteList.names);
    };

    refresh();

    return () => {
      isActive = false;
    };
  }, []);

  return names;
}
