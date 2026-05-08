package com.filevault.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Lock
import androidx.compose.material.icons.filled.Mail
import androidx.compose.material.icons.filled.Visibility
import androidx.compose.material.icons.filled.VisibilityOff
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.filevault.api.ApiClient
import kotlinx.coroutines.launch

@Composable
fun LoginScreen(onSuccess: () -> Unit) {
    val scope   = rememberCoroutineScope()
    var email   by remember { mutableStateOf("") }
    var pass    by remember { mutableStateOf("") }
    var showPw  by remember { mutableStateOf(false) }
    var totp    by remember { mutableStateOf("") }
    var needsTotp by remember { mutableStateOf(false) }
    var loading by remember { mutableStateOf(false) }
    var error   by remember { mutableStateOf<String?>(null) }

    Column(
        modifier = Modifier.fillMaxSize().padding(32.dp),
        verticalArrangement = Arrangement.Center,
        horizontalAlignment = Alignment.CenterHorizontally,
    ) {
        Text("FileVault", fontSize = 28.sp, fontWeight = FontWeight.Bold, color = MaterialTheme.colorScheme.primary)
        Text("Your private cloud storage", fontSize = 14.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
        Spacer(Modifier.height(40.dp))

        if (!needsTotp) {
            OutlinedTextField(
                value = email, onValueChange = { email = it },
                label = { Text("Email") },
                leadingIcon = { Icon(Icons.Default.Mail, null) },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email),
                modifier = Modifier.fillMaxWidth(),
            )
            Spacer(Modifier.height(12.dp))
            OutlinedTextField(
                value = pass, onValueChange = { pass = it },
                label = { Text("Password") },
                leadingIcon = { Icon(Icons.Default.Lock, null) },
                trailingIcon = {
                    IconButton(onClick = { showPw = !showPw }) {
                        Icon(if (showPw) Icons.Default.VisibilityOff else Icons.Default.Visibility, null)
                    }
                },
                visualTransformation = if (showPw) VisualTransformation.None else PasswordVisualTransformation(),
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password),
                modifier = Modifier.fillMaxWidth(),
            )
        } else {
            Text("Two-factor authentication", fontWeight = FontWeight.SemiBold, fontSize = 16.sp)
            Text("Enter the 6-digit code from your authenticator app.", color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 13.sp)
            Spacer(Modifier.height(16.dp))
            OutlinedTextField(
                value = totp, onValueChange = { if (it.length <= 6) totp = it.filter(Char::isDigit) },
                label = { Text("6-digit code") },
                keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.NumberPassword),
                modifier = Modifier.fillMaxWidth(),
                singleLine = true,
            )
        }

        error?.let {
            Spacer(Modifier.height(8.dp))
            Text(it, color = MaterialTheme.colorScheme.error, fontSize = 13.sp)
        }

        Spacer(Modifier.height(20.dp))
        Button(
            onClick = {
                scope.launch {
                    loading = true; error = null
                    try {
                        val body = mutableMapOf("email" to email, "password" to pass)
                        if (needsTotp) body["totpToken"] = totp
                        val res = ApiClient.api().login(body)
                        if (res.needsTotp) { needsTotp = true }
                        else onSuccess()
                    } catch (e: Exception) {
                        error = e.message ?: "Login failed"
                    } finally { loading = false }
                }
            },
            enabled = !loading && (if (needsTotp) totp.length == 6 else email.isNotBlank() && pass.isNotBlank()),
            modifier = Modifier.fillMaxWidth().height(48.dp),
        ) {
            if (loading) CircularProgressIndicator(Modifier.size(20.dp), strokeWidth = 2.dp)
            else Text(if (needsTotp) "Verify" else "Sign in")
        }

        if (needsTotp) {
            TextButton(onClick = { needsTotp = false; totp = "" }) { Text("← Back") }
        }
    }
}
