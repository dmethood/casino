#!/usr/bin/env tsx

import { PrismaClient } from '@prisma/client';
import { hashPassword } from '@/lib/auth';
import { logger } from '@/lib/logger';

const prisma = new PrismaClient();

interface AdminData {
  email: string;
  name: string;
  password: string;
  role: 'ADMIN' | 'EDITOR' | 'USER';
}

function parseArgs(): AdminData {
  const args = process.argv.slice(2);
  const adminData: Partial<AdminData> = {};

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith('--email=')) {
      adminData.email = arg.substring(8);
    } else if (arg.startsWith('--name=')) {
      adminData.name = arg.substring(7);
    } else if (arg.startsWith('--password=')) {
      adminData.password = arg.substring(11);
    } else if (arg.startsWith('--role=')) {
      const role = arg.substring(7);
      if (['ADMIN', 'EDITOR', 'USER'].includes(role)) {
        adminData.role = role as 'ADMIN' | 'EDITOR' | 'USER';
      } else {
        console.error('Invalid role. Must be ADMIN, EDITOR, or USER');
        process.exit(1);
      }
    }
  }

  // Validate required fields
  if (!adminData.email) {
    console.error('Email is required. Use --email=user@example.com');
    process.exit(1);
  }

  if (!adminData.name) {
    console.error('Name is required. Use --name="John Doe"');
    process.exit(1);
  }

  if (!adminData.password) {
    console.error('Password is required. Use --password="SecurePassword123!"');
    process.exit(1);
  }

  // Set default role
  if (!adminData.role) {
    adminData.role = 'ADMIN';
  }

  return adminData as AdminData;
}

function validatePassword(password: string): boolean {
  // Password must be at least 8 characters long
  if (password.length < 8) {
    console.error('Password must be at least 8 characters long');
    return false;
  }

  // Password must contain at least one uppercase letter
  if (!/[A-Z]/.test(password)) {
    console.error('Password must contain at least one uppercase letter');
    return false;
  }

  // Password must contain at least one lowercase letter
  if (!/[a-z]/.test(password)) {
    console.error('Password must contain at least one lowercase letter');
    return false;
  }

  // Password must contain at least one number
  if (!/[0-9]/.test(password)) {
    console.error('Password must contain at least one number');
    return false;
  }

  // Password must contain at least one special character
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    console.error('Password must contain at least one special character');
    return false;
  }

  return true;
}

function validateEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    console.error('Invalid email format');
    return false;
  }
  return true;
}

async function createAdminUser(data: AdminData) {
  try {
    // Validate inputs
    if (!validateEmail(data.email)) {
      process.exit(1);
    }

    if (!validatePassword(data.password)) {
      process.exit(1);
    }

    console.log('Creating admin user...');
    console.log(`Email: ${data.email}`);
    console.log(`Name: ${data.name}`);
    console.log(`Role: ${data.role}`);

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email.toLowerCase() },
    });

    if (existingUser) {
      console.log('User already exists. Updating...');
      
      // Hash the password
      const hashedPassword = await hashPassword(data.password);

      // Update the existing user
      const updatedUser = await prisma.user.update({
        where: { email: data.email.toLowerCase() },
        data: {
          firstName: data.name.split(' ')[0] || data.name,
          lastName: data.name.split(' ').slice(1).join(' ') || 'Admin',
          hashedPassword: hashedPassword,
          passwordSalt: 'salt',
          role: data.role,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          registeredAt: true,
          updatedAt: true,
        },
      });

      console.log('✅ User updated successfully!');
      console.log(JSON.stringify(updatedUser, null, 2));
    } else {
      // Hash the password
      const hashedPassword = await hashPassword(data.password);

      // Create the new user
      const newUser = await prisma.user.create({
        data: {
          email: data.email.toLowerCase(),
          firstName: data.name.split(' ')[0] || data.name,
          lastName: data.name.split(' ').slice(1).join(' ') || 'Admin',
          hashedPassword: hashedPassword,
          passwordSalt: 'salt', // Basic salt for development
          role: data.role,
          emailVerified: true,
        },
        select: {
          id: true,
          email: true,
          firstName: true,
          lastName: true,
          role: true,
          registeredAt: true,
        },
      });

      console.log('✅ Admin user created successfully!');
      console.log(JSON.stringify(newUser, null, 2));
    }

    logger.info('Admin user created/updated via CLI', {
      email: data.email,
      name: data.name,
      role: data.role,
    });

  } catch (error) {
    console.error('❌ Failed to create admin user:', error);
    logger.error('Failed to create admin user via CLI', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

function showUsage() {
  console.log(`
Usage: pnpm create-admin --email=<email> --name=<name> --password=<password> [--role=<role>]

Arguments:
  --email=<email>       Email address for the admin user (required)
  --name=<name>         Full name of the admin user (required)
  --password=<password> Password for the admin user (required)
  --role=<role>         Role: ADMIN, EDITOR, or USER (default: ADMIN)

Password Requirements:
  - At least 8 characters long
  - At least one uppercase letter
  - At least one lowercase letter
  - At least one number
  - At least one special character

Examples:
  pnpm create-admin --email=admin@example.com --name="Admin User" --password="SecurePass123!"
  pnpm create-admin --email=editor@example.com --name="Editor User" --password="EditorPass456!" --role=EDITOR
  
Note: If a user with the same email already exists, their information will be updated.
`);
}

async function main() {
  console.log('🚀 Business CMS - Admin User Creator\n');

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    showUsage();
    process.exit(0);
  }

  if (process.argv.length < 4) {
    console.error('❌ Missing required arguments\n');
    showUsage();
    process.exit(1);
  }

  try {
    const adminData = parseArgs();
    await createAdminUser(adminData);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

// Run the script
main().catch((error) => {
  console.error('❌ Unexpected error:', error);
  process.exit(1);
});
