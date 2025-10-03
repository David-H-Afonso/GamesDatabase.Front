# Features to Implement

**ANTES DE QUE VENGA TOMI**

- URGENTE: LA APP VA COMO EL CULO ✅
- URGENTE: LAS VISTAS NO FUNCIONAN ✅
- Ordenar por añadido (fecha creación) ✅
- Ordenar por editado (fecha ultima edición, creado si no tiene) ✅
- Filtros: Ocultar status especificos ✅
- Admin, crear vistas personalizadas con los filtros especificos pasandolos
  - Estilos de admin mejorados ✅
  - Plataformas por defecto ✅
  - Play with multiples personas ✅
  - Status jugando especial ✅
  - Poder reorganizar played status, play with y plataformas ✅
  - Elementos por pagina minimo 50 ✅
- Mejorar vista móvil ✅
- Played status por defecto algunos ✅

- Añadir al servidor
- .exe
- Usuarios??

1. **Unpurchased Game Links**

- If a game is marked as "unpurchased," display options to view it on the Official Store or AllKeyShop.
- Add two optional fields in the database: `official_store_link` and `key_store_link`.
  - If `official_store_link` is provided, use it for the Official Store link.
  - If `key_store_link` is provided, use it for the AllKeyShop link.
  - If either field is empty:
  - Official Store: Redirect to a Google search by default, e.g., `https://www.google.com/search?q=NOMBRE_DEL_JUEGO`.
  - Allow users to configure a default store (e.g., Steam, Epic, Battle.net) for searches instead of Google.
  - AllKeyShop: Redirect to `https://www.allkeyshop.com/blog/products/?search_name=NOMBRE_DEL_JUEGO`.
- Determine how to define the "unpurchased" status in the database, which may require schema changes.

2. **First-Time Setup Wizard**

   - Implement a setup wizard that runs the first time the app is opened.
   - Check if the database contains any existing information to determine if the wizard is necessary.
   - Guide the user through initial configuration steps, such as:
     - Setting up database connections.
     - Adding the first game entries.
     - Configuring user preferences.
   - Ensure the wizard does not run again once the initial setup is complete.

3. **Integrated Image Search (Similar to Playnite)**

   - Implement an integrated mini browser for searching and adding game images directly within the app.
   - Allow users to enter a game name and perform an image search using a predefined search engine (e.g., Google Images or Bing Images).
   - Display search results in a scrollable, user-friendly interface within the app.
   - Enable users to select an image and automatically associate it with the game entry in the database or save it to local storage.
   - Provide basic image editing options, such as cropping or resizing, before saving the image.
   - Ensure seamless integration with the existing game entry system, similar to the functionality provided by Playnite.

4. **Status Enhancements**

   - Add specifics to game statuses:
     - Include an optional logo for each status.
     - Add special properties for specific statuses:
     - Mark one status as the default for "not owned" games.
     - Mark another status for games with incomplete information.
     - Ensure at least one status with these special properties exists.
     - Prevent deletion of a special status unless its property is transferred to another status.
     - If a new status is assigned the special property, the previous one loses it.

5. **Bulk Game Management**

   - Allow adding games in bulk with the default status set to "to fulfill."
   - Enable selecting multiple items to assign them to a specific category.
   - Display games grouped by category.
   - Provide a quick way to change tags.
   - Limit tag sizes to fit within the card layout for easier management.

6. **Game Details and Editing**

   - Allow score modification (pending approval).
   - Enable adding emojis or logos to status names (not editable per se).
   - Remove the dedicated edit function:
     - Allow editing fields directly by clicking on their values, similar to Notion.
   - Update the "Create" popup:
     - Make it minimal with a "More Details" option collapsed by default.
     - Allow quick setup while retaining the ability to create detailed entries.
   - Add the ability to duplicate games.

7. **Internationalization (i18n)**

   - Implement support for multiple languages.

