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

    // 2. 通过 Telegram SDK/接口获取动态（传入搜索关键词 q，让后端/Telegram也预筛选一次）
    let tgPosts: any[] = [];
    try {
      const feedResult = await getChannelFeed(context, { q: query.trim() });
      tgPosts = feedResult?.posts || [];
    } catch (e) {
      console.error("Failed to fetch telegram feed for search:", e);
    }

    // 格式化 Telegram 动态为统一的数据格式
    const formattedTgPosts = tgPosts.map((post) => {
      // 提炼正文作为文本内容，并抓取前30字作为标题
      const contentStr = post.content || post.text || post.body || "";
      const cleanText = contentStr.replace(/^[#\s]+/gm, "").trim();
      const firstLine = cleanText.split("\n")[0] || "TG 动态";
      const title = firstLine.length > 30 ? `${firstLine.slice(0, 30)}...` : firstLine;

      // 动态链接拼接到首页锚点或具体的动态路径
      const targetUrl = post.id ? `/?before=${Number(post.id) + 1}#${post.id}` : "/";

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
