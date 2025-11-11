export interface IntentCommentPayload {
  postId: string,
  thumbUrl: string,
  title: string,
  postAuthorId: string,
  text: string,
  timestamp: number,
  commentAuthorName: string,
  commentAuthorId: string,
  commentId: string,
  commentUniqueId: string,
  replied: boolean,
  replyAuthorId: string,
}
