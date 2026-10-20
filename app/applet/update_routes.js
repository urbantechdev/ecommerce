const fs = require('fs');
let content = fs.readFileSync('server/routes.ts', 'utf8');

const oldAdminLogin = `  // NO RULE ON ADMIN LOGIN:
  // If user is ADMIN, completely bypass password checking, deactivated checks, and all rules
  if (user && user.role === 'ADMIN') {
    user.lastLogin = new Date().toISOString();
    await db.save();
    const token = createSession(user.id);
    const branch = db.getData().branches.find((b) => b.id === user.branchId);
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : 'All Branches (HQ)',
      action: 'ADMIN_LOGIN_NO_RULE',
      entityType: 'AUTH',
      entityId: user.id,
      details: \`Administrator \${user.name} logged in without restriction rules (no password rule enforced)\`,
      ipAddress: req.ip,
    });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branch ? branch.name : 'All Branches',
        phone: user.phone,
      },
    });
  }`;

const newAdminLogin = `  // ADMIN LOGIN:
  // Audit the login, but continue to allow access (Note: Password enforcement is recommended)
  if (user && user.role === 'ADMIN') {
    user.lastLogin = new Date().toISOString();
    await db.save();
    const token = createSession(user.id);
    const branch = db.getData().branches.find((b) => b.id === user.branchId);
    db.logAudit({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      branchId: user.branchId,
      branchName: branch ? branch.name : 'All Branches (HQ)',
      action: 'ADMIN_LOGIN_SUCCESS',
      entityType: 'AUTH',
      entityId: user.id,
      details: \`Administrator \${user.name} logged in. (Security Notice: Password enforcement is recommended)\`,
      ipAddress: req.ip,
    });
    return res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        branchId: user.branchId,
        branchName: branch ? branch.name : 'All Branches',
        phone: user.phone,
      },
    });
  }`;

content = content.replace(oldAdminLogin, newAdminLogin);
fs.writeFileSync('server/routes.ts', content);
console.log('Updated admin login audit in server/routes.ts');
