package com.filevault.api

import android.content.Context
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory

val Context.dataStore by preferencesDataStore(name = "auth")
val TOKEN_KEY = stringPreferencesKey("access_token")
val SERVER_KEY = stringPreferencesKey("server_url")

object ApiClient {
    private var retrofit: Retrofit? = null
    private var context: Context? = null

    fun init(ctx: Context) {
        context = ctx.applicationContext
        rebuild()
    }

    private fun rebuild() {
        val ctx = context ?: return
        val serverUrl = runBlocking {
            ctx.dataStore.data.map { it[SERVER_KEY] ?: "http://192.168.29.113:3002" }.first()
        }
        val token = runBlocking {
            ctx.dataStore.data.map { it[TOKEN_KEY] }.first()
        }

        val authInterceptor = Interceptor { chain ->
            val req = if (!token.isNullOrBlank()) {
                chain.request().newBuilder()
                    .addHeader("Authorization", "Bearer $token")
                    .build()
            } else chain.request()
            chain.proceed(req)
        }

        val logging = HttpLoggingInterceptor().apply {
            level = HttpLoggingInterceptor.Level.BASIC
        }

        val client = OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(logging)
            .build()

        retrofit = Retrofit.Builder()
            .baseUrl("$serverUrl/api/")
            .client(client)
            .addConverterFactory(GsonConverterFactory.create())
            .build()
    }

    fun api(): FileVaultApi = retrofit!!.create(FileVaultApi::class.java)
}
