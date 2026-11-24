import { REQUIRED_ENV_VARS } from "@/lib/supabase/config";

export function ConfigNotice({
  title = "Connect Supabase to go live",
  intro = "Oblee is running in preview mode with sample events. Browse everything, but signing in, saving and publishing need a Supabase project.",
  compact = false,
}: {
  title?: string;
  intro?: string;
  compact?: boolean;
}) {
  return (
    <div className="notice">
      <b>{title}</b>
      <p>{intro}</p>
      {compact ? null : (
        <>
          <p style={{ marginTop: 8 }}>Add these environment variables (locally in .env.local, on Vercel in Project Settings → Environment Variables):</p>
          <ul>
            {REQUIRED_ENV_VARS.map((item) => (
              <li key={item.name}>
                <code>{item.name}</code>
                <br />
                <span className="muted">{item.description}</span>
              </li>
            ))}
          </ul>
          <p style={{ marginTop: 8 }}>
            Then run the migrations in <code>supabase/migrations</code> against the project.
          </p>
        </>
      )}
    </div>
  );
}
