import { defineConfig } from "fumapress";
import { fumadocsMdx } from "fumapress/adapters/mdx";
import { metaSchema, pageSchema } from "fumapress/adapters/mdx/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import NovaLogo from "./src/assets/images/nova.svg?react";
import { createGlassLayoutPage } from "fumapress/layouts/glass";

const GlassLayout = createGlassLayoutPage<typeof config.$context>();

const docs = defineDocs({
  dir: "content",
  docs: {
    async: true,
    schema: pageSchema,
    lastModified: true,
    postprocess: {
      includeProcessedMarkdown: true,
    },
  },
  meta: {
    schema: metaSchema,
  },
});

const config = defineConfig({
  content: docs.toFumadocsSource(),
  mode: "static",
  renderPage: (props) => <GlassLayout {...props} />,

  site: {
    name: "Nova",
    baseUrl: "https://joeyjiron.com/nova",
    git: {
      user: "joeyjiron06",
      repo: "nova",
      branch: "main",
    },
  },
  // Both the home and docs layouts inherit `defaultLayoutProps` by default,
  // so setting the nav title here covers every navbar on the site.
  defaultLayoutProps: {
    searchToggle: {
      enabled: false,
    },
    nav: {
      title: <NovaLogo className="h-5 w-auto" />,
      url: "/",
    },
  },
  meta: {
    root() {
      return (
        <>
          <link rel="preconnect" href="https://fonts.googleapis.com" />
          <link
            rel="preconnect"
            href="https://fonts.gstatic.com"
            crossOrigin=""
          />
          <link
            href="https://fonts.googleapis.com/css2?family=Geist:ital,wght@0,100..900;1,100..900&family=JetBrains+Mono:ital,wght@0,100..800;1,100..800&display=swap"
            rel="stylesheet"
          />
        </>
      );
    },
  },
}).adapters(fumadocsMdx());

export default config;
