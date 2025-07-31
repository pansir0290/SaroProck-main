import { format } from "date-fns";
import { zhCN } from "date-fns/locale";
import React, { useCallback, useEffect, useState } from "react";

interface AdminComment {
  objectId: string;
  content: string;
  nickname: string;
  email: string;
  identifier: string; // slug or postId
  createdAt: string;
  commentType: "blog" | "telegram";
}

interface ApiResponse {
  comments: AdminComment[];
  total: number;
  page: number;
  limit: number;
}

const CommentsManager: React.FC = () => {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [commentType, setCommentType] = useState<"blog" | "telegram">("blog");

  const fetchAllComments = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch(`/api/comments?commentType=${commentType}&page=${page}&limit=20`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to fetch comments");
      }
      const result: ApiResponse = await response.json();
      setData(result);
    }
    catch (err: any) {
      setError(err.message);
    }
    finally {
      setLoading(false);
    }
  }, [page, commentType]);

  useEffect(() => {
    fetchAllComments();
  }, [fetchAllComments]);

  const handleDelete = async (commentId: string, type: "blog" | "telegram") => {
    if (!window.confirm("确定要永久删除这条评论及其所有回复吗?"))
      return;

    try {
      const response = await fetch("/api/comments", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, commentType: type }),
      });
      const result = await response.json();
      if (!result.success)
        throw new Error(result.message);
      alert("删除成功");
      if (data?.comments.length === 1 && page > 1) {
        setPage(page - 1);
      }
      else {
        fetchAllComments();
      }
    }
    catch (error: any) {
      alert(`删除失败: ${error.message}`);
    }
  };

  const totalPages = data ? Math.ceil(data.total / data.limit) : 0;

  const handleTabClick = (type: "blog" | "telegram") => {
    setCommentType(type);
    setPage(1); // 切换类型时重置到第一页
  };

  return (
    <div className="bg-base-200/40 backdrop-blur-sm rounded-xl p-4 border border-base-content/5">
      <h2 className="text-2xl font-bold mb-4">评论管理</h2>

      <div className="tabs tabs-boxed mb-4">
        <a className={`tab ${commentType === "blog" ? "tab-active" : ""}`} onClick={() => handleTabClick("blog")}>博客评论</a>
        <a className={`tab ${commentType === "telegram" ? "tab-active" : ""}`} onClick={() => handleTabClick("telegram")}>动态评论</a>
      </div>

      {loading && <div className="text-center p-12"><span className="loading loading-lg"></span></div>}
      {error && (
        <div className="alert alert-error">
          Error:
          {error}
        </div>
      )}

      {data && !loading && (
        <>
          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>作者</th>
                  <th className="w-2/5">内容</th>
                  <th>关联页面</th>
                  <th>时间</th>
                  <th>操作</th>
                </tr>
              </thead>
              <tbody>
                {data.comments.map(comment => (
                  <tr key={comment.objectId}>
                    <td>
                      <div className="font-bold">{comment.nickname}</div>
                      <div className="text-sm opacity-50 truncate">{comment.email}</div>
                    </td>
                    <td>
                      <div dangerouslySetInnerHTML={{ __html: comment.content }} className="prose prose-sm max-w-md whitespace-normal break-all" />
                    </td>
                    <td>
                      <a href={`/${comment.commentType === "telegram" ? "telegram" : "blog"}/${comment.identifier}`} target="_blank" rel="noopener noreferrer" className="link link-primary text-xs hover:underline">
                        {comment.identifier}
                      </a>
                    </td>
                    <td>{format(new Date(comment.createdAt), "yy-MM-dd HH:mm", { locale: zhCN })}</td>
                    <td>
                      <button
                        className="btn btn-ghost btn-xs text-error"
                        onClick={() => handleDelete(comment.objectId, comment.commentType)}
                      >
                        删除
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="btn-group mt-6 flex justify-center">
            <button className="btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>«</button>
            <button className="btn">
              第
              {page}
              {" "}
              /
              {totalPages}
              {" "}
              页
            </button>
            <button className="btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}>»</button>
          </div>
        </>
      )}
    </div>
  );
};

export default CommentsManager;
