// src/pages/api/like.ts
import type { APIContext } from "astro";
import AV from "leancloud-storage";
import { initLeanCloud } from "@/lib/leancloud.server";

// 初始化 LeanCloud (仅在服务器端)
initLeanCloud();

// LeanCloud Class 名称
const LIKES_STATS_CLASS = "PostLikes"; // 用于存储总点赞数
const LIKES_LOG_CLASS = "PostLikeLog"; // 用于记录谁点过赞

// --- GET: 获取帖子的初始点赞状态 ---
export async function GET({ request }: APIContext): Promise<Response> {
  const url = new URL(request.url);
  const postId = url.searchParams.get("postId");
  const deviceId = url.searchParams.get("deviceId");

  if (!postId || !deviceId) {
    return new Response(JSON.stringify({ error: "缺少 postId 或 deviceId" }), { status: 400 });
  }

  try {
    // 1. 获取总点赞数
    const statsQuery = new AV.Query(LIKES_STATS_CLASS);
    statsQuery.equalTo("postId", postId);
    const postStats = await statsQuery.first();
    const likeCount = postStats ? postStats.get("likes") || 0 : 0;

    // 2. 检查当前设备是否已点赞
    const logQuery = new AV.Query(LIKES_LOG_CLASS);
    logQuery.equalTo("postId", postId);
    logQuery.equalTo("deviceId", deviceId);
    const likeLog = await logQuery.first();
    const hasLiked = !!likeLog;

    return new Response(JSON.stringify({ likeCount, hasLiked }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  catch (error) {
    console.error("Error fetching like status:", error);
    return new Response(JSON.stringify({ error: "服务器内部错误" }), { status: 500 });
  }
}

// --- POST: 切换帖子的点赞状态 ---
export async function POST({ request }: APIContext): Promise<Response> {
  try {
    const { postId, deviceId } = await request.json();

    if (!postId || !deviceId) {
      return new Response(JSON.stringify({ success: false, message: "缺少 postId 或 deviceId" }), { status: 400 });
    }

    // 1. 查找点赞记录
    const logQuery = new AV.Query(LIKES_LOG_CLASS);
    logQuery.equalTo("postId", postId);
    logQuery.equalTo("deviceId", deviceId);
    const likeLog = await logQuery.first();

    const newLikedState = !likeLog; // 如果记录不存在，则新的状态是“已点赞”

    // 2. 准备点赞统计对象
    const statsQuery = new AV.Query(LIKES_STATS_CLASS);
    statsQuery.equalTo("postId", postId);
    let postStats = await statsQuery.first();

    // 如果统计对象不存在，且是点赞操作，则创建一个
    if (!postStats && newLikedState) {
      const PostLikes = AV.Object.extend(LIKES_STATS_CLASS);
      postStats = new PostLikes();
      postStats.set("postId", postId);
      postStats.set("likes", 0);
    }

    // 3. 更新点赞记录和统计
    if (newLikedState) {
      // 点赞
      const LikeLog = AV.Object.extend(LIKES_LOG_CLASS);
      const newLog = new LikeLog();
      newLog.set("postId", postId);
      newLog.set("deviceId", deviceId);
      await newLog.save();

      // 统计+1
      (postStats as AV.Object)?.increment("likes", 1);
    }
    else {
      // 取消点赞
      await likeLog?.destroy();
      // 统计-1
      (postStats as AV.Object)?.increment("likes", -1);
    }

    const savedStats = await postStats?.save();
    const finalLikeCount = savedStats ? savedStats.get("likes") : 0;

    return new Response(JSON.stringify({
      success: true,
      likeCount: finalLikeCount,
      hasLiked: newLikedState,
    }), { status: 200 });
  }
  catch (error) {
    console.error("Error toggling like:", error);
    return new Response(JSON.stringify({ success: false, message: "服务器内部错误" }), { status: 500 });
  }
}
