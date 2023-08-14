import React from "react";
import Discourse from "discourse2";

const CHECK_NEWS_INTERVAL = 60_000 * 1; // 1 minute

const discourse = new Discourse("https://forums.kiri.art");

export default function useNews() {
  // console.log("useNews");

  const [news, setNews] = React.useState<
    Awaited<
      ReturnType<typeof discourse["listCategoryTopics"]>
    >["topic_list"]["topics"]
  >([]);
  const [lastRead, setLastRead] = React.useState(
    (function () {
      const str = localStorage.getItem("newsLastDismissed");
      return str ? parseInt(str) : null;
    })()
  );

  React.useEffect(() => {
    async function checkNews() {
      console.log("Checking forums for news");
      let result;
      try {
        result = await discourse.listCategoryTopics({ slug: "app", id: 17 });
      } catch (error) {
        console.log(error);
        return;
      }

      //console.log(result);

      const topics = result.topic_list.topics.filter((topic) => {
        const time = new Date(topic.created_at).getTime();
        console.log(topic);
        return (
          topic.posters[0].user_id === 1 &&
          topic.title.startsWith("[News]") &&
          // @ ts-expect-error: not mentioned in OpenAPI spec
          // topic.unread !== 0 &&
          (!lastRead || time > lastRead)
          // TODO, unread check.
        );
      });

      // console.log(topics);
      setNews(topics);
    }

    checkNews();
    const interval = setInterval(checkNews, CHECK_NEWS_INTERVAL);
    return () => clearInterval(interval);
  }, [lastRead]);

  const dismissNews = React.useCallback(function dismissNews() {
    const now = Date.now();
    localStorage.setItem("newsLastDismissed", now.toString());
    setLastRead(now);
  }, []);

  return [news, dismissNews] as const;
}
