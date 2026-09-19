import { defineConfig } from "fumapress";
import { fumadocsMdx } from "fumapress/adapters/mdx";
import { metaSchema, pageSchema } from "fumapress/adapters/mdx/schema";
import { defineDocs } from "fumadocs-mdx/macro";
import defaultMdxComponents, { createRelativeLink } from "fumadocs-ui/mdx";
import {
  createGenerator,
  createFileSystemGeneratorCache,
} from "fumadocs-typescript";
import { AutoTypeTable, type AutoTypeTableProps } from "fumadocs-typescript/ui";
import NovaLogo from "./src/assets/images/nova.svg?react";
import { createGlassLayoutPage } from "fumapress/layouts/glass";

const GlassLayout = createGlassLayoutPage<typeof config.$context>();

// Reads the library's real types off disk at build time, so the reference pages
// cannot drift from `src/`. Paths in `<AutoTypeTable path="..." />` resolve from
// this directory, which is why they are written as `../src/...`.
const typeGenerator = createGenerator({
  cache: createFileSystemGeneratorCache(
    "node_modules/.cache/fumadocs-typescript",
  ),
});

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
}).adapters(
  fumadocsMdx({
    // Overriding this replaces the adapter's default, so the defaults it sets
    // up (Markdown elements, Card, Callout, relative links) are repeated here.
    async getMdxComponents(page) {
      return {
        ...defaultMdxComponents,
        a: createRelativeLink(await this.getLoader(), page),
        AutoTypeTable: (props: Partial<AutoTypeTableProps>) => (
          <AutoTypeTable {...props} generator={typeGenerator} />
        ),
      };
    },
  }),
);

export default config;
