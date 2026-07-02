import { recompressOversizedCoffeeBeanImages } from '@/lib/coffee-beans/imageRepository';
import {
  mergeImageRecompressionStats,
  type ImageRecompressionStats,
} from '@/lib/images/imageRecompression';
import { recompressOversizedBrewingNoteImages } from '@/lib/notes/imageRepository';
import { recompressOversizedRoasterLogos } from '@/lib/settings/roasterLogoRecompression';

export interface RecompressAppImagesStats extends ImageRecompressionStats {
  scopes: {
    brewingNotes: ImageRecompressionStats;
    coffeeBeans: ImageRecompressionStats;
    roasterLogos: ImageRecompressionStats;
  };
}

export async function recompressOversizedAppImages(): Promise<RecompressAppImagesStats> {
  const brewingNotes = await recompressOversizedBrewingNoteImages();
  const coffeeBeans = await recompressOversizedCoffeeBeanImages();
  const roasterLogos = await recompressOversizedRoasterLogos();
  const total = mergeImageRecompressionStats([
    brewingNotes,
    coffeeBeans,
    roasterLogos,
  ]);

  return {
    ...total,
    scopes: {
      brewingNotes,
      coffeeBeans,
      roasterLogos,
    },
  };
}
