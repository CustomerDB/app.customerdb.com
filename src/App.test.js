import App from "./App";
import React from "react";
import { act } from "react-dom/test-utils";
import { render } from "@testing-library/react";

let container;

beforeEach(() => {
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  document.body.removeChild(container);
  container = null;
});

test("renders learn react link", () => {
  act(() => {
    render(<App />, container);
  });
  const linkElement = container.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
