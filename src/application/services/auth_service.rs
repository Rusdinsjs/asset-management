//! Auth Service

use chrono::{Duration, Utc};
use uuid::Uuid;

use crate::domain::entities::{User, UserClaims, UserRole};
use crate::domain::errors::{DomainError, DomainResult};
use crate::infrastructure::repositories::UserRepository;
use crate::shared::utils::jwt::{create_token, JwtConfig};

/// Auth service
#[derive(Clone)]
pub struct AuthService {
    repository: UserRepository,
    jwt_config: JwtConfig,
}

impl AuthService {
    pub fn new(repository: UserRepository, jwt_config: JwtConfig) -> Self {
        Self {
            repository,
            jwt_config,
        }
    }

    /// Login user
    pub async fn login(&self, email: &str, password: &str) -> DomainResult<(User, String)> {
        let user = self
            .repository
            .find_by_email(email)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })?
            .ok_or_else(|| DomainError::unauthorized("Invalid credentials"))?;

        if !user.is_active {
            return Err(DomainError::unauthorized("Account is disabled"));
        }

        // Verify password
        if !verify_password(password, &user.password_hash) {
            return Err(DomainError::unauthorized("Invalid credentials"));
        }

        // Update last login
        let _ = self.repository.update_last_login(user.id).await;

        // Generate JWT token
        let role = UserRole::from_str(&user.role).unwrap_or(UserRole::User);
        let claims = UserClaims {
            sub: user.id.to_string(),
            email: user.email.clone(),
            name: user.name.clone(),
            role: user.role.clone(),
            org: user.organization_id.map(|id| id.to_string()),
            permissions: role
                .default_permissions()
                .iter()
                .map(|s| s.to_string())
                .collect(),
            exp: (Utc::now() + Duration::hours(24)).timestamp(),
            iat: Utc::now().timestamp(),
            jti: Uuid::new_v4().to_string(),
        };

        let token = create_token(&claims, &self.jwt_config).map_err(|e| {
            DomainError::ExternalServiceError {
                service: "jwt".to_string(),
                message: e,
            }
        })?;

        Ok((user, token))
    }

    /// Register new user
    pub async fn register(&self, email: &str, password: &str, name: &str) -> DomainResult<User> {
        // Check if email exists
        if let Some(_) = self.repository.find_by_email(email).await.map_err(|e| {
            DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            }
        })? {
            return Err(DomainError::conflict("Email already registered"));
        }

        let password_hash =
            hash_password(password).map_err(|e| DomainError::ExternalServiceError {
                service: "password_hash".to_string(),
                message: e,
            })?;

        let user = User::new(email.to_string(), password_hash, name.to_string());

        self.repository
            .create(&user)
            .await
            .map_err(|e| DomainError::ExternalServiceError {
                service: "database".to_string(),
                message: e.to_string(),
            })
    }
}

/// Hash password using argon2
fn hash_password(password: &str) -> Result<String, String> {
    use argon2::{
        password_hash::{rand_core::OsRng, PasswordHasher, SaltString},
        Argon2,
    };

    let salt = SaltString::generate(&mut OsRng);
    let argon2 = Argon2::default();

    argon2
        .hash_password(password.as_bytes(), &salt)
        .map(|hash| hash.to_string())
        .map_err(|e| e.to_string())
}

/// Verify password
fn verify_password(password: &str, hash: &str) -> bool {
    use argon2::{
        password_hash::{PasswordHash, PasswordVerifier},
        Argon2,
    };

    let parsed_hash = match PasswordHash::new(hash) {
        Ok(h) => h,
        Err(_) => return false,
    };

    Argon2::default()
        .verify_password(password.as_bytes(), &parsed_hash)
        .is_ok()
}
