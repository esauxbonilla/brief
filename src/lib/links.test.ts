import { describe, expect, it } from "vitest";
import { firstUrl, siteName, withoutUrls } from "./links";

describe("links", () => {
  it("finds the first link in title or note", () => {
    expect(firstUrl("pantalla dividida", "mira https://www.instagram.com/p/DalCzfhoERB/.")).toBe("https://www.instagram.com/p/DalCzfhoERB/");
    expect(firstUrl("sin link", null)).toBeNull();
  });

  it("names the usual sites", () => {
    expect(siteName("https://www.instagram.com/p/x/")).toBe("Instagram");
    expect(siteName("https://vm.tiktok.com/abc")).toBe("TikTok");
    expect(siteName("https://youtu.be/abc")).toBe("YouTube");
    expect(siteName("https://ejemplo.com/a")).toBe("ejemplo.com");
  });

  it("strips links from the text", () => {
    expect(withoutUrls("ver https://youtu.be/abc minuto 2")).toBe("ver minuto 2");
  });
});
