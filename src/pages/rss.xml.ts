import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getChannelFeed } from "@/lib/telegram";

export async function GET(context: APIContext) {
  let posts: any[] = [];

  try {
    // 获取最新的 Telegram 频道动态
    const tgFeed = await getChannelFeed(context);
    posts = tgFeed?.posts || (Array.isArray(tgFeed) ? tgFeed : []);
  } catch (e) {
    console.error("生成 RSS 时获取 TG 动态失败:", e);
  }

  return rss({
    // 你的 RSS 站点标题与描述
    title: "潘聪的频道动态",
    description: "感谢你的停留至此，这里记录生活与技术的点点滴滴。",
    site: context.site || "https://www.34310889.xyz",
    
    // 将 TG 动态映射为 RSS 文章条目
    items: posts.map((post) => {
      const content = post.content || post.text || post.message || post.body || "";
      // 截取前 30 个字作为标题，如果没有文字则显示“图文动态”
      const rawTitle = content.trim().replace(/\n/g, " ");
      const title = rawTitle ? (rawTitle.length > 30 ? rawTitle.slice(0, 30) + "..." : rawTitle) : "图文动态";
      
      // 提取消息发布时间
      const pubDate = post.date ? new Date(post.date * 1000) : new Date();

      return {
        title: title,
        pubDate: pubDate,
        description: content,
        // 拼接每条动态在 Telegram 的具体 URL 或本地锚点链接
        link: post.link || post.url || `https://t.me/pansir029/${post.id || ''}`,
      };
    }),
    
    // 自定义 XML 语言
    customData: `<language>zh-cn</language>`,
  });
}
