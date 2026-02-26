#!/usr/bin/env node
/**
 * Secure admin user creation script.
 * Usage: node server/create-admin.js
 *
 * Environment: DATABASE_URL must be set.
 * The script will prompt for email and password interactively.
 */

const readline = require("readline");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

require("dotenv").config({ path: require("path").resolve(__dirname, ".env") });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : false,
});

function prompt(question, hidden = false) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    if (hidden && process.stdin.isTTY) {
      // Hide password input
      const stdout = process.stdout;
      rl.question(question, (answer) => {
        rl.close();
        stdout.write("\n");
        resolve(answer);
      });
      rl._writeToOutput = function (char) {
        if (char.includes("\n") || char.includes("\r")) {
          rl.output.write(char);
        } else {
          rl.output.write("*");
        }
      };
    } else {
      rl.question(question, (answer) => {
        rl.close();
        resolve(answer);
      });
    }
  });
}

async function main() {
  console.log("═══════════════════════════════════════");
  console.log("  Admin User Creation (Secure)");
  console.log("═══════════════════════════════════════\n");

  const email = await prompt("Admin email: ");
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error("❌ Invalid email address.");
    process.exit(1);
  }

  const password = await prompt("Admin password (min 8 chars): ", true);
  if (!password || password.length < 8) {
    console.error("❌ Password must be at least 8 characters.");
    process.exit(1);
  }

  const confirm = await prompt("Confirm password: ", true);
  if (password !== confirm) {
    console.error("❌ Passwords do not match.");
    process.exit(1);
  }

  const role = await prompt("Role (admin/superadmin) [admin]: ");
  const selectedRole = role === "superadmin" ? "superadmin" : "admin";

  try {
    const hash = await bcrypt.hash(password, 12);

    const result = await pool.query(
      `INSERT INTO public.users (email, password_hash)
       VALUES ($1, $2)
       ON CONFLICT (email) DO NOTHING
       RETURNING id, email`,
      [email, hash]
    );

    if (result.rows.length === 0) {
      console.error("❌ User with this email already exists.");
      process.exit(1);
    }

    const userId = result.rows[0].id;

    await pool.query(
      `INSERT INTO public.user_roles (user_id, role)
       VALUES ($1, $2)
       ON CONFLICT (user_id, role) DO NOTHING`,
      [userId, selectedRole]
    );

    console.log(`\n✅ Admin created successfully!`);
    console.log(`   Email: ${email}`);
    console.log(`   Role:  ${selectedRole}`);
    console.log(`   ID:    ${userId}`);
  } catch (err) {
    console.error("❌ Error:", err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

main();
