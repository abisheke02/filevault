import Foundation

class APIClient {
    static let shared = APIClient()

    var serverURL: String {
        get { UserDefaults.standard.string(forKey: "fv_server") ?? "http://192.168.29.113:3002" }
        set { UserDefaults.standard.set(newValue, forKey: "fv_server") }
    }

    private var token: String? { UserDefaults.standard.string(forKey: "fv_token") }

    private func request(_ path: String, method: String = "GET", body: Data? = nil) async throws -> Data {
        let url = URL(string: "\(serverURL)/api/\(path)")!
        var req = URLRequest(url: url)
        req.httpMethod = method
        req.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let t = token { req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization") }
        if let b = body  { req.httpBody = b }
        let (data, _) = try await URLSession.shared.data(for: req)
        return data
    }

    func login(email: String, password: String, totp: String? = nil) async throws -> AuthResponse {
        var body: [String: Any] = ["email": email, "password": password]
        if let t = totp { body["totpToken"] = t }
        let data = try JSONSerialization.data(withJSONObject: body)
        let raw = try await request("auth/login", method: "POST", body: data)
        return try JSONDecoder().decode(AuthResponse.self, from: raw)
    }

    func listFiles(folderId: String? = nil) async throws -> ListResponse {
        var path = "files"
        if let id = folderId { path += "?folderId=\(id)" }
        let raw = try await request(path)
        return try JSONDecoder().decode(ListResponse.self, from: raw)
    }

    func listStarred() async throws -> ListResponse {
        let raw = try await request("files/starred")
        return try JSONDecoder().decode(ListResponse.self, from: raw)
    }

    func listFolders(parentId: String? = nil) async throws -> [FolderItem] {
        var path = "folders"
        if let id = parentId { path += "?parentId=\(id)" }
        let raw = try await request(path)
        return try JSONDecoder().decode([FolderItem].self, from: raw)
    }

    func createFolder(name: String, parentId: String? = nil) async throws -> FolderItem {
        var body: [String: Any] = ["name": name]
        if let id = parentId { body["parentId"] = id }
        let data = try JSONSerialization.data(withJSONObject: body)
        let raw = try await request("folders", method: "POST", body: data)
        return try JSONDecoder().decode(FolderItem.self, from: raw)
    }

    func trashFile(id: String) async throws {
        _ = try await request("files/\(id)", method: "DELETE")
    }

    func toggleStar(id: String) async throws -> FileItem {
        let raw = try await request("files/\(id)/star", method: "PATCH")
        return try JSONDecoder().decode(FileItem.self, from: raw)
    }

    func uploadFile(data: Data, name: String, mimeType: String, folderId: String?) async throws -> FileItem {
        let url = URL(string: "\(serverURL)/api/files/upload\(folderId.map { "?folderId=\($0)" } ?? "")")!
        let boundary = UUID().uuidString
        var req = URLRequest(url: url)
        req.httpMethod = "POST"
        req.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")
        if let t = token { req.setValue("Bearer \(t)", forHTTPHeaderField: "Authorization") }

        var body = Data()
        body.append("--\(boundary)\r\n".data(using: .utf8)!)
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(name)\"\r\n".data(using: .utf8)!)
        body.append("Content-Type: \(mimeType)\r\n\r\n".data(using: .utf8)!)
        body.append(data)
        body.append("\r\n--\(boundary)--\r\n".data(using: .utf8)!)
        req.httpBody = body

        let (raw, _) = try await URLSession.shared.data(for: req)
        return try JSONDecoder().decode(FileItem.self, from: raw)
    }
}
