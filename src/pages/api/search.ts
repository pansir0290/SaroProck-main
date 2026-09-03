/* eslint-disable style/max-statements-per-line */
import type { APIRoute } from "astro";
import { remark } from "remark";
import strip from "strip-markdown";
import { getAllPostsWithShortLinks } from "@/lib/blog";
import { getChannelFeed } from "@/lib/telegram";

interface SearchQuery {
  query: string;
  tags?: string[];
  categories?: string[];
}

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  tags: string[];
  categories: string[];
  matchScore: number;
  matchDetails: {
    title: boolean;
    categories: boolean;
    tags: boolean;
    content: boolean;
  };
}

export const POST: APIRoute = async (context) => {
  const { request, site } = context;
  try {
    const body = (await request.json()) as SearchQuery;
    const { query, tags, categories } = body;

    // --- 查询参数校验 ---
    if (!query || typeof query !== "string" || query.length < 2) {
      return new Response(JSON.stringify({ error: "Invalid search query." }), { status: 400 });
    }
    const keywords = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
    if (keywords.length === 0) {
      return new Response(JSON.stringify({ error: "No valid keywords." }), { status: 400 });
    }

    if (!site) {
      throw new Error("A `site` property is required in your astro.config.mjs for this API route to work.");
    }

    // 1. 获取常规博客文章
    const blogPosts = await getAllPostsWithShortLinks(site);

    // 2. 获取 Telegram 动态数据 (同时试探带 q 和不带 q 的调用，防止后端接口不支持 q 参数导致返回空数组)
    let rawPosts: any[] = [];
    try {
      // 优先直接获取最新的动态列表
      const feedResult = await getChannelFeed(context, {});
      rawPosts = feedResult?.posts || (Array.isArray(feedResult) ? feedResult : []);
    } catch (e) {
      console.error("[Search Debug] getChannelFeed Error:", e);
    }

    // 打印调试日志（可以在终端/控制台看到拉取到了多少条 TG 动态）
    console.log(`[Search Debug] 成功获取到的 TG 动态数量: ${rawPosts.length}`);
    if (rawPosts.length > 0) {
      console.log("[Search Debug] 第一条动态数据结构示例:", JSON.stringify(rawPosts[0]));
    }

    // 格式化 Telegram 动态：全方位兼容不同字段名
    const formattedTgPosts = rawPosts.map((post) => {
      // 兼容可能存放正文的各种字段
      const rawContent = 
        post.content || 
        post.text || 
        post.caption || 
        post.message || 
        post.body || 
        (typeof post === "string" ? post : "");

      const contentStr = String(rawContent);
      const cleanText = contentStr.replace(/^[#\s]+/gm, "").trim();
      
      // 提取标题
      const firstLine = cleanText.split("\n")[0] || "TG 动态";
      const title = firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;

      // 锚点或网页链接
      const targetUrl = post.id ? `/#${post.id}` : "/";

      return {
        data: {
          title,
          description: cleanText.slice(0, 100),
          tags: post.tags || ["动态"],
          categories: ["Telegram"],
        },
        body: contentStr,
        shortLink: targetUrl,
        longUrl: targetUrl,
      };
    });

    // 3. 合并 博客文章 + TG 动态
    const allPosts = [...blogPosts, ...formattedTgPosts];

    const processor = remark().use(strip);

    const searchResults = await Promise.all(
      allPosts
        .filter((entry) => {
          const entryTags = entry.data.tags || [];
          const entryCategories = entry.data.categories || [];
          if (tags?.length && !tags.some((tag) => entryTags.includes(tag)))
            return false;
          if (categories?.length && !categories.some((cat) => entryCategories.includes(cat)))
            return false;
          return true;
        })
        .map(async (post) => {
          const { title = "", description = "", tags = [], categories = [] } = post.data;
          
          let contentText = "";
          try {
            const { value: content } = await processor.process(post.body);
            contentText = String(content);
          } catch {
            contentText = post.body || "";
          }

          let matchScore = 0;
          const matchDetails = { title: false, categories: false, tags: false, content: false };

          for (const keyword of keywords) {
            if (title.toLowerCase().includes(keyword)) {
              matchScore += 100;
              matchDetails.title = true;
            }
            if (tags.some((t: string) => t.toLowerCase().includes(keyword))) {
              matchScore += 30;
              matchDetails.tags = true;
            }
            if (categories.some((c: string) => c.toLowerCase().includes(keyword))) {
              matchScore += 50;
              matchDetails.categories = true;
            }
            if (contentText.toLowerCase().includes(keyword)) {
              matchScore += 10;
              matchDetails.content = true;
            }
          }

          if (matchScore === 0) return null;

          let snippet = description || "";
          if (matchDetails.content || !snippet) {
            const contentMatchIndex = contentText
              .toLowerCase()
              .indexOf(keywords.find((k) => contentText.toLowerCase().includes(k)) || "");
            if (contentMatchIndex !== -1) {
              const startIndex = Math.max(0, contentMatchIndex - 50);
              snippet = `${startIndex > 0 ? "..." : ""}${contentText.substring(
                startIndex,
                startIndex + 100
              )}...`;
            } else if (!snippet) {
              snippet = `${contentText.substring(0, 100)}...`;
            }
          }

          return {
            title,
            url: post.shortLink || post.longUrl,
            snippet,
            tags,
            categories,
            matchScore,
            matchDetails,
          } as SearchResult;
        })
    );

    const filteredResults = searchResults
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title));

    const formattedResults = filteredResults.map((result) => ({
      ...result,
      keywords,
    }));

    return new Response(JSON.stringify(formattedResults), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error performing search:", error);
    return new Response(JSON.stringify({ error: "Failed to perform search" }), { status: 500 });
  }
};
