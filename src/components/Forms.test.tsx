import {authSlice} from '../app/auth';
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { configureStore } from "@reduxjs/toolkit";
import { crmSlice } from "../app/store";
import { seed } from "../data/model";
import { RecordForm } from "./Forms";
import { Records } from "../features/Records";
const wrapper = ({ children }: { children: React.ReactNode }) => (
  <Provider
    store={configureStore({
      reducer: { crm: crmSlice.reducer, auth: authSlice.reducer },
      preloadedState: { crm: seed(), auth: authSlice.reducer(undefined,authSlice.actions.login('admin')) },
    })}
  >
    <MemoryRouter>{children}</MemoryRouter>
  </Provider>
);
describe("Forms and record management", () => {
  it("shows required and invalid-email errors, then saves trimmed data", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    render(<RecordForm domain="leads" onClose={() => {}} onSave={onSave} />, {
      wrapper,
    });
    await user.type(screen.getByLabelText("Name *"), "   ");
    await user.type(screen.getByLabelText("Email"), "invalid");
    await user.click(screen.getByRole("button", { name: "Create record" }));
    expect(screen.getByText("A name or title is required")).toBeInTheDocument();
    expect(screen.getByText("Enter a valid email")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
    await user.clear(screen.getByLabelText("Name *"));
    await user.type(screen.getByLabelText("Name *"), "  Jane Smith  ");
    await user.clear(screen.getByLabelText("Email"));
    await user.type(screen.getByLabelText("Email"), "jane@example.com");
    await user.click(screen.getByRole("button", { name: "Create record" }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "Jane Smith",
        email: "jane@example.com",
      }),
    );
  });
  it("initializes edit fields and rejects negative values", async () => {
    const user = userEvent.setup();
    const onSave = vi.fn();
    const record = seed().leads[0];
    render(
      <RecordForm
        domain="leads"
        record={record}
        onSave={onSave}
        onClose={() => {}}
      />,
      { wrapper },
    );
    expect(screen.getByLabelText("Name *")).toHaveValue(record.name);
    fireEvent.change(screen.getByLabelText("Estimated value ($)"), {
      target: { value: "-1" },
    });
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Value cannot be negative")).toBeInTheDocument();
    expect(onSave).not.toHaveBeenCalled();
  });
  it("searches, combines filters, resets pagination and displays an empty state", async () => {
    const user = userEvent.setup();
    render(<Records domain="leads" notify={() => {}} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Next page" }));
    expect(screen.getByText("2 / 2")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Search leads"), "Northstar");
    expect(screen.getByText("1 / 1")).toBeInTheDocument();
    expect(screen.getByText("Northstar Health")).toBeInTheDocument();
    await user.selectOptions(screen.getByLabelText("Filter status"), "New");
    expect(screen.getByText("No leads found")).toBeInTheDocument();
  });
  it("creates, edits and confirms deletion through the shared form", async () => {
    const user = userEvent.setup();
    render(<Records domain="leads" notify={() => {}} />, { wrapper });
    await user.click(screen.getByRole("button", { name: "Add lead" }));
    await user.type(screen.getByLabelText("Name *"), "Test Person");
    await user.click(screen.getByRole("button", { name: "Create record" }));
    await user.type(screen.getByLabelText("Search leads"), "Test Person");
    expect(screen.getByText("Test Person")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Edit Test Person" }));
    await user.clear(screen.getByLabelText("Name *"));
    await user.type(screen.getByLabelText("Name *"), "Test Person Updated");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(screen.getByText("Test Person Updated")).toBeInTheDocument();
    await user.click(
      screen.getByRole("button", { name: "Delete Test Person Updated" }),
    );
    await user.click(screen.getByRole("button", { name: "Delete record" }));
    expect(screen.getByText("No leads found")).toBeInTheDocument();
  });
});
