//! Category Repository

use sqlx::PgPool;
use uuid::Uuid;

use crate::domain::entities::Category;

#[derive(Clone)]
pub struct CategoryRepository {
    pool: PgPool,
}

impl CategoryRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }

    pub async fn find_by_id(&self, id: Uuid) -> Result<Option<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE id = $1")
            .bind(id)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn find_by_code(&self, code: &str) -> Result<Option<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE code = $1")
            .bind(code)
            .fetch_optional(&self.pool)
            .await
    }

    pub async fn list(&self) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories ORDER BY name")
            .fetch_all(&self.pool)
            .await
    }

    pub async fn list_root(&self) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            "SELECT * FROM categories WHERE parent_id IS NULL ORDER BY name",
        )
        .fetch_all(&self.pool)
        .await
    }

    pub async fn list_children(&self, parent_id: Uuid) -> Result<Vec<Category>, sqlx::Error> {
        sqlx::query_as::<_, Category>("SELECT * FROM categories WHERE parent_id = $1 ORDER BY name")
            .bind(parent_id)
            .fetch_all(&self.pool)
            .await
    }

    pub async fn create(&self, category: &Category) -> Result<Category, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            r#"
            INSERT INTO categories (id, parent_id, code, name, description, attributes)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
            "#,
        )
        .bind(category.id)
        .bind(category.parent_id)
        .bind(&category.code)
        .bind(&category.name)
        .bind(&category.description)
        .bind(&category.attributes_schema)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn update(&self, category: &Category) -> Result<Category, sqlx::Error> {
        sqlx::query_as::<_, Category>(
            r#"
            UPDATE categories SET
                parent_id = $2, code = $3, name = $4, description = $5, attributes = $6,
                updated_at = NOW()
            WHERE id = $1
            RETURNING *
            "#,
        )
        .bind(category.id)
        .bind(category.parent_id)
        .bind(&category.code)
        .bind(&category.name)
        .bind(&category.description)
        .bind(&category.attributes_schema)
        .fetch_one(&self.pool)
        .await
    }

    pub async fn delete(&self, id: Uuid) -> Result<bool, sqlx::Error> {
        let result = sqlx::query("DELETE FROM categories WHERE id = $1")
            .bind(id)
            .execute(&self.pool)
            .await?;
        Ok(result.rows_affected() > 0)
    }
}
