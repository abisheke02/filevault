import Foundation
import Combine

@MainActor
class AuthStore: ObservableObject {
    @Published var token: String? = nil
    @Published var user: UserProfile? = nil

    var isAuthenticated: Bool { token != nil }

    private let tokenKey = "fv_token"
    private let userKey  = "fv_user"

    init() {
        token = UserDefaults.standard.string(forKey: tokenKey)
        if let data = UserDefaults.standard.data(forKey: userKey) {
            user = try? JSONDecoder().decode(UserProfile.self, from: data)
        }
    }

    func setAuth(token: String, user: UserProfile) {
        self.token = token
        self.user  = user
        UserDefaults.standard.set(token, forKey: tokenKey)
        if let data = try? JSONEncoder().encode(user) {
            UserDefaults.standard.set(data, forKey: userKey)
        }
    }

    func logout() {
        token = nil; user = nil
        UserDefaults.standard.removeObject(forKey: tokenKey)
        UserDefaults.standard.removeObject(forKey: userKey)
    }
}
