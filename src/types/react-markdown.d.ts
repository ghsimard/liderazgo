declare module "react-markdown" {
  import { FC, ReactNode } from "react";
  interface ReactMarkdownProps {
    children: string;
    remarkPlugins?: any[];
    components?: Record<string, FC<any>>;
    [key: string]: any;
  }
  const ReactMarkdown: FC<ReactMarkdownProps>;
  export default ReactMarkdown;
}

declare module "remark-gfm" {
  const remarkGfm: any;
  export default remarkGfm;
}
