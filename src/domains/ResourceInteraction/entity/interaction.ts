export interface ResourceInteractionRecord {
  liked: boolean;
  score: number;
  likedCommentIds: ReadonlySet<string>;
}
