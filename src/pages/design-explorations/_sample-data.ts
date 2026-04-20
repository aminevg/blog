// Shared placeholder content for all 5 design-exploration variants.
// Using a fixed sample lets reviewers compare variants at equal content.

export const sample = {
  author: "Amine Ilidrissi",
  tagline: {
    eyebrow: "Writing · Tokyo / Paris · 2020 — now",
    title: "Notes on software, SRE, and life between Paris and Tokyo.",
    subtitle:
      "Occasional long-form writing — unhurried, half-researched, honest about what I don't know.",
  },
  posts: [
    {
      title: "Field notes on SRE",
      description:
        "A decade of being paged at 3am, condensed. Three rules that have aged: SLOs before dashboards, runbooks decay faster than code, and toil is a liquid.",
      date: "March 28, 2026",
      read: "6 min",
    },
    {
      title: "Hello, world",
      description:
        "A first post introducing the blog — what it is, what it isn't, and what I plan to write about over the next few years.",
      date: "April 15, 2026",
      read: "2 min",
    },
    {
      title: "The platform team has no customers",
      description:
        "Why treating internal platforms as products always collapses the moment the backlog has to negotiate with a product manager.",
      date: "February 9, 2026",
      read: "9 min",
    },
  ],
  talks: [
    {
      title: "Platform engineering in 2026",
      event: "SRE Next",
      venue: "Tokyo",
      date: "Feb 2026",
    },
    {
      title: "Terraform at a human scale",
      event: "HashiTalks",
      venue: "Remote",
      date: "Nov 2025",
    },
  ],
} as const;
