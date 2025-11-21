# Database Setup

This directory contains the database configuration for the ServerlessWebTemplate project using Sequelize ORM.

## Structure

- `migrations/` - Database migrations (created by Sequelize CLI)
- `seeders/` - Seed data files (created by Sequelize CLI)
- `schema/` - SQL schema files for reference
- `stored_procedures/` - PostgreSQL stored procedures
- `deploy.sh` - Script to deploy database schema
- `teardown.sh` - Script to teardown database (use with caution)

## Getting Started

### 1. Create your first migration

```bash
npx sequelize-cli migration:generate --name create-users-table
```

This will create a new migration file in the `migrations/` directory.

### 2. Example migration structure

```javascript
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('Users', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('Users');
  }
};
```

### 3. Run migrations

```bash
# Run all pending migrations
npx sequelize-cli db:migrate

# Undo last migration
npx sequelize-cli db:migrate:undo

# Undo all migrations
npx sequelize-cli db:migrate:undo:all
```

### 4. Create seed data

```bash
npx sequelize-cli seed:generate --name demo-users
```

### 5. Run seeders

```bash
# Run all seeders
npx sequelize-cli db:seed:all

# Run specific seeder
npx sequelize-cli db:seed --seed name-of-seed-file.js

# Undo all seeders
npx sequelize-cli db:seed:undo:all
```

## Configuration

Database configuration is managed in `/server/config/database.js` which reads from environment variables.

## Notes

- The Sequelize CLI is already configured via `.sequelizerc` file
- Migrations are the recommended way to manage database schema changes
- Always test migrations in development before applying to production
- Use the `deploy.sh` script for initial database setup if needed