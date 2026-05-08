package com.filevault.ui.screens

import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.grid.GridCells
import androidx.compose.foundation.lazy.grid.LazyVerticalGrid
import androidx.compose.foundation.lazy.grid.items
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.filevault.api.ApiClient
import com.filevault.data.FileItem
import com.filevault.data.FolderItem
import kotlinx.coroutines.launch

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun DriveScreen(
    folderId: String?,
    onOpenFolder: (String) -> Unit,
    onSettings: () -> Unit,
) {
    val scope   = rememberCoroutineScope()
    var files   by remember { mutableStateOf(emptyList<FileItem>()) }
    var folders by remember { mutableStateOf(emptyList<FolderItem>()) }
    var loading by remember { mutableStateOf(true) }
    var error   by remember { mutableStateOf<String?>(null) }
    var showNewFolder by remember { mutableStateOf(false) }
    var newFolderName by remember { mutableStateOf("") }

    fun refresh() {
        scope.launch {
            loading = true; error = null
            try {
                val res = ApiClient.api().listFiles(folderId)
                files = res.files; folders = res.folders
            } catch (e: Exception) { error = e.message }
            finally { loading = false }
        }
    }

    LaunchedEffect(folderId) { refresh() }

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("My Drive", fontWeight = FontWeight.Bold) },
                actions = {
                    IconButton(onClick = { showNewFolder = true }) { Icon(Icons.Default.CreateNewFolder, "New folder") }
                    IconButton(onClick = onSettings) { Icon(Icons.Default.Settings, "Settings") }
                }
            )
        },
        floatingActionButton = {
            FloatingActionButton(onClick = { /* open file picker */ }) {
                Icon(Icons.Default.Upload, "Upload")
            }
        },
    ) { pad ->
        Box(Modifier.fillMaxSize().padding(pad)) {
            when {
                loading -> CircularProgressIndicator(Modifier.align(Alignment.Center))
                error != null -> Text(error!!, color = MaterialTheme.colorScheme.error, modifier = Modifier.align(Alignment.Center))
                else -> LazyVerticalGrid(
                    columns = GridCells.Adaptive(160.dp),
                    contentPadding = PaddingValues(12.dp),
                    verticalArrangement = Arrangement.spacedBy(8.dp),
                    horizontalArrangement = Arrangement.spacedBy(8.dp),
                ) {
                    items(folders, key = { it.id }) { folder ->
                        FolderCard(folder, onClick = { onOpenFolder(folder.id) })
                    }
                    items(files, key = { it.id }) { file ->
                        FileCard(file, onStar = {
                            scope.launch { ApiClient.api().toggleStar(file.id); refresh() }
                        })
                    }
                }
            }
        }
    }

    if (showNewFolder) {
        AlertDialog(
            onDismissRequest = { showNewFolder = false; newFolderName = "" },
            title = { Text("New folder") },
            text = {
                OutlinedTextField(
                    value = newFolderName,
                    onValueChange = { newFolderName = it },
                    label = { Text("Folder name") },
                    singleLine = true,
                )
            },
            confirmButton = {
                TextButton(onClick = {
                    scope.launch {
                        val body = mutableMapOf("name" to newFolderName)
                        folderId?.let { body["parentId"] = it }
                        ApiClient.api().createFolder(body)
                        showNewFolder = false; newFolderName = ""; refresh()
                    }
                }, enabled = newFolderName.isNotBlank()) { Text("Create") }
            },
            dismissButton = { TextButton(onClick = { showNewFolder = false; newFolderName = "" }) { Text("Cancel") } }
        )
    }
}

@Composable
private fun FolderCard(folder: FolderItem, onClick: () -> Unit) {
    Card(onClick = onClick, modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.Folder, null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.primary)
            Spacer(Modifier.height(6.dp))
            Text(folder.name, fontWeight = FontWeight.Medium, fontSize = 13.sp, maxLines = 2)
        }
    }
}

@Composable
private fun FileCard(file: FileItem, onStar: () -> Unit) {
    Card(modifier = Modifier.fillMaxWidth()) {
        Column(Modifier.padding(12.dp), horizontalAlignment = Alignment.CenterHorizontally) {
            Icon(Icons.Default.InsertDriveFile, null, modifier = Modifier.size(40.dp), tint = MaterialTheme.colorScheme.secondary)
            Spacer(Modifier.height(6.dp))
            Text(file.name, fontSize = 13.sp, fontWeight = FontWeight.Medium, maxLines = 2)
            Spacer(Modifier.height(4.dp))
            Row(verticalAlignment = Alignment.CenterVertically) {
                Text(formatSize(file.size), fontSize = 11.sp, color = MaterialTheme.colorScheme.onSurfaceVariant)
                Spacer(Modifier.weight(1f))
                IconButton(onClick = onStar, modifier = Modifier.size(28.dp)) {
                    Icon(
                        if (file.isStarred) Icons.Default.Star else Icons.Default.StarBorder,
                        null,
                        tint = if (file.isStarred) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurfaceVariant,
                        modifier = Modifier.size(18.dp),
                    )
                }
            }
        }
    }
}

private fun formatSize(bytes: Long): String = when {
    bytes >= 1_000_000_000L -> "%.1f GB".format(bytes / 1_000_000_000.0)
    bytes >= 1_000_000L     -> "%.1f MB".format(bytes / 1_000_000.0)
    bytes >= 1_000L         -> "${bytes / 1_000} KB"
    else                    -> "$bytes B"
}
