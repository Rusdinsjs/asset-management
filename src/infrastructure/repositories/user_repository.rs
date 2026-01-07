//! User Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::{User, UserSummary};

#[derive(Clone)]
pub struct UserRepository {
    pool: PgPool,
}

impl UserRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT 
                id, email, password_hash, name, role, department_id, organization_id,
                NULL::text as phone, NULL::text as avatar_url,
                is_active, false as email_verified, NULL::timestamptz as last_login_at,
                created_at, updated_at
            FROM users WHERE id = $1
            "#,
        )
        .bind(id)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn find_by_email(&self, email: &str) -> Result<Option<User>, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            SELECT 
                id, email, password_hash, name, role, department_id, organization_id,
                NULL::text as phone, NULL::text as avatar_url,
                is_active, false as email_verified, NULL::timestamptz as last_login_at,
                created_at, updated_at
            FROM users WHERE email = $1
            "#,
        )
        .bind(email)
        .fetch_optional(&self.pool)
        .await
    }

    pub async fn list(&self, limit: i64, offset: i64) -> Result<Vec<UserSummary>, sqlx::Error> {
        sqlx::query_as::<_, UserSummary>(
            r#"
            SELECT id, email, name, role, department_id, is_active
            FROM users
            ORDER BY name
            LIMIT $1 OFFSET $2
            "#,
        )
        .bind(limit)
        .bind(offset)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn create(&self, user: &User) -> Result<User, sqlx::Error> {
        sqlx::query_as::<_, User>(
            r#"
            INSERT INTO users (id, email, password_hash, name, role, department_id, organization_id, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING 
                id, email, password_hash, name, role, department_id, organization_id,
                NULL::text as phone, NULL::text as avatar_url,
                is_active, false as email_verified, NULL::timestamptz as last_login_at,
                created_at, updated_at
            "#,
        )
        .bind(user.id)
        .bind(&user.email)
        .bind(&user.password_hash)
        .bind(&user.name)
        .bind(&user.role)
        .bind(user.department_id)
        .bind(user.organization_id)
        .bind(user.is_active)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update_last_login(&self, id: Uuid) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET updated_at = NOW() WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn update_password(&self, id: Uuid, password_hash: &str) -> Result<(), sqlx::Error> {
        sqlx::query("UPDATE users SET password_hash = $2, updated_at = NOW() WHERE id = $1")
            .bind(id)
            .bind(password_hash)
            .execute(&self.pool)
            .await?;
        Ok(())
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM users WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
