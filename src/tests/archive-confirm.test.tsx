import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ArchiveButton } from "@/components/events/ArchiveButton";
import { UIProvider } from "@/components/ui/UIProvider";
import { archiveEventAction } from "@/lib/actions/events";

const push = vi.fn();
const refresh = vi.fn();

vi.mock("next/navigation", async (importOriginal) => ({
  ...(await importOriginal<typeof import("next/navigation")>()),
  useRouter: () => ({ push, refresh, back: vi.fn(), forward: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock("@/lib/actions/events", () => ({
  archiveEventAction: vi.fn(async () => ({ ok: true })),
}));

const archive = vi.mocked(archiveEventAction);

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

const renderButton = () =>
  render(
    <UIProvider>
      <ArchiveButton eventId="evt-1" />
    </UIProvider>,
  );

const openSheet = () => fireEvent.click(screen.getByRole("button", { name: "Archive" }));

beforeEach(() => {
  vi.clearAllMocks();
  archive.mockResolvedValue({ ok: true });
});

afterEach(cleanup);

describe("archive confirmation sheet", () => {
  it("explains what archiving does before anything happens", () => {
    renderButton();
    openSheet();

    const sheet = screen.getByRole("dialog", { name: "Archive this event?" });
    expect(sheet).toHaveTextContent("It disappears from Oblee for everyone else.");
    expect(sheet).toHaveTextContent(/removes it from search, the home list, the carousel and saved lists/i);
    expect(sheet).toHaveTextContent(/can’t be deleted once posted/i);
    expect(archive).not.toHaveBeenCalled();
  });

  it("focuses Cancel, so Enter cannot archive by accident", () => {
    renderButton();
    openSheet();

    expect(screen.getByRole("button", { name: "Cancel" })).toHaveFocus();
    expect(screen.getByRole("button", { name: "Archive event" })).not.toHaveFocus();
  });

  it("lays the actions out as two equal columns", () => {
    renderButton();
    openSheet();

    const cancel = screen.getByRole("button", { name: "Cancel" });
    const confirm = screen.getByRole("button", { name: "Archive event" });

    expect(cancel.parentElement).toHaveClass("sheetact");
    expect(confirm.parentElement).toBe(cancel.parentElement);
    expect(cancel).toHaveClass("btn", "o");
    expect(confirm).toHaveClass("btn", "warn");
  });

  it("closes on Cancel without archiving", () => {
    renderButton();
    openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(archive).not.toHaveBeenCalled();
  });

  it("closes on the backdrop but not when the sheet itself is clicked", () => {
    const { container } = renderButton();
    openSheet();

    fireEvent.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    const overlay = container.ownerDocument.querySelector(".ovl");
    expect(overlay).not.toBeNull();
    fireEvent.click(overlay as Element);

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(archive).not.toHaveBeenCalled();
  });

  it("closes on Escape without archiving", () => {
    renderButton();
    openSheet();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(archive).not.toHaveBeenCalled();
  });

  it("shows a loading state while archiving", async () => {
    const pending = deferred<{ ok: true }>();
    archive.mockReturnValueOnce(pending.promise);
    renderButton();
    openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Archive event" }));

    const busy = await screen.findByRole("button", { name: /archiving/i });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
    expect(busy.querySelector(".spin2")).not.toBeNull();

    pending.resolve({ ok: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("cannot be dismissed while the archive request is in flight", async () => {
    const pending = deferred<{ ok: true }>();
    archive.mockReturnValueOnce(pending.promise);
    renderButton();
    openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Archive event" }));
    await screen.findByRole("button", { name: /archiving/i });

    fireEvent.keyDown(document, { key: "Escape" });
    const overlay = document.querySelector(".ovl");
    fireEvent.click(overlay as Element);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(archive).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("archives once, confirms and moves to the archived list", async () => {
    renderButton();
    openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Archive event" }));

    await waitFor(() => expect(push).toHaveBeenCalledWith("/profile?tab=archived"));
    expect(archive).toHaveBeenCalledTimes(1);
    expect(archive).toHaveBeenCalledWith("evt-1");
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("Event archived.");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("reports a failure inside the sheet and keeps it open", async () => {
    archive.mockResolvedValueOnce({ ok: false, error: "We could not archive this event." });
    renderButton();
    openSheet();

    fireEvent.click(screen.getByRole("button", { name: "Archive event" }));

    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not archive");
    expect(alert).toHaveTextContent("We could not archive this event.");
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Dismiss message" }));
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("ignores repeated presses so the action runs once", async () => {
    const pending = deferred<{ ok: true }>();
    archive.mockReturnValueOnce(pending.promise);
    renderButton();
    openSheet();

    const confirm = screen.getByRole("button", { name: "Archive event" });
    fireEvent.click(confirm);
    fireEvent.click(confirm);
    fireEvent.click(confirm);

    expect(archive).toHaveBeenCalledTimes(1);

    pending.resolve({ ok: true });
    await waitFor(() => expect(push).toHaveBeenCalledTimes(1));
  });
});
