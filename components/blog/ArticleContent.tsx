import { ReactNode } from "react";

type ArticleContentProps = {
  children: ReactNode;
};

export function ArticleContent({ children }: ArticleContentProps) {
  return <div className="article-content">{children}</div>;
}