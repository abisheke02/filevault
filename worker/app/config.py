from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    redis_url: str = "redis://localhost:6379"
    minio_endpoint: str = "minio"
    minio_port: int = 9000
    minio_use_ssl: bool = False
    minio_access_key: str = "minioadmin"
    minio_secret_key: str = ""
    minio_bucket: str = "filevault-data"
    meili_host: str = "http://meilisearch:7700"
    meili_master_key: str = ""
    database_url: str = ""
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False

settings = Settings()
