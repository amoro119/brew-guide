import { db } from '@/lib/core/db';
import type { BrewingNote } from '@/lib/core/config';
import {
  NOTE_IMAGE_COMPRESSION_OPTIONS,
  NOTE_IMAGE_MAX_SIZE_BYTES,
} from '@/lib/images/imageProcessing';
import {
  applyImageRecompressionResultToStats,
  createImageRecompressionStats,
  recompressStoredImage,
  type ImageRecompressionStats,
} from '@/lib/images/imageRecompression';
import {
  type BrewingNoteImageRecord,
  mergeBrewingNoteImages,
  mergeBrewingNotesWithImages,
  splitBrewingNoteImages,
  stripBrewingNoteImages,
} from './imageRecords';
import { shouldSkipDestructiveReplace } from '@/lib/core/safeReplace';

const hasImageFieldUpdate = (note: BrewingNote): boolean =>
  Object.prototype.hasOwnProperty.call(note, 'image') ||
  Object.prototype.hasOwnProperty.call(note, 'images');

const getRecordImages = (record: {
  image?: string;
  images?: string[];
}): string[] =>
  record.images?.length ? record.images : record.image ? [record.image] : [];

export type RecompressBrewingNoteImagesStats = ImageRecompressionStats;

const NOTE_IMAGE_RECOMPRESSION_PROFILE = {
  maxSizeBytes: NOTE_IMAGE_MAX_SIZE_BYTES,
  compression: NOTE_IMAGE_COMPRESSION_OPTIONS,
};

export async function recompressOversizedBrewingNoteImages(): Promise<RecompressBrewingNoteImagesStats> {
  const stats = createImageRecompressionStats();
  const noteIds = (await db.brewingNoteImages.toCollection().primaryKeys()).map(
    String
  );

  for (const noteId of noteIds) {
    const record = await db.brewingNoteImages.get(noteId);
    if (!record) continue;

    stats.scannedCount += 1;
    const images = getRecordImages(record);
    let changed = false;

    const nextImages: string[] = [];
    for (const image of images) {
      const result = await recompressStoredImage(
        image,
        NOTE_IMAGE_RECOMPRESSION_PROFILE
      );
      applyImageRecompressionResultToStats(stats, result);

      if (result.failed) {
        console.error('笔记图片补压失败:', { noteId, error: result.error });
      }

      changed ||= result.changed;
      nextImages.push(result.image);
    }

    if (!changed) continue;

    await db.brewingNoteImages.put({
      ...record,
      image: nextImages[0],
      images: nextImages,
      updatedAt: Date.now(),
    });
    await db.brewingNoteImageThumbnails.delete(record.noteId);
  }

  return stats;
}

export async function persistBrewingNoteImagesFromNote(
  note: BrewingNote,
  _options: { generateThumbnails?: boolean } = {}
): Promise<BrewingNote> {
  const { note: strippedNote, imageRecord } = splitBrewingNoteImages(note);

  if (!imageRecord && !hasImageFieldUpdate(note)) {
    return strippedNote;
  }

  if (imageRecord) {
    await db.brewingNoteImages.put(imageRecord);
    await db.brewingNoteImageThumbnails.delete(note.id);
  } else {
    await db.brewingNoteImages.delete(note.id);
    await db.brewingNoteImageThumbnails.delete(note.id);
  }

  return strippedNote;
}

export async function getBrewingNoteImageRecord(
  noteId: string
): Promise<BrewingNoteImageRecord | undefined> {
  return db.brewingNoteImages.get(noteId);
}

export async function getBrewingNoteImageNoteIds(
  noteIds?: string[]
): Promise<string[]> {
  if (!noteIds) {
    const keys = await db.brewingNoteImages.toCollection().primaryKeys();
    return keys.map(String);
  }

  const uniqueNoteIds = Array.from(new Set(noteIds.filter(Boolean)));
  if (uniqueNoteIds.length === 0) return [];

  const keys = await db.brewingNoteImages
    .where('noteId')
    .anyOf(uniqueNoteIds)
    .primaryKeys();
  return keys.map(String);
}

