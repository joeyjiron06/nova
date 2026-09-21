import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import { ServerCodeBlock } from "fumadocs-ui/components/codeblock.rsc";

const installCommands = [
  { manager: "npm", command: "npm install nova-cache" },
  { manager: "Yarn", command: "yarn add nova-cache" },
  { manager: "pnpm", command: "pnpm add nova-cache" },
  { manager: "Bun", command: "bun add nova-cache" },
  { manager: "Deno", command: "deno add npm:nova-cache" },
] as const;

/**
 * Package-manager tabs for installing nova-cache.
 * Shared by the landing page (src/pages/index.tsx) and the docs
 * (imported directly in content/getting-started.mdx).
 */
export function InstallTabs({
  className = "w-full max-w-lg",
}: {
  className?: string;
}) {
  return (
    <Tabs
      items={installCommands.map((c) => c.manager)}
      className={className}
      persist
    >
      {installCommands.map((c) => (
        <Tab key={c.manager}>
          <ServerCodeBlock code={c.command} lang="bash" />
        </Tab>
      ))}
    </Tabs>
  );
}
