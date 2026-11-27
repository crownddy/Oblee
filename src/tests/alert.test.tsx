import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { Alert, type AlertTone } from "@/components/ui/Alert";
import { PageNotice } from "@/components/ui/PageNotice";

afterEach(() => {
  cleanup();
});

const TONES: AlertTone[] = ["error", "success", "warning", "info"];

describe("Alert", () => {
  it.each(TONES)("renders the %s tone with its icon", (tone) => {
    render(
      <Alert tone={tone} onDismiss={() => {}}>
        Message
      </Alert>,
    );

    const alert = document.querySelector(".alert") as HTMLElement;
    expect(alert).toHaveAttribute("data-tone", tone);
    expect(alert.querySelector(".alert-ic svg")).toBeInTheDocument();
    expect(alert.querySelector(".alert-ic")).toHaveAttribute("aria-hidden", "true");
  });

  it("announces errors assertively and everything else politely", () => {
    const { unmount } = render(
      <Alert tone="error" onDismiss={() => {}}>
        Something failed
      </Alert>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Something failed");
    expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
    unmount();

    for (const tone of ["success", "warning", "info"] as const) {
      const view = render(
        <Alert tone={tone} onDismiss={() => {}}>
          Status
        </Alert>,
      );
      const status = screen.getByRole("status");
      expect(status).toHaveAttribute("aria-live", "polite");
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
      view.unmount();
    }
  });

  it("always offers a labelled close button", () => {
    const onDismiss = vi.fn();
    render(
      <Alert tone="error" onDismiss={onDismiss}>
        Something failed
      </Alert>,
    );

    const close = screen.getByRole("button", { name: "Dismiss message" });
    fireEvent.click(close);
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("accepts a contextual close label", () => {
    render(
      <Alert tone="info" onDismiss={() => {}} dismissLabel="Dismiss password tip">
        Tip
      </Alert>,
    );

    expect(screen.getByRole("button", { name: "Dismiss password tip" })).toBeInTheDocument();
  });

  it("renders an optional title above the message", () => {
    render(
      <Alert tone="warning" title="Check your details" onDismiss={() => {}}>
        The link has expired.
      </Alert>,
    );

    const alert = screen.getByRole("status");
    expect(alert).toHaveTextContent("Check your details");
    expect(alert).toHaveTextContent("The link has expired.");
    expect(alert.querySelector(".alert-title")).toHaveTextContent("Check your details");
  });

  it("stays in normal flow so it cannot cover form controls", () => {
    render(
      <Alert tone="error" onDismiss={() => {}}>
        Something failed
      </Alert>,
    );

    const alert = screen.getByRole("alert");
    expect(alert).toHaveClass("alert");
    expect(alert).not.toHaveAttribute("style");
  });
});

describe("PageNotice", () => {
  it("is visible until the reader dismisses it", () => {
    render(<PageNotice tone="success">Password updated.</PageNotice>);

    expect(screen.getByRole("status")).toHaveTextContent("Password updated.");

    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByText("Password updated.")).not.toBeInTheDocument();
  });
});
