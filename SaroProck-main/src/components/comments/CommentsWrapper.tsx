// src/components/comments/CommentsWrapper.tsx
import React, { useCallback, useEffect, useState } from "react";
import CommentForm from "./CommentForm";
import CommentList from "./CommentList";

// 接口定义保持不变
export interface CommentData {
  id: string;
  nickname: string;
  email: string;
  website?: string;
  content: string;
  createdAt: Date;
  avatar: string;
  likes: number;
  isLiked: boolean;
  parent?: { objectId: string };
  parentId?: string;
  level: number;
  commentType: "blog" | "telegram";
  identifier: string;
  isAdmin?: boolean;
}

interface Props {
  identifier: string;
  commentType: "telegram" | "blog";
  displayMode?: "full" | "compact";
}

// 获取或生成一个唯一的设备ID，用于点赞身份识别
const getDeviceId = (): string => {
  const key = "comment_device_id";
  let deviceId = localStorage.getItem(key);
  if (!deviceId) {
    deviceId = crypto.randomUUID();
    localStorage.setItem(key, deviceId);
  }
  return deviceId;
};

const CommentsWrapper: React.FC<Props> = ({ identifier, commentType, displayMode = "full" }) => {
  const [comments, setComments] = useState<CommentData[]>([]);
  const [loading, setLoading] = useState(true);
  const [deviceId, setDeviceId] = useState<string | null>(null);

  // 在组件挂载时获取设备ID
  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  const fetchComments = useCallback(async () => {
    if (!deviceId)
      return; // 确保在有 deviceId 后再获取评论
    setLoading(true);
    try {
      const url = `/api/comments?identifier=${encodeURIComponent(identifier)}&commentType=${commentType}&deviceId=${deviceId}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error("Failed to fetch comments");

      const results = await response.json();

      const commentMap = new Map<string, CommentData & { children: CommentData[] }>();

      results.forEach((c: any) => {
        const commentId = c.id || c.objectId; // 兼容
        commentMap.set(commentId, {
          id: commentId,
          nickname: c.nickname,
          email: c.email,
          website: c.website,
          content: c.content,
          createdAt: new Date(c.createdAt),
          avatar: c.avatar,
          likes: c.likes || 0,
          isLiked: c.isLiked || false,
          parentId: c.parent?.objectId,
          level: 0,
          children: [],
          commentType,
          identifier,
          isAdmin: c.isAdmin || false,
        });
      });

      const rootComments: (CommentData & { children: CommentData[] })[] = [];
      commentMap.forEach((comment) => {
        if (comment.parentId && commentMap.has(comment.parentId)) {
          const parent = commentMap.get(comment.parentId)!;
          comment.level = parent.level + 1;
          parent.children.push(comment);
        }
        else {
          rootComments.push(comment);
        }
      });

      const flattenedComments: CommentData[] = [];
      function flatten(comment: CommentData & { children: CommentData[] }) {
        const { children, ...rest } = comment;
        flattenedComments.push(rest);
        children.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
        children.forEach(flatten);
      }
      rootComments.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime()).forEach(flatten);

      setComments(flattenedComments);
    }
    catch (error) {
      console.error("Error fetching comments:", error);
    }
    finally {
      setLoading(false);
    }
  }, [identifier, commentType, deviceId]);

  useEffect(() => {
    if (deviceId) { // 确保 deviceId 存在时才执行
      fetchComments();
    }
  }, [deviceId, fetchComments]);

  const handleCommentAdded = useCallback(() => {
    setTimeout(() => {
      fetchComments();
    }, 500);
  }, [fetchComments]);

  const handleLike = useCallback(async (commentId: string) => {
    if (!deviceId)
      return;

    // 1. 乐观更新 UI，提供即时反馈
    setComments(prevComments =>
      prevComments.map((c) => {
        if (c.id === commentId) {
          const isLiked = !c.isLiked;
          const likes = c.likes + (isLiked ? 1 : -1);
          return { ...c, isLiked, likes };
        }
        return c;
      }),
    );

    // 2. 调用后端 API
    try {
      const response = await fetch("/api/comments/like", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          commentId,
          commentType,
          deviceId,
        }),
      });

      if (!response.ok) {
        // 如果 API 调用失败，则撤销乐观更新
        throw new Error("Like operation failed");
      }

      // 可选：使用从服务器返回的最终数据更新状态，以确保同步
      const result = await response.json();
      if (result.success) {
        setComments(prevComments =>
          prevComments.map((c) => {
            if (c.id === commentId) {
              return { ...c, likes: result.likes, isLiked: result.isLiked };
            }
            return c;
          }),
        );
      }
    }
    catch (error) {
      console.error("Error liking comment:", error);
      // 如果出错，重新获取评论列表以恢复到真实状态
      fetchComments();
    }
  }, [deviceId, commentType, fetchComments]);

  return (
    <div className="not-prose">
      {displayMode === "full" && (
        <>
          <h2 className="text-2xl font-bold mb-8 flex items-center gap-2">
            <i className="ri-chat-3-line"></i>
            评论区
          </h2>
          <div className="divider -mt-2 mb-6"></div>
        </>
      )}
      <CommentForm
        identifier={identifier}
        commentType={commentType}
        onCommentAdded={handleCommentAdded}
        displayMode={displayMode}
        loading={loading}
      />
      <CommentList
        comments={comments}
        onLike={handleLike}
        onCommentAdded={handleCommentAdded}
        displayMode={displayMode}
        isLoading={loading}
      />

      {displayMode === "full" && (
        <div className="mt-6 text-sm text-right">
          本评论区由
          {" "}
          <a href="https://github.com/EveSunMaple" className="text-primary" target="_blank" rel="noopener noreferrer"> EveSunMaple </a>
          {" "}
          自主开发
        </div>
      )}
    </div>
  );
};

export default CommentsWrapper;
