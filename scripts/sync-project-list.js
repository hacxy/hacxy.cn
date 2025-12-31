import fs from "node:fs";
import { fileURLToPath } from "url";
import path from "path";

const repos = [
  "oh-my-live2d/oh-my-live2d",
  "hacxy/l2d",
  "hacxy/vitepress-theme-mild",
  "hacxy/utils",
  "hacxy/2048-cli-game",
];

const apiPrefix = "https://api.github.com/repos/";
function formatBeijingTime(utcString) {
  const date = new Date(utcString);

  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  })
    .format(date)
    .replace(/\//g, "-");
}

function formatData(originData) {
  const {
    name: title,
    description,
    html_url: repoUrl,
    stargazers_count: stars,
    topics: tags,
    forks,
    language,
    updated_at,
  } = originData;
  const lastUpdated = formatBeijingTime(updated_at);

  return {
    title,
    description,
    repoUrl,
    stars,
    tags,
    forks,
    language,
    lastUpdated,
  };
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectListJsonPath = path.resolve(
  __dirname,
  "../.vitepress/project-list.json",
);

const finalData = [];
for (const item of repos) {
  const result = await fetch(`${apiPrefix}${item}`).then((res) => res.json());
  const data = formatData(result);
  finalData.push(data);
}

fs.writeFileSync(projectListJsonPath, JSON.stringify(finalData), {
  encoding: "utf-8",
});
