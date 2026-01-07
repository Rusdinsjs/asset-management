//! RBAC Repository

use sqlx::PgPool;
use uuid::Uuid;

/// Role model
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Role {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub is_system: bool,
    pub created_at: chrono::DateTime<chrono::Utc>,
    pub updated_at: chrono::DateTime<chrono::Utc>,
}

/// Permission model
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct Permission {
    pub id: Uuid,
    pub code: String,
    pub name: String,
    pub description: Option<String>,
    pub resource: String,
    pub action: String,
    pub created_at: chrono::DateTime<chrono::Utc>,
}

/// User role assignment
#[derive(Debug, Clone, sqlx::FromRow, serde::Serialize)]
pub struct UserRole {
    pub id: Uuid,
    pub user_id: Uuid,
    pub role_id: Uuid,
    pub organization_id: Option<Uuid>,
    pub granted_by: Option<Uuid>,
    pub granted_at: chrono::DateTime<chrono::Utc>,
    pub expires_at: Option<chrono::DateTime<chrono::Utc>>,
}

#[derive(Clone)]
pub struct RbacRepository {
    pool: PgPool,
}

impl RbacRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    // Role methods
    pub async fn find_role_by_id(&self, id: Uuid) -> Result<Option<Role>, sqlx::Error> {
        sqlx::query_as::<_, Role>("SELECT * FROM roles WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_role_by_code(&self, code: &str) -> Result<Option<Role>, sqlx::Error> {
        sqlx::query_as::<_, Role>("SELECT * FROM roles WHERE code = $1")
            .bind(code)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list_roles(&self) -> Result<Vec<Role>, sqlx::Error> {
        sqlx::query_as::<_, Role>("SELECT * FROM roles ORDER BY name")
            .fetch_all(&self.pool)
            .await
    }

    // Permission methods
    pub async fn list_permissions(&self) -> Result<Vec<Permission>, sqlx::Error> {
        sqlx::query_as::<_, Permission>("SELECT * FROM permissions ORDER BY resource, action")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn get_role_permissions(
        &self,
        role_id: Uuid,
    ) -> Result<Vec<Permission>, sqlx::Error> {
        sqlx::query_as::<_, Permission>(
            r#"
            SELECT p.* FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            WHERE rp.role_id = $1
            ORDER BY p.resource, p.action
            "#,
        )
        .bind(role_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn add_permission_to_role(
        &self,
        role_id: Uuid,
        permission_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query(
            "INSERT INTO role_permissions (id, role_id, permission_id) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT DO NOTHING"
        )
        .bind(role_id)
        .bind(permission_id)
        .execute(&self.pool)
        .await?;
        Ok(result.rows_affected() > 0)
    }

    // User role methods
    pub async fn get_user_roles(&self, user_id: Uuid) -> Result<Vec<Role>, sqlx::Error> {
        sqlx::query_as::<_, Role>(
            r#"
            SELECT r.* FROM roles r
            INNER JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = $1 
              AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            ORDER BY r.name
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn get_user_permissions(
        &self,
        user_id: Uuid,
    ) -> Result<Vec<Permission>, sqlx::Error> {
        sqlx::query_as::<_, Permission>(
            r#"
            SELECT DISTINCT p.* FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1 
              AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            ORDER BY p.resource, p.action
            "#,
        )
        .bind(user_id)
        .fetch_all(&self.pool)
        .await
    }

    pub async fn user_has_permission(
        &self,
        user_id: Uuid,
        permission_code: &str,
    ) -> Result<bool, sqlx::Error> {
        let result: (i64,) = sqlx::query_as(
            r#"
            SELECT COUNT(*) FROM permissions p
            INNER JOIN role_permissions rp ON p.id = rp.permission_id
            INNER JOIN user_roles ur ON rp.role_id = ur.role_id
            WHERE ur.user_id = $1 
              AND p.code = $2
              AND (ur.expires_at IS NULL OR ur.expires_at > NOW())
            "#,
        )
        .bind(user_id)
        .bind(permission_code)
        .fetch_one(&self.pool)
        .await?;
        Ok(result.0 > 0)
    }

    pub async fn assign_role_to_user(
        &self,
        user_id: Uuid,
        role_id: Uuid,
        granted_by: Option<Uuid>,
        organization_id: Option<Uuid>,
    ) -> Result<UserRole, sqlx::Error> {
        sqlx::query_as::<_, UserRole>(
            r#"
            INSERT INTO user_roles (id, user_id, role_id, organization_id, granted_by)
            VALUES (gen_random_uuid(), $1, $2, $3, $4)
            ON CONFLICT (user_id, role_id, organization_id) DO NOTHING
            RETURNING *
            "#,
        )
        .bind(user_id)
        .bind(role_id)
        .bind(organization_id)
        .bind(granted_by)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn remove_role_from_user(
        &self,
        user_id: Uuid,
        role_id: Uuid,
    ) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM user_roles WHERE user_id = $1 AND role_id = $2")
            .bind(user_id)
            .bind(role_id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
