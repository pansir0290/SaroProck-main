// src/lib/blog.ts
import { type CollectionEntry, getCollection } from "astro:content";
import { getShortLink } from "./shortlink";

// 导出完整的文章数据类型，包含短链接
export type ProcessedBlogEntry = CollectionEntry<"blog"> & {
  shortLink: string | null; // 每篇文章都会有一个短链接或 null
  longUrl: string; // 原始的、完整的 URL
};

/**
 * 获取所有博客文章，并为每一篇生成短链接。
 * 移除了单例内存缓存，确保 SSR/API 每次调用时能读取到最新的全量 Content Collection 集合。
 * @param siteUrl - 网站的根 URL，用于生成长链接
 */
export async function getAllPostsWithShortLinks(siteUrl: URL): Promise<ProcessedBlogEntry[]> {
  // 全量获取所有文章（不过滤草稿，防止遗漏早期文章）
  const allPosts = await getCollection("blog");

  const postsWithLinks = await Promise.all(
    allPosts.map(async (post) => {
      let longUrl = `/blog/${post.slug}`;
      try {
        longUrl = new URL(`/blog/${post.slug}`, siteUrl).toString();
      } catch {
        // 防止 siteUrl 为空或格式问题导致解析失败
      }

      let shortLink: string | null = null;
      try {
        shortLink = await getShortLink({
          longUrl,
          slug: post.slug,
        });
      } catch {
        shortLink = null;
      }

      return {
        ...post,
        longUrl,
        shortLink,
      };
    }),
  );

  // 排序：按发布日期倒序；如果某些旧文章没有 pubDate，兜底使用 0 处理，防止排序报错
  return postsWithLinks.sort((a, b) => {
    const timeA = a.data.pubDate ? new Date(a.data.pubDate).getTime() : 0;
    const timeB = b.data.pubDate ? new Date(b.data.pubDate).getTime() : 0;
    return timeB - timeA;
  });
}
