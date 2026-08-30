package division

import "encore.app/user"

func defaultNavigation(ud *user.UserData) *NavModulesResponse {
    core := []ModuleEntry{
        {ModuleID: 1, ModuleName: "Home", IsCore: true},
        {ModuleID: 2, ModuleName: "Task", IsCore: true},
        {ModuleID: 3, ModuleName: "Program Kerja", IsCore: true},
        {ModuleID: 4, ModuleName: "Rapat", IsCore: true},
    }
    role := make([]ModuleEntry, 0)
    switch ud.GroupName {
    case "Kepala Divisi", "Staf":
        role = append(role, ModuleEntry{ModuleID: 5, ModuleName: "Divisiku"})
    case "Bendahara":
        role = append(role, ModuleEntry{ModuleID: 6, ModuleName: "Catat Transaksi"}, ModuleEntry{ModuleID: 7, ModuleName: "Laporan"}, ModuleEntry{ModuleID: 8, ModuleName: "Verifikasi Nota"})
    case "Sekretaris":
        role = append(role, ModuleEntry{ModuleID: 9, ModuleName: "Dokumen"}, ModuleEntry{ModuleID: 10, ModuleName: "Notulensi"}, ModuleEntry{ModuleID: 11, ModuleName: "Pengumuman"}, ModuleEntry{ModuleID: 12, ModuleName: "Presensi"}, ModuleEntry{ModuleID: 13, ModuleName: "Aset & Sarana"})
    case "Trimitra":
        role = append(role, ModuleEntry{ModuleID: 14, ModuleName: "Approval Pusat"}, ModuleEntry{ModuleID: 15, ModuleName: "Struktur & Keanggotaan"}, ModuleEntry{ModuleID: 16, ModuleName: "Ringkasan Organisasi"}, ModuleEntry{ModuleID: 17, ModuleName: "Serah Terima"})
    case "Pembina":
        role = append(role, ModuleEntry{ModuleID: 16, ModuleName: "Ringkasan Organisasi"})
    }
    return &NavModulesResponse{CoreModules: core, RoleModules: role}
}
