import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Page from "./page";

test("Page", () => {
  render(<Page />);
  expect(screen.getByText("Hello World")).toBeDefined();
});
