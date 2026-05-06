import { Icon } from "@iconify/react";
import PageTransition from "../components/PageTransition";
import techStackData from "../data/tech-stack.json";

export default function About() {
  return (
    <PageTransition>
      <div className="page-content">
        <div
          className="home-intro slide-enter"
          style={{ "--enter-stage": 1 } as React.CSSProperties}
        >
          <h1>Hacxy</h1>
          <p>前端开发者，热衷于开源、工具链和 Web 应用构建，记录学习与思考。</p>
        </div>

        <div
          className="slide-enter"
          style={{ "--enter-stage": 2 } as React.CSSProperties}
        >
          <p className="section-heading">技术栈</p>
          <div className="tech-stack">
            {techStackData.map((group) => (
              <div key={group.category} className="tech-group">
                <p className="section-heading">{group.category}</p>
                <ul className="tech-list">
                  {group.items.map((item) => (
                    <li key={item.name} className="tech-item">
                      <Icon
                        icon={item.icon}
                        width={18}
                        height={18}
                        style={"color" in item ? { color: item.color } : undefined}
                      />
                      <span>{item.name}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
