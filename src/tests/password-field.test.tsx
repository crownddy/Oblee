import { afterEach, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { PasswordField } from "@/components/auth/PasswordField";

afterEach(() => {
  cleanup();
});

function Harness({ guidance = true }: { guidance?: boolean }) {
  const [value, setValue] = useState("");
  return (
    <PasswordField
      name="password"
      label="Password"
      autoComplete="new-password"
      value={value}
      onChange={setValue}
      guidance={guidance}
    />
  );
}

const field = () => screen.getByLabelText("Password") as HTMLInputElement;
const type = (value: string) => fireEvent.change(field(), { target: { value } });

describe("PasswordField", () => {
  it("labels the input and links it to the requirement list", () => {
    render(<Harness />);

    const describedBy = field().getAttribute("aria-describedby");
    expect(describedBy).toBeTruthy();
    expect(document.getElementById(describedBy as string)).toContainElement(
      screen.getByRole("list", { name: "Password requirements" }),
    );
  });

  it("shows every requirement as unmet until the password satisfies it", () => {
    render(<Harness />);
    const list = screen.getByRole("list", { name: "Password requirements" });
    const items = within(list).getAllByRole("listitem");

    expect(items).toHaveLength(2);
    expect(items[0]).toHaveAttribute("data-met", "false");
    expect(items[0]).toHaveTextContent("At least 8 characters");
    expect(items[1]).toHaveAttribute("data-met", "true");

    type("Party1");

    expect(items[0]).toHaveAttribute("data-met", "false");
    type("Party123");
    expect(items[0]).toHaveAttribute("data-met", "true");
  });

  it("tells screen readers whether each requirement is met", () => {
    render(<Harness />);
    const list = screen.getByRole("list", { name: "Password requirements" });

    type("Party123");

    expect(list.textContent).toContain("Met: At least 8 characters");
    expect(list.textContent).toContain("Met: No more than 200 characters");
    type("Party");
    expect(list.textContent).toContain("Not met: At least 8 characters");
  });

  it("keeps the strength meter hidden until something is typed", () => {
    render(<Harness />);
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();

    type("Party123");

    expect(screen.getByRole("meter", { name: "Password strength" })).toHaveAttribute("aria-valuenow", "2");
  });

  it("reports weak, fair and strong with an accessible meter", () => {
    render(<Harness />);
    const status = () => screen.getByRole("status");

    type("Party");
    expect(status()).toHaveTextContent("Weak");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "1");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuetext", "Password strength: Weak");

    type("Party123");
    expect(status()).toHaveTextContent("Fair");

    type("PartyTime2026!");
    expect(status()).toHaveTextContent("Strong");
    expect(screen.getByRole("meter")).toHaveAttribute("aria-valuenow", "3");
  });

  it("fills one meter segment per level", () => {
    render(<Harness />);

    type("Party123");
    const bars = screen.getByRole("meter").querySelectorAll("span");
    expect(Array.from(bars).map((bar) => bar.getAttribute("data-on"))).toEqual(["true", "true", "false"]);

    type("PartyTime2026!");
    expect(Array.from(bars).map((bar) => bar.getAttribute("data-on"))).toEqual(["true", "true", "true"]);
  });

  it("toggles the password between hidden and visible", () => {
    render(<Harness />);

    expect(field()).toHaveAttribute("type", "password");
    const toggle = screen.getByRole("button", { name: "Show password" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");

    fireEvent.click(toggle);

    expect(field()).toHaveAttribute("type", "text");
    const hide = screen.getByRole("button", { name: "Hide password" });
    expect(hide).toHaveAttribute("aria-pressed", "true");
    expect(hide).toHaveAttribute("aria-controls", field().id);

    fireEvent.click(hide);
    expect(field()).toHaveAttribute("type", "password");
  });

  it("announces an error and marks the field invalid", () => {
    render(
      <PasswordField
        name="password"
        label="Password"
        autoComplete="new-password"
        value="Party"
        onChange={() => {}}
        guidance
        error="Add at least 8 characters."
      />,
    );

    expect(field()).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByRole("alert")).toHaveTextContent("Add at least 8 characters.");
    expect(field().getAttribute("aria-describedby")).toContain(screen.getByRole("alert").id);
  });

  it("can be used without the guidance block", () => {
    render(<Harness guidance={false} />);

    expect(screen.queryByRole("list", { name: "Password requirements" })).not.toBeInTheDocument();
    expect(screen.queryByRole("meter")).not.toBeInTheDocument();
    expect(field().getAttribute("aria-describedby")).toBeNull();
    expect(screen.getByRole("button", { name: "Show password" })).toBeInTheDocument();
  });

});
