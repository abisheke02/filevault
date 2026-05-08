import Foundation

struct UserProfile: Codable {
    let id: String
    let email: String
    let name: String
    let isAdmin: Bool
    let storageUsedBytes: Int64
    let storageQuotaBytes: Int64
    let totpEnabled: Bool
}

struct AuthResponse: Codable {
    let accessToken: String?
    let user: UserProfile?
    let needsTotp: Bool?
}

struct ListResponse: Codable {
    let files: [FileItem]
    let folders: [FolderItem]
    let total: Int
}

struct FileItem: Codable, Identifiable {
    let id: String
    let name: String
    let mimeType: String
    let sizeBytes: Int64
    let folderId: String?
    let isStarred: Bool
    let isTrashed: Bool
    let createdAt: String
    let updatedAt: String
    let versions: Int?
}

struct FolderItem: Codable, Identifiable {
    let id: String
    let name: String
    let parentId: String?
    let createdAt: String
    let updatedAt: String
    let fileCount: Int?
}

func formatSize(_ bytes: Int64) -> String {
    let gb = 1_000_000_000.0
    let mb = 1_000_000.0
    let kb = 1_000.0
    let b  = Double(bytes)
    if b >= gb { return String(format: "%.1f GB", b / gb) }
    if b >= mb { return String(format: "%.1f MB", b / mb) }
    if b >= kb { return String(format: "%.0f KB", b / kb) }
    return "\(bytes) B"
}
