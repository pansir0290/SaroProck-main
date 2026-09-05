import type { AstroGlobal } from "astro";
import type { ChannelInfo, TelegramPost } from "@/types";
import * as cheerio from "cheerio";
import { fetchTelegramHtml } from "./api";
import { parsePost } from "./parser";

function getEnv(Astro: any, name: string): string | undefined {
  return import.meta.env[name] ?? Astro.locals?.runtime?.env?.[name];
}

export async function getChannelFeed(
  Astro: AstroGlobal,
  options: { before?: string; after?: string; q?: string } = {},
): Promise<ChannelInfo> {
  const html = await fetchTelegramHtml(Astro, options);
  const $ = cheerio.load(html);
  const channel = getEnv(Astro, "CHANNEL")!;

  let posts: TelegramPost[] = [];

  $(".tgme_channel_history .tgme_widget_message_wrap").each((_, wrap) => {
    const postElement = $(wrap).find(".tgme_widget_message").get(0);
    if (postElement) {
      const parsed = parsePost(postElement, $, channel);
      if (parsed) posts.push(parsed);
    }
  });

  // 💡 重点改进：如果当前获取到的 Ins 卡片少于 8 条（且不在搜索状态下）
  // 自动用最旧一条帖子的 ID 向 Telegram 多拿一次上一页的历史数据凑数
  const TARGET_COUNT = 8; // 你希望首页最少展示的卡片数量
  if (posts.length < TARGET_COUNT && !options.q) {
    const oldestPostId = posts[0]?.id;
    if (oldestPostId) {
      const extraHtml = await fetchTelegramHtml(Astro, {
        ...options,
        before: oldestPostId,
      });
      const $extra = cheerio.load(extraHtml);
      const extraPosts: TelegramPost[] = [];

      $extra(".tgme_channel_history .tgme_widget_message_wrap").each((_, wrap) => {
        const postElement = $extra(wrap).find(".tgme_widget_message").get(0);
        if (postElement) {
          const parsed = parsePost(postElement, $extra, channel);
          if (parsed) extraPosts.push(parsed);
        }
      });

      // 拼接并去重
      const combined = [...extraPosts, ...posts];
      const uniqueMap = new Map();
      combined.forEach((p) => uniqueMap.set(p.id, p));
      posts = Array.from(uniqueMap.values());
    }
  }

  return {
    title: $(".tgme_channel_info_header_title")?.text() || "Telegram Channel",
    description: $(".tgme_channel_info_description")?.text() || "",
    avatar: $(".tgme_page_photo_image img")?.attr("src") || "",
    subscribers: Number.parseInt($(".tgme_channel_info_counter .counter_value").eq(0).text().replace(/\s/g, ""), 10) || null,
    photos: Number.parseInt($(".tgme_channel_info_counter .counter_value").eq(1).text().replace(/\s/g, ""), 10) || null,
    posts: posts.reverse(),
  };
}

export async function getPostById(
  Astro: AstroGlobal,
  id: string,
): Promise<TelegramPost | null> {
  const html = await fetchTelegramHtml(Astro, { id });
  const $ = cheerio.load(html);
  const channel = getEnv(Astro, "CHANNEL")!;

  const postElement = $(".tgme_widget_message").get(0);
  if (!postElement)
    return null;

  return parsePost(postElement, $, channel);
}
