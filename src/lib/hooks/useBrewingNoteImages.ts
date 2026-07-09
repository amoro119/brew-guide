'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  getBrewingNoteImageCounts,
  getBrewingNoteImageNoteIds,
  getBrewingNoteImages,
} from '@/lib/notes/imageRepository';
import { useImageLoadGate } from './useImageLoadGate';

const EMPTY_IMAGES: string[] = [];
const EMPTY_IMAGE_COUNTS = new Map<string, number>();

interface BrewingNoteImagesState {
  noteId: string | undefined;
  images: string[];
}

export function useBrewingNoteImageIds(noteIds: string[]): Set<string> {
  const [imageIds, setImageIds] = useState<Set<string>>(new Set());
  const idsKey = noteIds.join('\u0001');
  const imageNoteIds = useMemo(
    () => (idsKey ? idsKey.split('\u0001') : []),
    [idsKey]
  );

  useEffect(() => {
    let cancelled = false;

    getBrewingNoteImageNoteIds(imageNoteIds)
      .then(ids => {
        if (!cancelled) setImageIds(new Set(ids));
      })
      .catch(() => {
        if (!cancelled) setImageIds(new Set());
      });

    return () => {
      cancelled = true;
    };
  }, [imageNoteIds]);

  return imageIds;
}

export function useBrewingNoteImageCounts(
  noteIds: string[],
  versionKey = ''
): Map<string, number> {
  return useBrewingNoteImageCountsState(noteIds, versionKey).imageCounts;
}

export function useBrewingNoteImageCountsState(
  noteIds: string[],
  versionKey = ''
): { imageCounts: Map<string, number>; isLoaded: boolean } {
  const [state, setState] = useState<{
    imageCounts: Map<string, number>;
    isLoaded: boolean;
    requestKey: string;
  }>({
    imageCounts: new Map(),
    isLoaded: false,
    requestKey: '',
  });
  const idsKey = noteIds.join('\u0001');
  const requestKey = `${idsKey}\u0001${versionKey}`;
  const imageNoteIds = useMemo(
    () => (idsKey ? idsKey.split('\u0001') : []),
    [idsKey]
  );

  useEffect(() => {
    let cancelled = false;
    const uniqueNoteIds = Array.from(new Set(imageNoteIds.filter(Boolean)));

    if (uniqueNoteIds.length === 0) {
      Promise.resolve().then(() => {
        if (!cancelled) {
          setState({ imageCounts: new Map(), isLoaded: true, requestKey });
        }
      });

      return () => {
        cancelled = true;
      };
    }

    getBrewingNoteImageCounts(uniqueNoteIds)
      .then(counts => {
        if (!cancelled) {
          setState({ imageCounts: counts, isLoaded: true, requestKey });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setState({ imageCounts: new Map(), isLoaded: true, requestKey });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [imageNoteIds, requestKey]);

  return {
    imageCounts:
      state.requestKey === requestKey ? state.imageCounts : EMPTY_IMAGE_COUNTS,
    isLoaded: state.requestKey === requestKey && state.isLoaded,
  };
}

export function useBrewingNoteImages(
  noteId: string | undefined,
  fallback: string[] = EMPTY_IMAGES
): string[] {
  const [imageState, setImageState] = useState<BrewingNoteImagesState>({
    noteId,
    images: fallback,
  });

  useEffect(() => {
    let cancelled = false;

    if (!noteId) {
      return;
    }

    getBrewingNoteImages(noteId)
      .then(storedImages => {
        if (!cancelled)
          setImageState({
            noteId,
            images: storedImages.length > 0 ? storedImages : fallback,
          });
      })
      .catch(() => {
        if (!cancelled) setImageState({ noteId, images: fallback });
      });

    return () => {
      cancelled = true;
    };
  }, [noteId, fallback]);

  if (!noteId) {
    return fallback;
  }

  return imageState.noteId === noteId ? imageState.images : fallback;
}

export function useBrewingNoteImagesWhenVisible(
  noteId: string,
  fallback: string[] = EMPTY_IMAGES
): { ref: (node: HTMLElement | null) => void; images: string[] } {
  const { ref, shouldLoad } = useImageLoadGate();

  return {
    ref,
    images: useBrewingNoteImages(
      shouldLoad ? noteId : undefined,
      shouldLoad ? fallback : EMPTY_IMAGES
    ),
  };
}
