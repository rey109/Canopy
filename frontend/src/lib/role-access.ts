import type { UserDetail } from "@/lib/api";

export type RoleGroup = "Staf" | "Kepala Divisi" | "Bendahara" | "Sekretaris" | "Trimitra" | "Pembina";

export const coreNavigation = [
  { label: "Home", href: "/dashboard" },
  { label: "Task", href: "/dashboard/task" },
  { label: "Program Kerja", href: "/dashboard/proker" },
  { label: "Rapat", href: "/dashboard/meetings" },
] as const;

export const roleNavigation: Record<RoleGroup, { label: string; href: string }[]> = {
  Staf: [{ label: "Divisiku", href: "/dashboard/team" }],
  "Kepala Divisi": [{ label: "Divisiku", href: "/dashboard/team" }],
  Bendahara: [
    { label: "Catat Transaksi", href: "/dashboard/finance" },
    { label: "Laporan", href: "/dashboard/finance" },
    { label: "Verifikasi Nota", href: "/dashboard/finance" },
  ],
  Sekretaris: [
    { label: "Dokumen", href: "/dashboard/secretary" },
    { label: "Notulensi", href: "/dashboard/notulensi" },
    { label: "Pengumuman", href: "/dashboard/updates" },
    { label: "Presensi", href: "/dashboard/attendance" },
    { label: "Aset & Sarana", href: "/dashboard/assets" },
  ],
  Trimitra: [
    { label: "Approval Pusat", href: "/dashboard/organization?view=approval" },
    { label: "Struktur & Keanggotaan", href: "/dashboard/team?view=structure" },
    { label: "Ringkasan Organisasi", href: "/dashboard/organization?view=summary" },
    { label: "Serah Terima", href: "/dashboard/handover?view=handover" },
  ],
  Pembina: [{ label: "Ringkasan Organisasi", href: "/dashboard/organization" }],
};

export const profileNavigation = [
  { label: "Info", href: "/dashboard/updates" },
  { label: "Profile", href: "/dashboard/profile" },
  { label: "Setting", href: "/dashboard/settings" },
] as const;

export function getRoleGroup(user: UserDetail | null): RoleGroup {
  const group = user?.group_name;
  if (group === "Staf" || group === "Kepala Divisi" || group === "Bendahara" || group === "Sekretaris" || group === "Trimitra" || group === "Pembina") {
    return group;
  }
  return "Staf";
}

export function getRoleNavigation(user: UserDetail | null) {
  const group = getRoleGroup(user);
  const items = [...roleNavigation[group]];
  if (group === "Bendahara" && user?.level === 1) {
    items.push({ label: "Approval Berisiko", href: "/dashboard/finance" });
  }
  return items;
}

export function hasFullScope(user: UserDetail | null) {
  return user?.scope_divisi_awal == null && user?.scope_divisi_akhir == null;
}

export function canMutate(user: UserDetail | null) {
  return getRoleGroup(user) !== "Pembina";
}

export function canCreateProker(user: UserDetail | null) {
  return getRoleGroup(user) === "Kepala Divisi" || getRoleGroup(user) === "Trimitra";
}

export function canManageFinance(user: UserDetail | null) {
  return getRoleGroup(user) === "Bendahara";
}

export function canApproveRisk(user: UserDetail | null) {
  return getRoleGroup(user) === "Bendahara" && user?.level === 1;
}

export function canManageSecretariat(user: UserDetail | null) {
  return getRoleGroup(user) === "Sekretaris";
}

export function canManageOrganization(user: UserDetail | null) {
  return getRoleGroup(user) === "Trimitra";
}
