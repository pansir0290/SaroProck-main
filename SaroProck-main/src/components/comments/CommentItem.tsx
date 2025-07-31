import type { CommentData } from "./CommentsWrapper";
import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import React, { useState } from "react";
import CommentForm from "./CommentForm";

// 头像代理函数
function proxyAvatar(url: string | undefined): string {
  if (!url)
    return "/avatar-placeholder.png";
  try {
    const urlObj = new URL(url);
    if (urlObj.hostname === "www.gravatar.com" || urlObj.hostname === "gravatar.com") {
      urlObj.hostname = "cravatar.cn";
      return urlObj.toString();
    }
    return url;
  }
  catch {
    return url;
  }
}

interface Props {
  comment: CommentData;
  onLike: (commentId: string) => void;
  onCommentAdded: () => void;
  displayMode: "full" | "compact";
}

const badgeMap: { [key: string]: string } = {
  "evesunmaple@outlook.com": "@",
};

const CommentItem: React.FC<Props> = ({ comment, onLike, onCommentAdded, displayMode }) => {
  const [showReplyForm, setShowReplyForm] = useState(false);
  if (displayMode === "compact") {
    return (
      <div className="comment-thread-compact relative" style={{ paddingLeft: `${comment.level * 1.5}rem` }}>
        {comment.level > 0 && (
          <div className="absolute left-[0.7rem] top-0 bottom-0 w-px bg-base-content/10"></div>
        )}

        <div className="flex gap-2 items-start relative">
          <div className="avatar w-6 h-6 shrink-0 mt-1">
            <div className="rounded-full">
              <img src={proxyAvatar(comment.avatar)} alt={comment.nickname} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs">
              <span className="font-semibold mr-2">{comment.nickname}</span>
              <span className="text-base-content/80" dangerouslySetInnerHTML={{ __html: comment.content.replace(/<p>(.*?)<\/p>/g, "$1") }}></span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="comment-thread relative" style={{ paddingLeft: `${comment.level > 0 ? 2 : 0}rem` }}>
      <div className="comment relative" data-comment-id={comment.id}>
        <div className="flex gap-4">
          <div className="avatar flex-shrink-0">
            <div className="w-10 h-10 rounded-full">
              <img src={proxyAvatar(comment.avatar)} alt={comment.nickname} className="w-full h-full object-cover" />
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              {comment.website
                ? (
                    <a href={comment.website} className="font-semibold text-primary hover:underline truncate" target="_blank" rel="noopener noreferrer">{comment.nickname}</a>
                  )
                : (
                    <span className="font-semibold truncate">{comment.nickname}</span>
                  )}
              {badgeMap[comment.email] && <div className="badge badge-primary badge-outline badge-xs">{badgeMap[comment.email]}</div>}
            </div>

            <div className="prose prose-sm max-w-none mb-3" dangerouslySetInnerHTML={{ __html: comment.content }}></div>

            <div className="flex justify-between items-center">
              <span className="text-xs text-base-content/60">{format(comment.createdAt, "yyyy年MM月dd日 HH:mm", { locale: zhCN })}</span>
              <div className="flex items-center gap-1">
                <button className="btn btn-ghost btn-xs gap-1" onClick={() => setShowReplyForm(!showReplyForm)}>
                  <i className="ri-reply-line"></i>
                  <span>{showReplyForm ? "取消回复" : "回复"}</span>
                </button>
                <button className={`btn btn-ghost btn-xs gap-1 ${comment.isLiked ? "text-error" : ""}`} onClick={() => onLike(comment.id)}>
                  <i className={comment.isLiked ? "ri-heart-fill" : "ri-heart-line"}></i>
                  <span>{comment.likes > 0 ? comment.likes : ""}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>

      {showReplyForm && (
        <div className="mt-4 pl-14">
          <CommentForm
            identifier={comment.identifier}
            commentType={comment.commentType}
            parentId={comment.id}
            onCommentAdded={onCommentAdded}
            sdkReady={true}
            displayMode="full"
            isReply={true}
            onCancelReply={() => setShowReplyForm(false)}
          />
        </div>
      )}
    </div>
  );
};

export default CommentItem;
