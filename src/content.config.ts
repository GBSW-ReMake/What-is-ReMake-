import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "zod";

const projects = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/projects" }),
  schema: z.object({
    title: z.string(),
    tagline: z.string(),
    stack: z.array(z.string()),
    status: z.enum(["active", "archived"]).default("active"),
    order: z.number().default(0),
    links: z
      .object({
        repo: z.url().optional(),
        live: z.url().optional(),
      })
      .default({}),
  }),
});

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    publishDate: z.coerce.date(),
    author: z.string(),
    tags: z.array(z.string()).default([]),
    draft: z.boolean().default(false),
  }),
});

export const collections = { projects, blog };
