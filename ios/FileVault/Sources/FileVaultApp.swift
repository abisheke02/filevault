import SwiftUI

@main
struct FileVaultApp: App {
    @StateObject private var authStore = AuthStore()

    var body: some Scene {
        WindowGroup {
            if authStore.isAuthenticated {
                ContentView()
                    .environmentObject(authStore)
            } else {
                LoginView()
                    .environmentObject(authStore)
            }
        }
    }
}
