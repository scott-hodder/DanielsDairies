# Schools Program - Implementation Notes

## Architecture

The Schools Program is a **fully isolated subsystem** within Daniel's Diaries:

```
Entry Points:
  /schools-login.html  → School selection + auth
  /schools-dashboard.html → Workbook viewer (child or practitioner)

Frontend:
  src/features/schools/
    schoolsLoginPage.js   — Login flow logic
    schoolsDashboard.js   — Workbook loading & display
    schoolsService.js     — Data access layer

Admin:
  src/features/admin/adminSchools.js — Admin tab for managing schools & workbooks

Backend:
  supabase/functions/schools-auth/index.ts — Account creation edge function
  supabase/migrations/20260425000000_schools_program.sql — Schema
```

## Data Model

### `schools`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| name | text (unique) | School display name |
| access_key | text | Shared key for school access |
| is_active | boolean | Whether school is accepting logins |

### `school_users`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| auth_user_id | uuid (FK) | Links to Supabase auth.users |
| school_id | uuid (FK) | Links to schools |
| display_name | text | User's display name |
| role | text | `child` or `practitioner` |
| is_active | boolean | Account active status |

### `school_workbooks`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid (PK) | Auto-generated |
| title | text | Workbook display title |
| audience | text | `child` or `practitioner` |
| html_content | text | Full HTML content |
| is_active | boolean | Only one active per audience |
| created_by | uuid (FK) | Admin who created it |

### `school_audit_log`
Tracks: school access validations, account creation, login events, workbook activations.

## Security Considerations

1. **Row Level Security (RLS)** enforced on all tables:
   - Schools: anyone authenticated can read active schools; admins have full access
   - School users: users can only read their own record; admins have full access
   - Workbooks: school users can only read active workbooks matching their role; admins have full access
   - Audit log: admins can read; authenticated users can insert

2. **Server-side authorization**: The `set_active_workbook` and `validate_school_access` functions are `SECURITY DEFINER` (run as owner), preventing direct table manipulation.

3. **HTML sanitization**: Workbook content is sanitized before rendering (script tags, event handlers, javascript: URIs, iframes/objects/embeds removed). Content is rendered in a sandboxed iframe with `allow-same-origin allow-popups` only.

4. **Account creation**: Uses Supabase admin API via edge function (service role), so users cannot create school accounts without going through the validated flow.

5. **Access key validation**: Done server-side via RPC function with audit logging.

## Admin Workflow

1. **Add a school**: Admin Panel > Schools tab > Schools sub-tab > "+ Add School"
   - Enter school name and access key
   - Share the access key with the school

2. **Upload workbooks**: Admin Panel > Schools tab > Child/Practitioner Workbooks sub-tab
   - Click "+ Add Workbook"
   - Enter title and paste HTML content
   - Click "Set Active" to make it the live workbook for that role

3. **Monitor users**: Admin Panel > Schools tab > Users sub-tab
   - View all registered school program users and their roles

## Login Flow

1. User visits `/schools-login.html`
2. Selects school from dropdown, enters access key
3. If valid: shown login or signup form
4. **Signup**: creates auth user + school_users record via edge function
5. **Login**: validates credentials, checks school_users record exists
6. Redirected to `/schools-dashboard.html`
7. Dashboard loads active workbook for user's role (child or practitioner)

## Deployment

Deploy the edge function:
```bash
supabase functions deploy schools-auth --no-verify-jwt
```

Run the migration:
```bash
supabase db push
```
