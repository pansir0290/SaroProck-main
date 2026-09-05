import type { AstroGlobal } from "astro";
import type { ChannelInfo, TelegramPost } from "@/types";
import * as cheerio from "cheerio";
import { fetchTelegramHtml } from "./api";
import { parsePost } from "./parser";

function getEnv(Astro: any, name: string): string | undefined {
  return import.meta.env[name] ?? Astro.locals?.runtime?.env?.[name];
}

/**
 * 获取频道信息和动态列表（支持自动分页凑满指定数量）
 */
export async function getChannelFeed(
  Astro: AstroGlobal,
  options: { before?: string; after?: string; q?: string } = {},
): Promise<ChannelInfo> {
  const html = await fetchTelegramHtml(Astro, options);
  const $ = cheerio.load(html);
  const channel = getEnv(Astro, "CHANNEL")!;

  let posts: TelegramPost[] = [];

  // 解析第一轮数据
  $(".tgme_channel_history .tgme_widget_message_wrap").each((_, wrap) => {
    const postElement = $(wrap).find(".tgme_widget_message").get(0);
    if (postElement) {
      const parsed = parsePost(postElement, $, channel);
      if (parsed) posts.push(parsed);
    }
  });

  // 💡 目标条数设为 12 条
  const TARGET_COUNT = 12;
  let fetchRounds = 0;
  const MAX_ROUNDS = 2; // 最多向历史记录额外追查 2 轮，兼顾加载速度与安全

  // 如果解析出来的 Ins 卡片不足 12 条（且不处于搜索状态下），自动补全
  while (posts.length < TARGET_COUNT && fetchRounds < MAX_ROUNDS && !options.q) {
    fetchRounds++;

    // 拿到当前最旧一条帖子的 ID 作为向前追查的游标
    const oldestPostId = posts[0]?.id;
    if (!oldestPostId) break;

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

    // 如果追查不到新数据，直接跳出
    if (extraPosts.length === 0) break;

    // 拼接新旧数据并按 post.id 去重
    const combined = [...extraPosts, ...posts];
    const uniqueMap = new Map<string, TelegramPost>();
    combined.forEach((p) => uniqueMap.set(p.id, p));
    posts = Array.from(uniqueMap.values());
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

/**
 * 根据 ID 获取单条动态
 */
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
