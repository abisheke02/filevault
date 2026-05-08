import SwiftUI

struct LoginView: View {
    @EnvironmentObject var auth: AuthStore
    @State private var email    = ""
    @State private var password = ""
    @State private var totpCode = ""
    @State private var needsTotp = false
    @State private var loading  = false
    @State private var error: String?

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                VStack(spacing: 4) {
                    Image(systemName: "externaldrive.fill")
                        .font(.system(size: 48))
                        .foregroundStyle(.purple)
                    Text("FileVault")
                        .font(.largeTitle.bold())
                    Text("Your private cloud storage")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
                .padding(.top, 40)

                if !needsTotp {
                    VStack(spacing: 12) {
                        TextField("Email", text: $email)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.emailAddress)
                            .autocapitalization(.none)
                        SecureField("Password", text: $password)
                            .textFieldStyle(.roundedBorder)
                    }
                } else {
                    VStack(spacing: 8) {
                        Label("Two-factor authentication", systemImage: "lock.shield")
                            .font(.headline)
                        Text("Enter the 6-digit code from your authenticator app.")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                            .multilineTextAlignment(.center)
                        TextField("000000", text: $totpCode)
                            .textFieldStyle(.roundedBorder)
                            .keyboardType(.numberPad)
                            .multilineTextAlignment(.center)
                            .font(.title2.monospacedDigit())
                            .onChange(of: totpCode) { _, v in
                                if v.count > 6 { totpCode = String(v.prefix(6)) }
                            }
                    }
                }

                if let e = error {
                    Text(e).font(.caption).foregroundStyle(.red)
                }

                Button {
                    Task { await submit() }
                } label: {
                    if loading {
                        ProgressView().tint(.white)
                    } else {
                        Label(needsTotp ? "Verify" : "Sign in", systemImage: needsTotp ? "checkmark.shield" : "arrow.right")
                            .frame(maxWidth: .infinity)
                    }
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .disabled(loading || (needsTotp ? totpCode.count != 6 : email.isEmpty || password.isEmpty))

                if needsTotp {
                    Button("← Back") { needsTotp = false; totpCode = "" }
                        .foregroundStyle(.secondary)
                }

                Spacer()
            }
            .padding(.horizontal, 32)
        }
    }

    private func submit() async {
        loading = true; error = nil
        do {
            let res = try await APIClient.shared.login(
                email: email, password: password,
                totp: needsTotp ? totpCode : nil
            )
            if res.needsTotp == true {
                needsTotp = true
            } else if let t = res.accessToken, let u = res.user {
                auth.setAuth(token: t, user: u)
            } else {
                error = "Unexpected server response"
            }
        } catch {
            self.error = error.localizedDescription
        }
        loading = false
    }
}
