import { PropsWithChildren } from "react";
import { ScrollViewStyleReset } from "expo-router/html";

export default function RootHtml({ children }: PropsWithChildren) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, viewport-fit=cover"
        />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:wght@500;600;700&family=Jost:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <style
          dangerouslySetInnerHTML={{
            __html: `
              html, body {
                margin: 0;
                padding: 0;
                background: #08141a;
                color: #f6f1e8;
              }

              body {
                overflow-x: hidden;
                font-family: 'Jost', 'Avenir Next', sans-serif;
              }

              * {
                box-sizing: border-box;
              }

              a {
                color: inherit;
                text-decoration: none;
              }
            `,
          }}
        />
      </head>
      <body>
        {children}
        <ScrollViewStyleReset />
      </body>
    </html>
  );
}
