import type { CommentData } from "./CommentsWrapper";
import React from "react";
import CommentItem from "./CommentItem";

interface Props {
  comments: CommentData[];
  onLike: (commentId: string) => void;
  onCommentAdded: () => void;
  displayMode: "full" | "compact";
  isLoading: boolean;
}

const CommentList: React.FC<Props> = ({ comments, onLike, onCommentAdded, displayMode, isLoading }) => {
  if (isLoading && displayMode === "compact") {
    return null;
  }

  if (comments.length === 0) {
    if (displayMode === "full") {
      return <p className="text-center text-base-content/70 my-24">还没有评论，快来抢占沙发吧！</p>;
    }
    else {
      return null;
    }
  }

  return (
    <div className={`space-y-2 ${displayMode === "full" ? "mt-8" : "mt-4"}`}>
      {comments.map(comment => (
        <CommentItem
          key={comment.id}
          comment={comment}
          onLike={onLike}
          onCommentAdded={onCommentAdded}
          displayMode={displayMode}
        />
      ))}
    </div>
  );
};

export default CommentList;
