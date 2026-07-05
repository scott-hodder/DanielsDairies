import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  "Access-Control-Allow-Origin": "https://app.danielsdiaries.com.au",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req: Request) => {
  console.log("[schools-auth] Request received:", req.method, req.url);

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("[schools-auth] Action:", body.action, "Role:", body.role);
    const { action, email, password, displayName, schoolId, role } = body;

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    if (action === "signup") {
      return await handleSignup(supabaseAdmin, {
        email,
        password,
        displayName,
        schoolId,
        role,
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[schools-auth] Top-level error:", message, JSON.stringify(err));
    return new Response(
      JSON.stringify({ error: message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function handleSignup(
  supabaseAdmin: ReturnType<typeof createClient>,
  params: {
    email: string;
    password: string;
    displayName: string;
    schoolId: string;
    role: string;
  }
) {
  const { email, password, displayName, schoolId, role } = params;

  // Validate inputs
  if (!email || !password || !displayName || !schoolId || !role) {
    return jsonResponse({ error: "All fields are required" }, 400);
  }

  if (!["child", "practitioner"].includes(role)) {
    return jsonResponse({ error: "Invalid role" }, 400);
  }

  // These accounts access children's data — hold them to a real standard.
  if (password.length < 12) {
    return jsonResponse(
      { error: "Password must be at least 12 characters" },
      400
    );
  }

  // Step 1: Verify school exists and is active
  console.log("[schools-auth] Step 1: Verifying school", schoolId);
  const { data: school, error: schoolError } = await supabaseAdmin
    .from("schools")
    .select("id, name")
    .eq("id", schoolId)
    .eq("is_active", true)
    .single();

  if (schoolError || !school) {
    console.error("[schools-auth] Step 1 FAILED:", schoolError?.message || "school not found");
    return jsonResponse({ error: "School not found or inactive" }, 400);
  }
  console.log("[schools-auth] Step 1 OK: School found:", school.name);

  // Step 2: Create or find auth user
  console.log("[schools-auth] Step 2: Creating auth user for", email);
  let userId: string;
  let isExistingUser = false;

  const { data: authData, error: authError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
        school_program: true,
        school_id: schoolId,
        school_role: role,
      },
    });

  if (authError) {
    console.log("[schools-auth] Step 2: createUser failed:", authError.message);
    if (authError.message?.includes("already been registered") || authError.message?.includes("already exists")) {
      // User already exists — look them up and link to school
      console.log("[schools-auth] Step 2: Looking up existing user by email");
      const { data: listData, error: listError } =
        await supabaseAdmin.auth.admin.listUsers();

      if (listError) throw listError;

      const existingUser = listData.users.find(
        (u: { email?: string }) => u.email?.toLowerCase() === email.toLowerCase()
      );
      if (!existingUser) {
        return jsonResponse({ error: "Could not find existing account. Please try signing in instead." }, 400);
      }

      userId = existingUser.id;
      isExistingUser = true;

      // Update user metadata to include school info
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: {
          ...existingUser.user_metadata,
          school_program: true,
          school_id: schoolId,
          school_role: role,
        },
      });
      console.log("[schools-auth] Step 2 OK: Existing user found:", userId);
    } else {
      throw authError;
    }
  } else {
    userId = authData.user.id;
    console.log("[schools-auth] Step 2 OK: New auth user created:", userId);
  }

  // Step 3: Create school_users record (check for duplicates first)
  console.log("[schools-auth] Step 3: Creating school_users record");
  const { data: existingSchoolUser } = await supabaseAdmin
    .from("school_users")
    .select("id")
    .eq("auth_user_id", userId)
    .eq("school_id", schoolId)
    .maybeSingle();

  if (existingSchoolUser) {
    console.log("[schools-auth] Step 3: school_users record already exists, skipping");
  } else {
    const { error: schoolUserError } = await supabaseAdmin
      .from("school_users")
      .insert({
        auth_user_id: userId,
        school_id: schoolId,
        display_name: displayName,
        role,
      });

    if (schoolUserError) {
      console.error("[schools-auth] Step 3 FAILED:", schoolUserError.message, JSON.stringify(schoolUserError));
      if (!isExistingUser) {
        await supabaseAdmin.auth.admin.deleteUser(userId);
      }
      throw schoolUserError;
    }
  }
  console.log("[schools-auth] Step 3 OK: school_users record created");

  // Step 4: Audit log (non-blocking, don't let it fail the signup)
  console.log("[schools-auth] Step 4: Writing audit log");
  const { error: auditError } = await supabaseAdmin.from("school_audit_log").insert({
    event_type: "school_account_created",
    actor_id: userId,
    school_id: schoolId,
    metadata: { role, display_name: displayName },
  });
  if (auditError) {
    console.error("[schools-auth] Step 4 WARNING: Audit log failed:", auditError.message);
  }

  console.log(
    `[schools-auth] Account created: ${email} as ${role} at ${school.name}`
  );

  return jsonResponse({
    success: true,
    userId,
  });
}

function jsonResponse(data: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}
