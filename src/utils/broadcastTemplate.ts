/**
 * Rich media broadcast template builder for Linda Bot (Point 63).
 */
export type BroadcastMediaType = 'brochure_pdf' | 'floorplan_image' | 'video_tour';

export function buildBroadcastTemplate(input: {
  title: string;
  mediaType: BroadcastMediaType;
  mediaUrl: string;
  caption: string;
}) {
  return {
    header: input.title.trim(),
    mediaType: input.mediaType,
    mediaUrl: input.mediaUrl.trim(),
    caption: input.caption.trim(),
  };
}
