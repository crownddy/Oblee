import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Pager } from "@/components/events/Pager";

function mountBody(scrollTop = 400) {
  const body = document.createElement("div");
  body.className = "body";
  body.scrollTop = scrollTop;
  const scrollTo = vi.fn();
  body.scrollTo = scrollTo as unknown as HTMLElement["scrollTo"];
  document.body.appendChild(body);
  return { body, scrollTo };
}

afterEach(() => {
  cleanup();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
});

describe("pager", () => {
  it("shows the count for filtered results on a single page", () => {
    render(<Pager total={3} page={1} pageCount={1} query="detty" path="/explore" />);

    expect(screen.getByText("3 events")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Next page" })).toBeNull();
    expect(screen.queryByText(/^Showing/)).toBeNull();
  });

  it("uses the singular for one result", () => {
    render(<Pager total={1} page={1} pageCount={1} path="/explore" />);

    expect(screen.getByText("1 event")).toBeInTheDocument();
  });

  it("shows the range and page links across several pages", () => {
    render(<Pager total={25} page={2} pageCount={3} path="/explore" />);

    expect(screen.getByText("Showing 11–20 of 25 events")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "3" })).toHaveAttribute("href", "/explore?page=3");
  });

  it("renders nothing when there are no results", () => {
    const { container } = render(<Pager total={0} page={1} pageCount={1} path="/explore" />);

    expect(container).toBeEmptyDOMElement();
  });

  it("keeps the active filters on page links", () => {
    render(
      <Pager total={25} page={1} pageCount={3} query="detty" category="music" date="2026-11-28" path="/explore" />,
    );

    expect(screen.getByRole("link", { name: "2" })).toHaveAttribute(
      "href",
      "/explore?q=detty&cat=music&date=2026-11-28&page=2",
    );
  });

  it("scrolls the app's own scroll container to the top on page change", async () => {
    const user = userEvent.setup();
    const { body, scrollTo } = mountBody(888);
    render(<Pager total={25} page={1} pageCount={3} path="/explore" />);

    await user.click(screen.getByRole("link", { name: "2" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
    expect(body.scrollTop).toBe(888);
  });

  it("jumps instead of gliding when reduced motion is requested", async () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const user = userEvent.setup();
    const { scrollTo } = mountBody(600);
    render(<Pager total={25} page={2} pageCount={3} path="/explore" />);

    await user.click(screen.getByRole("link", { name: "3" }));

    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "auto" });
  });

  it("leaves the view alone when it is already at the top", async () => {
    const user = userEvent.setup();
    const { scrollTo } = mountBody(12);
    render(<Pager total={25} page={1} pageCount={3} path="/explore" />);

    await user.click(screen.getByRole("link", { name: "2" }));

    expect(scrollTo).not.toHaveBeenCalled();
  });

  it("marks the ends as unavailable without dropping the links", () => {
    render(<Pager total={25} page={1} pageCount={3} path="/explore" />);

    const previous = screen.getByRole("link", { name: "Previous page" });
    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).toHaveAttribute("tabindex", "-1");
  });
});