8. **Bug Fixes (ASAP)**

   - Fix the issue where updating a card reloads the entire page and closes the details view.
   - Ensure the "Create" functionality opens a details view in creation mode:
     - Once created, switch to update mode for further edits.
   - Review the "Actions" button (`...`) on cards:
     - Consider removing the edit option since clicking the card already enables editing.
     - Evaluate if the button should remain for multi-selection functionality.
     - If removed, implement a separate multi-selection button in the header.
     - Add the necessary functionality for multi-selection.

9. **Many-to-Many Relationships for Platform, Status, Play With, and Play Status**

   - Update the database schema to support many-to-many relationships for the following fields:
     - Platform
     - Status
     - Play With
     - Play Status
   - Modify the backend to handle these relationships:
     - Create junction tables to store associations between games and the respective fields.
     - Update API endpoints to support adding, removing, and retrieving multiple values for these fields.
   - Update the frontend to reflect these changes:
     - Allow users to select multiple values for these fields in the game details view.
     - Display selected values in a user-friendly format.
     - Provide an interface for adding or removing associations dynamically.
   - Ensure seamless integration with existing features and maintain data consistency.

10. **Customizable Views (Admin-Managed, Stored on Backend)**

- Purpose:

  - Allow administrators to create, edit and manage named "views" (combinations of filters, sort, visible columns, layout and grouping) from an Admin page.
  - Persist views on the backend so they are shared across devices and users, with optional per-user favorites or overrides.

- Database schema (example fields):

  - views
    - id (PK)
    - name (string)
    - slug (string, unique)
    - description (string, optional)
    - owner_id (nullable, admin user id) — null => system/global view
    - is_global (bool)
    - settings (JSON) — includes filters, sort, columns, layout, group_by, tag_limits, card_size, etc.
    - allowed_roles (JSON or relation) — which roles can apply/manage the view
    - is_default_for_role (JSON) — optional mapping of role => default flag
    - created_at, updated_at, created_by, updated_by
  - user_view_overrides (optional)
    - id, user_id, view_id, override_settings (JSON), is_favorite, created_at, updated_at

- Backend changes:

  - New CRUD endpoints (authenticated/admin-protected where appropriate):
    - GET /api/views => list available views (global + allowed)
    - GET /api/views/{id} => retrieve view definition
    - POST /api/views => create view (admin only)
    - PUT /api/views/{id} => update view (owner/admin)
    - DELETE /api/views/{id} => delete view (with safety checks if referenced)
    - GET /api/users/{id}/views => user favorites/overrides
    - PUT /api/users/{id}/views/{viewId} => save override or favorite
  - Validation: ensure settings JSON schema is valid; sanitize fields used in queries.
  - Apply views server-side where possible to support server-side pagination/filtering; otherwise return settings for client-side application.
  - Permissions: enforce allowed_roles and owner checks for management endpoints.

- Frontend changes:

  - Admin Views page:
    - Create / Edit / Delete view UI with preview mode.
    - Form to configure filters, columns, sort, groupings, card layout, and default tag size constraints.
    - Assign view visibility (global, specific roles, specific users).
    - Mark view as default for roles.
  - Game listing UI:
    - Dropdown to switch between saved views.
    - Option to save current local configuration as a personal override/favorite.
    - Toggle to apply server-provided view vs. local customizations.
    - Preview and Restore Defaults.
  - UX:
    - Preview while editing.
    - Clear warnings when deleting a view used as default for roles.
    - Import/Export view JSON for portability.

- Migration & defaults:

  - Add migration to create views table and seed common defaults (e.g., "All games", "Unpurchased", "To Fulfill").
  - Migrate any existing hard-coded defaults into seed views.

- Other considerations:

  - Caching: cache view definitions for performance; invalidate on edit.
  - Auditing: track created_by/updated_by and timestamp for administration.
  - Safety: prevent stored settings from enabling unsafe server queries; use parameterized queries or server-side query builders.
  - Internationalization: store view display names and descriptions with i18n support or keys for translation.
  - Tests: include unit/integration tests for API, permissions and frontend application of views.

- Outcome:
  - Centralized, admin-manageable views that persist on backend, enabling consistent layouts/filters across users and devices while still allowing per-user tweaks and favorites.