export async function getBrewingNoteImageCounts(
  noteIds: string[]
): Promise<Map<string, number>> {
  const uniqueNoteIds = Array.from(new Set(noteIds.filter(Boolean)));
  if (uniqueNoteIds.length === 0) return new Map();

  const records = await db.brewingNoteImages.bulkGet(uniqueNoteIds);
  const counts = new Map<string, number>();

  records.forEach(record => {
    if (!record) return;
    const count = getRecordImages(record).length;
    if (count > 0) counts.set(record.noteId, count);
  });

  return counts;
}

export async function getBrewingNoteImages(noteId: string): Promise<string[]> {
  const record = await getBrewingNoteImageRecord(noteId);
  return record ? getRecordImages(record) : [];
}

export async function mergeNoteWithStoredImages(
  note: BrewingNote
): Promise<BrewingNote> {
  return mergeBrewingNoteImages(note, await getBrewingNoteImageRecord(note.id));
}

export async function mergeNotesWithStoredImages(
  notes: BrewingNote[]
): Promise<BrewingNote[]> {
  const noteIds = notes.map(note => note.id).filter(Boolean);
  if (noteIds.length === 0) return notes;

  const imageRecords = await db.brewingNoteImages.bulkGet(noteIds);
  return mergeBrewingNotesWithImages(
    notes,
    imageRecords.filter(Boolean) as BrewingNoteImageRecord[]
  );
}

export async function exportBrewingNotesWithImages(): Promise<BrewingNote[]> {
  const [notes, imageRecords] = await Promise.all([
    db.brewingNotes.toArray(),
    db.brewingNoteImages.toArray(),
  ]);

  return mergeBrewingNotesWithImages(
    notes.map(stripBrewingNoteImages),
    imageRecords
  );
}

export async function replaceBrewingNotesWithSplitImages(
  notes: BrewingNote[],
  options: {
    allowEmptyReplace?: boolean;
    allowDestructiveReplace?: boolean;
  } = {}
): Promise<boolean> {
  const existingCount = await db.brewingNotes.count();
  if (
    shouldSkipDestructiveReplace({
      nextCount: notes.length,
      existingCount,
      allowEmptyReplace: options.allowEmptyReplace,
      allowDestructiveReplace: options.allowDestructiveReplace,
    })
  ) {
    console.warn('[BrewingNoteImage] 跳过笔记列表替换，避免误清空数据');
    return false;
  }

  const strippedNotes: BrewingNote[] = [];
  const imageRecords: BrewingNoteImageRecord[] = [];
  const explicitEmptyImageNoteIds: string[] = [];
  const incomingNoteIds = notes.map(note => note.id).filter(Boolean);

  for (const note of notes) {
    const split = splitBrewingNoteImages(note);
    strippedNotes.push(split.note);
    if (split.imageRecord) {
      imageRecords.push(split.imageRecord);
    } else if (hasImageFieldUpdate(note)) {
      explicitEmptyImageNoteIds.push(note.id);
    }
  }

  await db.transaction(
    'rw',
    db.brewingNotes,
    db.brewingNoteImages,
    db.brewingNoteImageThumbnails,
    async () => {
      const existingImageIds = (
        await db.brewingNoteImages.toCollection().primaryKeys()
      ).map(String);
      const incomingIdSet = new Set(incomingNoteIds);
      const staleImageIds = existingImageIds.filter(
        noteId => !incomingIdSet.has(noteId)
      );
      const imageIdsToDelete = Array.from(
        new Set([...staleImageIds, ...explicitEmptyImageNoteIds])
      );

      await db.brewingNotes.clear();

      if (strippedNotes.length > 0) {
        await db.brewingNotes.bulkPut(strippedNotes);
      }

      if (imageIdsToDelete.length > 0) {
        await db.brewingNoteImages.bulkDelete(imageIdsToDelete);
        await db.brewingNoteImageThumbnails.bulkDelete(imageIdsToDelete);
      }

      if (imageRecords.length > 0) {
        await db.brewingNoteImageThumbnails.bulkDelete(
          imageRecords.map(record => record.noteId)
        );
        await db.brewingNoteImages.bulkPut(imageRecords);
      }
    }
  );

  return true;
}
