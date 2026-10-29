// @vitest-environment jsdom
import { afterEach, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { AdminNavigation } from "@/components/shell/admin-navigation";
import { adLibraryPath } from "@/components/advertising/ad-client";
afterEach(cleanup);
it.each([true, false])(
  "provides the private library navigation for admin=%s",
  (admin) => {
    render(
      <AdminNavigation path="/anuncios" admin={admin} onNavigate={() => {}} />,
    );
    expect(
      screen.getByRole("link", { name: "Anúncios" }).getAttribute("href"),
    ).toBe("/anuncios");
  },
);
it("keeps search, channel and status while changing page", () => {
  expect(
    adLibraryPath(
      {
        search: "Peça & azul",
        channel: "WHATSAPP",
        status: "REVIEWED",
        page: 1,
      },
      2,
    ),
  ).toBe(
    "/anuncios?search=Pe%C3%A7a+%26+azul&channel=WHATSAPP&status=REVIEWED&page=2",
  );
});
