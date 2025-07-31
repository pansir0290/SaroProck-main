/* eslint-disable style/max-statements-per-line */
import type { APIRoute } from "astro";
import { remark } from "remark";
import strip from "strip-markdown";
import { getAllPostsWithShortLinks } from "@/lib/blog";

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

export const POST: APIRoute = async ({ request, site }) => {
  try {
    const body = await request.json() as SearchQuery;
    const { query, tags, categories } = body;

    // --- 查询参数校验 (无改动) ---
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
    const allPosts = await getAllPostsWithShortLinks(site);

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
          const { title, description, tags = [], categories = [] } = post.data;
          const { value: content } = await processor.process(post.body);
          const contentText = String(content);

          let matchScore = 0;
          const matchDetails = { title: false, categories: false, tags: false, content: false };

          for (const keyword of keywords) {
            if (title.toLowerCase().includes(keyword)) { matchScore += 100; matchDetails.title = true; }
            if (tags.some((t) => t.toLowerCase().includes(keyword))) { matchScore += 30; matchDetails.tags = true; }
            if (categories.some((c) => c.toLowerCase().includes(keyword))) { matchScore += 50; matchDetails.categories = true; }
            if (contentText.toLowerCase().includes(keyword)) { matchScore += 10; matchDetails.content = true; }
          }

          if (matchScore === 0)
            return null;

          let snippet = description || "";
          if (matchDetails.content) {
            const contentMatchIndex = contentText.toLowerCase().indexOf(keywords.find((k) => contentText.toLowerCase().includes(k)) || "");
            if (contentMatchIndex !== -1) {
              const startIndex = Math.max(0, contentMatchIndex - 50);
              snippet = `${(startIndex > 0 ? "..." : "") + contentText.substring(startIndex, startIndex + 100)}...`;
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
        }),
    );

    const filteredResults = searchResults
      .filter((r): r is SearchResult => r !== null)
      .sort((a, b) => b.matchScore - a.matchScore || a.title.localeCompare(b.title));

    const formattedResults = filteredResults.map(result => ({
      ...result,
      keywords,
    }));

    return new Response(JSON.stringify(formattedResults), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  }
  catch (error) {
    console.error("Error performing search:", error);
    return new Response(JSON.stringify({ error: "Failed to perform search" }), { status: 500 });
  }
};
