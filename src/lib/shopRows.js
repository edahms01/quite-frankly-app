// Shop rows come from the public Google Sheet, so a row can be removed there without a build. This list covers rows the app must not show even if the
// sheet still has them (Wise Wolf sells gold and silver; held back from the first release). Matched case-insensitively on the row name or the link.
// Edit HIDDEN_SHOP_ROWS to add more; nothing else needs to change.
export const HIDDEN_SHOP_ROWS = { names: ['wise wolf'], urlParts: ['quitefrankly.gold', 'wisewolf'] };

export function isHiddenShopRow(name, url) {
  const n = String(name ?? '').toLowerCase();
  const u = String(url ?? '').toLowerCase();
  return HIDDEN_SHOP_ROWS.names.some((p) => n.includes(p)) || HIDDEN_SHOP_ROWS.urlParts.some((p) => u.includes(p));
}

// rows: parsed CSV rows ({ Category, Name, URL, Note, Code }) -> { stores, affiliates }
export function partitionShopRows(rows) {
  const visible = rows.filter((r) => !isHiddenShopRow(r.Name, r.URL));
  const stores = visible.filter((r) => r.Category === 'Shop').map((r) => ({ label: r.Name, url: r.URL }));
  const affiliates = visible
    .filter((r) => r.Category === 'Affiliate')
    .map((r) => ({ title: r.Name, subtitle: r.Note || undefined, badge: r.Code || undefined, url: r.URL }));
  return { stores, affiliates };
}

// A copy saved by an earlier app version may still hold a hidden row: filter it again when read back.
export function filterCachedShop(data) {
  return {
    stores: (data?.stores ?? []).filter((s) => !isHiddenShopRow(s.label, s.url)),
    affiliates: (data?.affiliates ?? []).filter((a) => !isHiddenShopRow(a.title, a.url)),
  };
}
