package com.filevault.ui

import androidx.compose.runtime.Composable
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.rememberNavController
import com.filevault.ui.screens.DriveScreen
import com.filevault.ui.screens.LoginScreen
import com.filevault.ui.screens.SettingsScreen

sealed class Screen(val route: String) {
    object Login    : Screen("login")
    object Drive    : Screen("drive?folderId={folderId}") {
        fun withFolder(id: String?) = if (id != null) "drive?folderId=$id" else "drive?folderId="
    }
    object Settings : Screen("settings")
}

@Composable
fun FileVaultApp() {
    val nav = rememberNavController()

    NavHost(navController = nav, startDestination = Screen.Login.route) {
        composable(Screen.Login.route) {
            LoginScreen(onSuccess = { nav.navigate("drive?folderId=") { popUpTo(0) } })
        }
        composable(Screen.Drive.route) { back ->
            val folderId = back.arguments?.getString("folderId")?.takeIf { it.isNotBlank() }
            DriveScreen(
                folderId = folderId,
                onOpenFolder = { nav.navigate(Screen.Drive.withFolder(it)) },
                onSettings   = { nav.navigate(Screen.Settings.route) },
            )
        }
        composable(Screen.Settings.route) {
            SettingsScreen(onBack = { nav.popBackStack() })
        }
    }
}
