package com.filevault.api

import com.filevault.data.AuthResponse
import com.filevault.data.FileItem
import com.filevault.data.FolderItem
import com.filevault.data.ListResponse
import okhttp3.MultipartBody
import retrofit2.http.*

interface FileVaultApi {
    @POST("auth/login")
    suspend fun login(@Body body: Map<String, String>): AuthResponse

    @POST("auth/register")
    suspend fun register(@Body body: Map<String, String>): AuthResponse

    @GET("files")
    suspend fun listFiles(@Query("folderId") folderId: String? = null): ListResponse

    @GET("files/starred")
    suspend fun listStarred(): ListResponse

    @GET("files/trash")
    suspend fun listTrash(): List<FileItem>

    @Multipart
    @POST("files/upload")
    suspend fun upload(
        @Part file: MultipartBody.Part,
        @Query("folderId") folderId: String? = null,
    ): FileItem

    @DELETE("files/{id}")
    suspend fun trashFile(@Path("id") id: String)

    @POST("files/{id}/restore")
    suspend fun restoreFile(@Path("id") id: String)

    @PATCH("files/{id}/star")
    suspend fun toggleStar(@Path("id") id: String): FileItem

    @GET("files/{id}/versions")
    suspend fun getVersions(@Path("id") id: String): List<Map<String, Any>>

    @GET("folders")
    suspend fun listFolders(@Query("parentId") parentId: String? = null): List<FolderItem>

    @POST("folders")
    suspend fun createFolder(@Body body: Map<String, String>): FolderItem

    @DELETE("folders/{id}")
    suspend fun deleteFolder(@Path("id") id: String)
}
