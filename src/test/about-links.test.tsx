import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { LinkedInLink, projectInfo, type Person } from "@/components/about-project";

const person = (linkedin: string, name = "Supratik Saha"): Person => ({
  name,
  role: "Team Lead",
  linkedin,
});

describe("About section LinkedIn links", () => {
  it("opens a supplied LinkedIn profile in a new tab", () => {
    render(<LinkedInLink person={person("https://www.linkedin.com/in/supratik-saha")} />);

    const link = screen.getByRole("link", { name: "Supratik Saha on LinkedIn" });
    expect(link).toHaveAttribute("href", "https://www.linkedin.com/in/supratik-saha");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("shows no button while a profile link is still missing", () => {
    const { container } = render(<LinkedInLink person={person("")} />);

    expect(container.innerHTML).toBe("");
  });

  it("ignores text that is not a LinkedIn profile URL", () => {
    const { container } = render(<LinkedInLink person={person("linkedin.com/in/supratik")} />);

    expect(container.innerHTML).toBe("");
  });

  it("keeps the five members in order, each with a LinkedIn slot", () => {
    expect(projectInfo.members.map((m) => m.name)).toEqual([
      "Supratik Saha",
      "Swastika Banik",
      "Suparna Das",
      "Rashi Kumari",
      "Swayam Roy",
    ]);
    expect(projectInfo.members.every((m) => typeof m.linkedin === "string")).toBe(true);
  });

  it("keeps both teachers labelled Teacher, never Guide", () => {
    expect(projectInfo.guides.map((g) => g.name)).toEqual([
      "Prof. Amit Kumar Bagh",
      "Prof. Sneha Nandi",
    ]);
    expect(projectInfo.guides.map((g) => g.role)).toEqual([
      "Teacher — Software Engineering",
      "Teacher — Software Engineering",
    ]);
    expect(projectInfo.guides.every((g) => typeof g.linkedin === "string")).toBe(true);
  });
});
