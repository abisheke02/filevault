import SwiftUI

struct ContentView: View {
    @EnvironmentObject var auth: AuthStore
    @State private var folderStack: [FolderItem] = []
    @State private var files: [FileItem]   = []
    @State private var folders: [FolderItem] = []
    @State private var loading = false
    @State private var error: String?
    @State private var showNewFolder = false
    @State private var newFolderName = ""
    @State private var tab: Tab = .drive

    enum Tab { case drive, starred, trash, settings }

    var currentFolderId: String? { folderStack.last?.id }

    var body: some View {
        TabView(selection: $tab) {
            driveView
                .tabItem { Label("Drive", systemImage: "internaldrive") }
                .tag(Tab.drive)

            starredView
                .tabItem { Label("Starred", systemImage: "star") }
                .tag(Tab.starred)

            Text("Trash — coming soon")
                .tabItem { Label("Trash", systemImage: "trash") }
                .tag(Tab.trash)

            SettingsViewiOS()
                .tabItem { Label("Settings", systemImage: "gearshape") }
                .tag(Tab.settings)
        }
        .onAppear { Task { await load() } }
    }

    // MARK: Drive view
    var driveView: some View {
        NavigationStack {
            Group {
                if loading { ProgressView() }
                else if let e = error { Text(e).foregroundStyle(.red) }
                else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150))], spacing: 10) {
                            ForEach(folders) { f in
                                FolderCardView(folder: f) {
                                    folderStack.append(f)
                                    Task { await load() }
                                }
                            }
                            ForEach(files) { f in
                                FileCardView(file: f, onStar: {
                                    Task {
                                        _ = try? await APIClient.shared.toggleStar(id: f.id)
                                        await load()
                                    }
                                })
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle(folderStack.last?.name ?? "My Drive")
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItem(placement: .navigationBarLeading) {
                    if !folderStack.isEmpty {
                        Button("Back") { folderStack.removeLast(); Task { await load() } }
                    }
                }
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button { showNewFolder = true } label: { Image(systemName: "folder.badge.plus") }
                }
            }
            .alert("New folder", isPresented: $showNewFolder) {
                TextField("Folder name", text: $newFolderName)
                Button("Create") {
                    Task {
                        _ = try? await APIClient.shared.createFolder(name: newFolderName, parentId: currentFolderId)
                        newFolderName = ""; await load()
                    }
                }
                Button("Cancel", role: .cancel) { newFolderName = "" }
            }
        }
    }

    // MARK: Starred view
    var starredView: some View {
        NavigationStack {
            Group {
                if loading { ProgressView() }
                else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.adaptive(minimum: 150))], spacing: 10) {
                            ForEach(files.filter { $0.isStarred }) { f in
                                FileCardView(file: f, onStar: {
                                    Task { _ = try? await APIClient.shared.toggleStar(id: f.id); await load() }
                                })
                            }
                        }
                        .padding()
                    }
                }
            }
            .navigationTitle("Starred")
        }
    }

    private func load() async {
        loading = true; error = nil
        do {
            let res = try await APIClient.shared.listFiles(folderId: currentFolderId)
            files = res.files; folders = res.folders
        } catch { self.error = error.localizedDescription }
        loading = false
    }
}

struct FolderCardView: View {
    let folder: FolderItem
    let onClick: () -> Void
    var body: some View {
        Button(action: onClick) {
            VStack(spacing: 8) {
                Image(systemName: "folder.fill").font(.system(size: 36)).foregroundStyle(.purple)
                Text(folder.name).font(.caption).fontWeight(.medium).lineLimit(2).multilineTextAlignment(.center)
            }
            .frame(maxWidth: .infinity).padding(12)
            .background(Color(.secondarySystemBackground))
            .clipShape(RoundedRectangle(cornerRadius: 12))
        }
        .buttonStyle(.plain)
    }
}

struct FileCardView: View {
    let file: FileItem
    let onStar: () -> Void
    var body: some View {
        VStack(spacing: 6) {
            Image(systemName: iconName(file.mimeType))
                .font(.system(size: 36))
                .foregroundStyle(iconColor(file.mimeType))
            Text(file.name).font(.caption).fontWeight(.medium).lineLimit(2).multilineTextAlignment(.center)
            HStack {
                Text(formatSize(file.sizeBytes)).font(.caption2).foregroundStyle(.secondary)
                Spacer()
                Button(action: onStar) {
                    Image(systemName: file.isStarred ? "star.fill" : "star")
                        .foregroundStyle(file.isStarred ? .yellow : .secondary)
                        .font(.caption)
                }
            }
        }
        .frame(maxWidth: .infinity).padding(12)
        .background(Color(.secondarySystemBackground))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
    private func iconName(_ mime: String) -> String {
        if mime.hasPrefix("image/") { return "photo" }
        if mime.hasPrefix("video/") { return "video" }
        if mime.hasPrefix("audio/") { return "music.note" }
        if mime.contains("pdf")     { return "doc.richtext" }
        if mime.contains("zip")     { return "archivebox" }
        return "doc"
    }
    private func iconColor(_ mime: String) -> Color {
        if mime.hasPrefix("image/") { return .blue }
        if mime.hasPrefix("video/") { return .red }
        if mime.hasPrefix("audio/") { return .purple }
        if mime.contains("pdf")     { return .orange }
        return .gray
    }
}

struct SettingsViewiOS: View {
    @EnvironmentObject var auth: AuthStore
    var body: some View {
        NavigationStack {
            List {
                Section("Account") {
                    LabeledContent("Email", value: auth.user?.email ?? "—")
                    LabeledContent("Name",  value: auth.user?.name  ?? "—")
                    LabeledContent("2FA",   value: auth.user?.totpEnabled == true ? "Enabled" : "Disabled")
                }
                Section("Storage") {
                    if let u = auth.user {
                        let used = formatSize(u.storageUsedBytes)
                        let quota = u.storageQuotaBytes > 0 ? formatSize(u.storageQuotaBytes) : "Unlimited"
                        LabeledContent("Used", value: "\(used) of \(quota)")
                    }
                }
                Section {
                    Button("Sign out", role: .destructive) { auth.logout() }
                }
            }
            .navigationTitle("Settings")
        }
    }
}
