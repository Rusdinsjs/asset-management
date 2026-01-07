//! Domain Entities
//!
//! Core business entities representing the main concepts in the asset management domain.

pub mod asset;
pub mod asset_lifecycle;
pub mod category;
pub mod department;
pub mod loan;
pub mod location;
pub mod maintenance;
pub mod organization;
pub mod sensor;
pub mod user;
pub mod vendor;
pub mod work_order;

pub use asset::*;
pub use asset_lifecycle::*;
pub use category::*;
pub use department::*;
pub use loan::*;
pub use location::*;
pub use maintenance::*;
pub use organization::*;
pub use sensor::*;
pub use user::*;
pub use vendor::*;
pub use work_order::*;
