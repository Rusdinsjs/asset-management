//! Redis Client
//!
//! Redis cache client for session management, caching, and rate limiting.

use serde::{de::DeserializeOwned, Serialize};
use std::time::Duration;

/// Redis configuration
#[derive(Debug, Clone)]
pub struct RedisConfig {
    pub url: String,
    pub pool_size: u32,
    pub default_ttl: Duration,
}

impl Default for RedisConfig {
    fn default() -> Self {
        Self {
            url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            pool_size: 10,
            default_ttl: Duration::from_secs(3600), // 1 hour
        }
    }
}

impl RedisConfig {
    pub fn from_env() -> Self {
        Self {
            url: std::env::var("REDIS_URL")
                .unwrap_or_else(|_| "redis://localhost:6379".to_string()),
            pool_size: std::env::var("REDIS_POOL_SIZE")
                .ok()
                .and_then(|s| s.parse().ok())
                .unwrap_or(10),
            default_ttl: Duration::from_secs(
                std::env::var("REDIS_DEFAULT_TTL")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(3600),
            ),
        }
    }
}

/// Redis cache operations trait
///
/// Note: This is a trait definition. Implementation requires adding `redis` crate to Cargo.toml
/// For now, we provide a mock implementation for development.
#[async_trait::async_trait]
pub trait CacheOperations: Send + Sync {
    /// Get a value from cache
    async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, CacheError>;

    /// Set a value in cache with TTL
    async fn set<T: Serialize + Send + Sync>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError>;

    /// Delete a value from cache
    async fn delete(&self, key: &str) -> Result<(), CacheError>;

    /// Check if key exists
    async fn exists(&self, key: &str) -> Result<bool, CacheError>;

    /// Increment a counter (for rate limiting)
    async fn incr(&self, key: &str, ttl: Duration) -> Result<i64, CacheError>;

    /// Set with expiry if not exists (for distributed locks)
    async fn set_nx(&self, key: &str, value: &str, ttl: Duration) -> Result<bool, CacheError>;
}

/// Cache error types
#[derive(Debug)]
pub enum CacheError {
    ConnectionError(String),
    SerializationError(String),
    DeserializationError(String),
    OperationError(String),
    NotConnected,
}

impl std::fmt::Display for CacheError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::ConnectionError(msg) => write!(f, "Cache connection error: {}", msg),
            Self::SerializationError(msg) => write!(f, "Cache serialization error: {}", msg),
            Self::DeserializationError(msg) => write!(f, "Cache deserialization error: {}", msg),
            Self::OperationError(msg) => write!(f, "Cache operation error: {}", msg),
            Self::NotConnected => write!(f, "Cache not connected"),
        }
    }
}

impl std::error::Error for CacheError {}

/// In-memory cache for development/testing (no Redis dependency)
pub struct InMemoryCache {
    store: std::sync::RwLock<
        std::collections::HashMap<String, (String, std::time::Instant, Duration)>,
    >,
    default_ttl: Duration,
}

impl InMemoryCache {
    pub fn new(default_ttl: Duration) -> Self {
        Self {
            store: std::sync::RwLock::new(std::collections::HashMap::new()),
            default_ttl,
        }
    }

    pub fn default() -> Self {
        Self::new(Duration::from_secs(3600))
    }
}

#[async_trait::async_trait]
impl CacheOperations for InMemoryCache {
    async fn get<T: DeserializeOwned>(&self, key: &str) -> Result<Option<T>, CacheError> {
        let store = self
            .store
            .read()
            .map_err(|e| CacheError::OperationError(e.to_string()))?;

        if let Some((value, created, ttl)) = store.get(key) {
            if created.elapsed() < *ttl {
                let parsed: T = serde_json::from_str(value)
                    .map_err(|e| CacheError::DeserializationError(e.to_string()))?;
                return Ok(Some(parsed));
            }
        }

        Ok(None)
    }

    async fn set<T: Serialize + Send + Sync>(
        &self,
        key: &str,
        value: &T,
        ttl: Option<Duration>,
    ) -> Result<(), CacheError> {
        let json = serde_json::to_string(value)
            .map_err(|e| CacheError::SerializationError(e.to_string()))?;

        let mut store = self
            .store
            .write()
            .map_err(|e| CacheError::OperationError(e.to_string()))?;
        store.insert(
            key.to_string(),
            (
                json,
                std::time::Instant::now(),
                ttl.unwrap_or(self.default_ttl),
            ),
        );

        Ok(())
    }

    async fn delete(&self, key: &str) -> Result<(), CacheError> {
        let mut store = self
            .store
            .write()
            .map_err(|e| CacheError::OperationError(e.to_string()))?;
        store.remove(key);
        Ok(())
    }

    async fn exists(&self, key: &str) -> Result<bool, CacheError> {
        let store = self
            .store
            .read()
            .map_err(|e| CacheError::OperationError(e.to_string()))?;

        if let Some((_, created, ttl)) = store.get(key) {
            return Ok(created.elapsed() < *ttl);
        }

        Ok(false)
    }

    async fn incr(&self, key: &str, ttl: Duration) -> Result<i64, CacheError> {
        let mut store = self
            .store
            .write()
            .map_err(|e| CacheError::OperationError(e.to_string()))?;

        let count = if let Some((value, created, _)) = store.get(key) {
            if created.elapsed() < ttl {
                value.parse::<i64>().unwrap_or(0) + 1
            } else {
                1
            }
        } else {
            1
        };

        store.insert(
            key.to_string(),
            (count.to_string(), std::time::Instant::now(), ttl),
        );

        Ok(count)
    }

    async fn set_nx(&self, key: &str, value: &str, ttl: Duration) -> Result<bool, CacheError> {
        let mut store = self
            .store
            .write()
            .map_err(|e| CacheError::OperationError(e.to_string()))?;

        // Check if key exists and is not expired
        if let Some((_, created, existing_ttl)) = store.get(key) {
            if created.elapsed() < *existing_ttl {
                return Ok(false); // Key exists, don't set
            }
        }

        store.insert(
            key.to_string(),
            (value.to_string(), std::time::Instant::now(), ttl),
        );
        Ok(true)
    }
}

/// Cache key builder for consistent key naming
pub struct CacheKey;

impl CacheKey {
    /// Asset cache key
    pub fn asset(id: &uuid::Uuid) -> String {
        format!("asset:{}", id)
    }

    /// Asset list cache key
    pub fn asset_list(page: i64, per_page: i64) -> String {
        format!("assets:list:{}:{}", page, per_page)
    }

    /// User session cache key
    pub fn user_session(user_id: &uuid::Uuid) -> String {
        format!("session:{}", user_id)
    }

    /// Rate limit cache key
    pub fn rate_limit(user_id: &uuid::Uuid, endpoint: &str) -> String {
        format!("ratelimit:{}:{}", user_id, endpoint)
    }

    /// JWT token blacklist
    pub fn token_blacklist(jti: &str) -> String {
        format!("token:blacklist:{}", jti)
    }
}
