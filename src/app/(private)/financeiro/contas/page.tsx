import { requireAdmin } from "@/server/auth/guards";
import { listAccounts } from "@/server/finance/accounts";
import { listCategories } from "@/server/finance/categories";
import { AccountPanel } from "@/components/finance/account-panel";
import { CategoryPanel } from "@/components/finance/category-panel";
export default async function AccountsPage() {
  const actor = await requireAdmin(),
    [accounts, categories] = await Promise.all([
      listAccounts(actor),
      listCategories(actor),
    ]);
  return (
    <>
      <AccountPanel accounts={accounts} />
      <CategoryPanel categories={categories} />
    </>
  );
}
