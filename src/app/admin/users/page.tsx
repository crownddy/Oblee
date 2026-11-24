import { UserRoleControl } from "@/components/admin/AdminControls";
import { requireAdmin } from "@/lib/auth/session";
import { adminListUsers } from "@/lib/services/admin";
import { initials } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const viewer = await requireAdmin();
  const users = await adminListUsers();

  return (
    <>
      <div className="sec" style={{ marginTop: 16 }}>
        <h3 style={{ fontSize: 16 }}>Users</h3>
        <span className="muted" style={{ fontSize: 12 }}>{users.length}</span>
      </div>

      {users.length === 0 ? (
        <p className="muted">No accounts yet.</p>
      ) : (
        <div className="card" style={{ padding: "4px 14px" }}>
          {users.map((user) => (
            <div className="arow" key={user.id}>
              <span className="av2" style={{ width: 38, height: 38, fontSize: 14, flex: "none" }} aria-hidden="true">
                {initials(user.fullName || user.email)}
              </span>
              <div className="meta">
                <b>
                  {user.fullName || "Oblee member"} {user.id === viewer.id ? <span className="muted">(you)</span> : null}
                </b>
                <small>{user.email}</small>
                <small>
                  <span className="badge">{user.role}</span>{" "}
                  {user.ageVerified ? (
                    <span className="badge ok">Age verified</span>
                  ) : (
                    <span className="badge warn">No date of birth</span>
                  )}
                </small>
              </div>
              <UserRoleControl userId={user.id} role={user.role} isSelf={user.id === viewer.id} />
            </div>
          ))}
        </div>
      )}

      <p className="note">
        Role changes are written through the <code>set_user_role</code> function. It rejects calls from anyone without an
        administrator session, and it rejects changing your own role.
      </p>
    </>
  );
}
